using System.Net.Http.Headers;
using System.Text.Json;

namespace SalesforcePubSubSubscriber;

public sealed class SalesforceSettings
{
    public string MyDomainUrl { get; set; } = "";
    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";
    public string EventName { get; set; } = "";
    public string Topic => $"/event/{EventName}";
}

public sealed record SalesforceToken(string AccessToken, string InstanceUrl, string OrgId);

public sealed class SalesforceAuth
{
    private static readonly HttpClient Http = new();
    private readonly SalesforceSettings _s;

    public SalesforceAuth(SalesforceSettings settings) => _s = settings;

    public async Task<SalesforceToken> GetTokenAsync(CancellationToken ct)
    {
        var missing = new List<string>();
if (string.IsNullOrWhiteSpace(_s.MyDomainUrl)) missing.Add("MyDomainUrl");
if (string.IsNullOrWhiteSpace(_s.ClientId)) missing.Add("ClientId");
if (string.IsNullOrWhiteSpace(_s.ClientSecret)) missing.Add("ClientSecret");
if (string.IsNullOrWhiteSpace(_s.EventName)) missing.Add("EventName");
            if (missing.Count > 0)
            {
                throw new InvalidOperationException(
                    $"Set the following required properties: {string.Join(", ", missing)}.");
            }

        using var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = _s.ClientId,
            ["client_secret"] = _s.ClientSecret
        });

        using var resp = await Http.PostAsync(
            _s.MyDomainUrl.TrimEnd('/') + "/services/oauth2/token", body, ct);
        var json = await resp.Content.ReadAsStringAsync(ct);

        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException(
                $"Token request failed ({(int)resp.StatusCode}): {json}");

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var accessToken = root.GetProperty("access_token").GetString()!;
        var instanceUrl = root.GetProperty("instance_url").GetString()!;

        string? orgId = null;
        if (root.TryGetProperty("id", out var idEl) && idEl.GetString() is { } idUrl)
        {
            var parts = idUrl.TrimEnd('/').Split('/');
            if (parts.Length >= 2) orgId = parts[^2];
        }

        if (orgId is null)
        {
            using var req = new HttpRequestMessage(
                HttpMethod.Get, instanceUrl.TrimEnd('/') + "/services/oauth2/userinfo");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            using var r = await Http.SendAsync(req, ct);
            r.EnsureSuccessStatusCode();
            using var info = JsonDocument.Parse(await r.Content.ReadAsStringAsync(ct));
            orgId = info.RootElement.GetProperty("organization_id").GetString()!;
        }

        return new SalesforceToken(accessToken, instanceUrl, orgId);
    }
}