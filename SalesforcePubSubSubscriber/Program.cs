using SalesforcePubSubSubscriber;

var builder = Host.CreateApplicationBuilder(args);
var settings = builder.Configuration.GetSection("Salesforce").Get<SalesforceSettings>()
               ?? new SalesforceSettings();

builder.Services.AddSingleton(settings);
builder.Services.AddSingleton<SalesforceAuth>();
builder.Services.AddHostedService<PubSubWorker>();

await builder.Build().RunAsync();