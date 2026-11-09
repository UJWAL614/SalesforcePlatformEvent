using Avro;
using Avro.Generic;
using Avro.IO;
using Eventbus.V1;
using Google.Protobuf;
using Grpc.Core;
using Grpc.Net.Client;

namespace SalesforcePubSubSubscriber;

public sealed class PubSubWorker : BackgroundService
{
    private const string Endpoint = "https://api.pubsub.salesforce.com:7443";
    private const int BatchSize = 10;

    private readonly ILogger<PubSubWorker> _logger;
    private readonly SalesforceSettings _settings;
    private readonly SalesforceAuth _auth;
    private readonly Dictionary<string, Schema> _schemas = new();
    private readonly string _replayFile =
        Path.Combine(AppContext.BaseDirectory, "replay.txt");

    public PubSubWorker(ILogger<PubSubWorker> logger,
        SalesforceSettings settings, SalesforceAuth auth)
    {
        _logger = logger;
        _settings = settings;
        _auth = auth;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Any failure (expired token, dropped stream, network) -> new session.
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
            catch (RpcException ex) when (stoppingToken.IsCancellationRequested
                                          && ex.StatusCode == StatusCode.Cancelled)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Session ended. Reconnecting in 5 seconds...");
                try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                catch (OperationCanceledException) { break; }
            }
        }
    }

    private async Task RunSessionAsync(CancellationToken ct)
    {
        var token = await _auth.GetTokenAsync(ct);

        using var channel = GrpcChannel.ForAddress(Endpoint);
        var client = new PubSub.PubSubClient(channel);

        var headers = new Metadata
        {
            { "accesstoken", token.AccessToken },
            { "instanceurl", token.InstanceUrl },
            { "tenantid", token.OrgId }
        };

        var first = new FetchRequest
        {
            TopicName = _settings.Topic,
            NumRequested = BatchSize
        };

        if (File.Exists(_replayFile) &&
            File.ReadAllText(_replayFile).Trim() is { Length: > 0 } saved)
        {
            first.ReplayPreset = ReplayPreset.Custom;
            first.ReplayId = ByteString.FromBase64(saved);
            _logger.LogInformation("Resuming after the stored replay id.");
        }
        else
        {
            first.ReplayPreset = ReplayPreset.Latest;
            _logger.LogInformation("Starting from the latest event.");
        }

        using var call = client.Subscribe(headers, cancellationToken: ct);
        await call.RequestStream.WriteAsync(first, ct);
        _logger.LogInformation("Subscribed to {Topic}", _settings.Topic);

        await foreach (var response in call.ResponseStream.ReadAllAsync(ct))
        {
            foreach (var item in response.Events)
            {
                var ev = item.Event;
                var schema = await GetSchemaAsync(client, headers, ev.SchemaId, ct);
                var record = Decode(schema, ev.Payload.ToByteArray());

                _logger.LogInformation("Event {Id}", ev.Id);

                // ---- YOUR BUSINESS LOGIC HERE ----
                foreach (var field in ((RecordSchema)schema).Fields)
                {
                    record.TryGetValue(field.Name, out var value);
                    _logger.LogInformation("  {Field} = {Value}", field.Name, value ?? "(null)");
                }

                File.WriteAllText(_replayFile,
                    Convert.ToBase64String(item.ReplayId.ToByteArray()));
            }

            // Keep-alives carry no events, so only ask for more after a real batch.
            if (response.Events.Count > 0)
                await call.RequestStream.WriteAsync(
                    new FetchRequest { NumRequested = BatchSize }, ct);
        }
    }

    private async Task<Schema> GetSchemaAsync(
        PubSub.PubSubClient client, Metadata headers, string schemaId, CancellationToken ct)
    {
        if (_schemas.TryGetValue(schemaId, out var cached)) return cached;

        var info = await client.GetSchemaAsync(
            new SchemaRequest { SchemaId = schemaId }, headers, cancellationToken: ct);

        var schema = Schema.Parse(info.SchemaJson);
        _schemas[schemaId] = schema;
        return schema;
    }

    private static GenericRecord Decode(Schema schema, byte[] payload)
    {
        var reader = new GenericReader<GenericRecord>(schema, schema);
        using var stream = new MemoryStream(payload);
        return reader.Read(null!, new BinaryDecoder(stream));
    }
}