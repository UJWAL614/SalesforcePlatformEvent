using Avro;
using Avro.Generic;
using Avro.IO;
using Eventbus.V1;                 // generated from Protos/pubsub_api.proto
using Google.Protobuf;
using Grpc.Core;
using Grpc.Net.Client;
using Salesforce.Common;

namespace PubSub.Subscriber;

/// <summary>
/// Subscribes to a platform event through the Pub/Sub API (gRPC + Avro).
/// </summary>
public sealed class PubSubWorker : BackgroundService
{
    private const string PubSubEndpoint = "https://api.pubsub.salesforce.com:7443";
    private const int BatchSize = 10;

    private readonly ILogger<PubSubWorker> _logger;
    private readonly SalesforceSettings _settings;
    private readonly SalesforceAuthService _auth;
    private readonly ReplayStore _replayStore = new("pubsub-replay.txt");
    private readonly Dictionary<string, Schema> _schemaCache = new();

    public PubSubWorker(
        ILogger<PubSubWorker> logger,
        SalesforceSettings settings,
        SalesforceAuthService auth)
    {
        _logger = logger;
        _settings = settings;
        _auth = auth;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunSessionAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (RpcException ex) when (ex.StatusCode == StatusCode.Cancelled
                                          && stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Pub/Sub session ended. Reconnecting in 5 seconds...");
                try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                catch (OperationCanceledException) { break; }
            }
        }
    }

    private async Task RunSessionAsync(CancellationToken ct)
    {
        var token = await _auth.GetTokenAsync(ct);

        using var channel = GrpcChannel.ForAddress(PubSubEndpoint);
        var client = new PubSub.PubSubClient(channel);

        // Auth metadata required on EVERY call (Subscribe, GetSchema, GetTopic...).
        var headers = new Metadata
        {
            { "accesstoken", token.AccessToken },
            { "instanceurl", token.InstanceUrl },
            { "tenantid", token.OrgId }
        };

        // First request: topic + replay position + how many events we can take.
        var firstRequest = new FetchRequest
        {
            TopicName = _settings.Channel,
            NumRequested = BatchSize
        };

        var savedReplay = _replayStore.Load();
        if (savedReplay is not null)
        {
            firstRequest.ReplayPreset = ReplayPreset.Custom;
            firstRequest.ReplayId = ByteString.FromBase64(savedReplay);
            _logger.LogInformation("Resuming after stored replay id.");
        }
        else
        {
            firstRequest.ReplayPreset = ReplayPreset.Latest;   // only new events
            _logger.LogInformation("No stored replay id. Starting from the latest event.");
        }

        using var call = client.Subscribe(headers, cancellationToken: ct);
        await call.RequestStream.WriteAsync(firstRequest, ct);

        _logger.LogInformation("Subscribed to {Topic}", _settings.Channel);

        await foreach (var response in call.ResponseStream.ReadAllAsync(ct))
        {
            // Keep-alive messages arrive with zero events; nothing to do for those.
            foreach (var consumerEvent in response.Events)
            {
                var producerEvent = consumerEvent.Event;
                var schema = await GetSchemaAsync(client, headers, producerEvent.SchemaId, ct);
                var record = Decode(schema, producerEvent.Payload.ToByteArray());

                _logger.LogInformation("Event {EventId} (schema {SchemaId})",
                    producerEvent.Id, producerEvent.SchemaId);

                // ---- YOUR BUSINESS LOGIC GOES HERE ----
                foreach (var field in ((RecordSchema)schema).Fields)
                {
                    record.TryGetValue(field.Name, out var value);
                    _logger.LogInformation("  {Field} = {Value}", field.Name, value ?? "(null)");
                }

                // Save only after the event has been processed successfully.
                _replayStore.Save(Convert.ToBase64String(consumerEvent.ReplayId.ToByteArray()));
            }

            // Flow control: ask for more only after we consumed a batch.
            if (response.Events.Count > 0)
            {
                await call.RequestStream.WriteAsync(
                    new FetchRequest { NumRequested = BatchSize }, ct);
            }
        }
    }

    private async Task<Schema> GetSchemaAsync(
        PubSub.PubSubClient client, Metadata headers, string schemaId, CancellationToken ct)
    {
        if (_schemaCache.TryGetValue(schemaId, out var cached)) return cached;

        var info = await client.GetSchemaAsync(
            new SchemaRequest { SchemaId = schemaId }, headers, cancellationToken: ct);

        var schema = Schema.Parse(info.SchemaJson);
        _schemaCache[schemaId] = schema;
        return schema;
    }

    private static GenericRecord Decode(Schema schema, byte[] payload)
    {
        var reader = new GenericReader<GenericRecord>(schema, schema);
        using var stream = new MemoryStream(payload);
        return reader.Read(null!, new BinaryDecoder(stream));
    }
}
