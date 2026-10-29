namespace Salesforce.Common;

public sealed class SalesforceSettings
{
    /// <summary>Your My Domain URL, e.g. https://yourcompany.my.salesforce.com
    /// (sandbox: https://yourcompany--sandboxname.sandbox.my.salesforce.com)</summary>
    public string MyDomainUrl { get; set; } = "";

    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";

    /// <summary>Platform event API name, e.g. Order_Notification__e</summary>
    public string EventName { get; set; } = "";

    /// <summary>Used by the CometD (Streaming API) subscriber only.</summary>
    public string ApiVersion { get; set; } = "61.0";

    public string Channel => $"/event/{EventName}";

    public void Validate()
    {
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(MyDomainUrl)) missing.Add(nameof(MyDomainUrl));
        if (string.IsNullOrWhiteSpace(ClientId)) missing.Add(nameof(ClientId));
        if (string.IsNullOrWhiteSpace(ClientSecret)) missing.Add(nameof(ClientSecret));
        if (string.IsNullOrWhiteSpace(EventName)) missing.Add(nameof(EventName));
        if (missing.Count > 0)
            throw new InvalidOperationException(
                "Missing Salesforce settings: " + string.Join(", ", missing));
    }
}
