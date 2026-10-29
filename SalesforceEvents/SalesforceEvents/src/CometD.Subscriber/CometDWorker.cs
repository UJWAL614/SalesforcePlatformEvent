using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Salesforce.Common;

namespace CometD.Subscriber;

/// <summary>
/// Subscribes to a platform event through the Streaming API (CometD / Bayeux, JSON).
/// </summary>
public sealed class CometDWorker : BackgroundService
{
    private readonly ILogger<CometDWorker> _logger;
    private readonly SalesforceSettings _settings;
    private readonly SalesforceAuthService _auth;
    private readonly ReplayStore _replayStore = new("cometd-replay.txt");

    public CometDWorker(
        ILogger<CometDWorker> logger,
        SalesforceSettings settings,
        SalesforceAuthService auth)
    {
        _logger = logger;
        _settings = settings;
        _auth = auth;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Outer loop: any failure (token expiry, dropped session, network error)
        // ends the session; we wait and start a brand-new one with a fresh token.
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "CometD session ended. Reconnecting in 5 seconds...");
                try { await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken); }
                catch (OperationCanceledException) { break; }
            }
        }
    }

    private async Task RunSessionAsync(CancellationToken ct)
    {
        var token = await _auth.GetTokenAsync(ct);
        var channel = _settings.Channel;
        var endpoint = $"cometd/{_settings.ApiVersion}";

        // Salesforce holds each /meta/connect request open for up to ~110 s,
        // so the HttpClient timeout MUST be longer than the default 100 s.
        using var http = new HttpClient
        {
            BaseAddress = new Uri(token.InstanceUrl.TrimEnd('/') + "/"),
            Timeout = TimeSpan.FromMinutes(3)
        };
        http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token.AccessToken);

        // 1. Handshake (ext.replay = true enables replay support)
        var handshake = await SendAsync(http, endpoint, new
        {
            channel = "/meta/handshake",
            version = "1.0",
            minimumVersion = "1.0",
            supportedConnectionTypes = new[] { "long-polling" },
            ext = new { replay = true }
        }, ct);

        var hs = handshake.RootElement[0];
        if (!hs.GetProperty("successful").GetBoolean())
            throw new InvalidOperationException("Handshake failed: " + hs.GetRawText());

        var clientId = hs.GetProperty("clientId").GetString()!;
        _logger.LogInformation("Handshake OK. clientId={ClientId}", clientId);

        // 2. Subscribe. Replay id: -1 = only new events, -2 = all retained events (72 h),
        //    or a stored id = everything AFTER that id.
        long replayId = long.TryParse(_replayStore.Load(), out var saved) ? saved : -1;

        var sub = await SendAsync(http, endpoint, new
        {
            channel = "/meta/subscribe",
            clientId,
            subscription = channel,
            ext = new { replay = new Dictionary<string, long> { [channel] = replayId } }
        }, ct);

        var subResult = sub.RootElement[0];
        if (!subResult.GetProperty("successful").GetBoolean())
            throw new InvalidOperationException("Subscribe failed: " + subResult.GetRawText());

        _logger.LogInformation("Subscribed to {Channel} (replayId={ReplayId})", channel, replayId);

        // 3. Long-poll loop
        while (!ct.IsCancellationRequested)
        {
            using var response = await SendAsync(http, endpoint, new
            {
                channel = "/meta/connect",
                clientId,
                connectionType = "long-polling"
            }, ct);

            foreach (var message in response.RootElement.EnumerateArray())
            {
                if (!message.TryGetProperty("channel", out var chEl)) continue;
                var ch = chEl.GetString();

                if (ch == "/meta/connect")
                {
                    if (!message.GetProperty("successful").GetBoolean())
                        throw new InvalidOperationException(
                            "Connect failed (session/token invalid): " + message.GetRawText());
                    continue;
                }

                if (ch != channel) continue;

                var data = message.GetProperty("data");
                var payload = data.GetProperty("payload");
                var eventReplayId = data.GetProperty("event").GetProperty("replayId").GetInt64();

                _logger.LogInformation("Event received. replayId={ReplayId}", eventReplayId);

                // ---- YOUR BUSINESS LOGIC GOES HERE ----
                foreach (var prop in payload.EnumerateObject())
                    _logger.LogInformation("  {Field} = {Value}", prop.Name, prop.Value);

                // Save only after the event has been processed successfully.
                _replayStore.Save(eventReplayId.ToString());
            }
        }
    }

    private static async Task<JsonDocument> SendAsync(
        HttpClient http, string endpoint, object message, CancellationToken ct)
    {
        using var response = await http.PostAsJsonAsync(endpoint, new[] { message }, ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        response.EnsureSuccessStatusCode();
        return JsonDocument.Parse(json);
    }
}
