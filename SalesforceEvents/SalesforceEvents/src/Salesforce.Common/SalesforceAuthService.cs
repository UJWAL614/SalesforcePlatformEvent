using System.Net.Http.Headers;
using System.Text.Json;

namespace Salesforce.Common;

public sealed record SalesforceToken(string AccessToken, string InstanceUrl, string OrgId);

/// <summary>
/// OAuth 2.0 Client Credentials flow (server-to-server, no user login).
/// A fresh token is requested every time a subscriber session (re)starts,
/// so expired tokens are handled automatically.
/// </summary>
public sealed class SalesforceAuthService
{
    private static readonly HttpClient Http = new();
    private readonly SalesforceSettings _settings;

    public SalesforceAuthService(SalesforceSettings settings) => _settings = settings;

    public async Task<SalesforceToken> GetTokenAsync(CancellationToken ct)
    {
        _settings.Validate();

        using var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = _settings.ClientId,
            ["client_secret"] = _settings.ClientSecret
        });

        var url = _settings.MyDomainUrl.TrimEnd('/') + "/services/oauth2/token";
        using var response = await Http.PostAsync(url, body, ct);
        var json = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(
                $"Salesforce token request failed ({(int)response.StatusCode}): {json}");

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var accessToken = root.GetProperty("access_token").GetString()!;
        var instanceUrl = root.GetProperty("instance_url").GetString()!;

        // The "id" URL looks like https://login.salesforce.com/id/<OrgId>/<UserId>
        string? orgId = null;
        if (root.TryGetProperty("id", out var idEl) && idEl.GetString() is { } idUrl)
        {
            var parts = idUrl.TrimEnd('/').Split('/');
            if (parts.Length >= 2) orgId = parts[^2];
        }

        // Fallback: ask the userinfo endpoint.
        orgId ??= await GetOrgIdFromUserInfoAsync(instanceUrl, accessToken, ct);

        return new SalesforceToken(accessToken, instanceUrl, orgId);
    }

    private static async Task<string> GetOrgIdFromUserInfoAsync(
        string instanceUrl, string accessToken, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(
            HttpMethod.Get, instanceUrl.TrimEnd('/') + "/services/oauth2/userinfo");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var resp = await Http.SendAsync(req, ct);
        var json = await resp.Content.ReadAsStringAsync(ct);
        resp.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("organization_id").GetString()!;
    }
}
