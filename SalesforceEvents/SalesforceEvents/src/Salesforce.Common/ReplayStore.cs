namespace Salesforce.Common;

/// <summary>
/// Persists the last processed replay position in a small text file so that the
/// subscriber can resume after a restart without losing events (Salesforce keeps
/// platform events for 72 hours). Replace with a database table in production.
/// </summary>
public sealed class ReplayStore
{
    private readonly string _path;

    public ReplayStore(string fileName)
        => _path = Path.Combine(AppContext.BaseDirectory, fileName);

    public string? Load()
        => File.Exists(_path) ? File.ReadAllText(_path).Trim() switch
        {
            "" => null,
            var v => v
        } : null;

    public void Save(string value) => File.WriteAllText(_path, value);

    public void Clear()
    {
        if (File.Exists(_path)) File.Delete(_path);
    }
}
