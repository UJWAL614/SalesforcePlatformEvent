using CometD.Subscriber;
using Salesforce.Common;

var builder = Host.CreateApplicationBuilder(args);

var settings = builder.Configuration.GetSection("Salesforce").Get<SalesforceSettings>()
               ?? new SalesforceSettings();

builder.Services.AddSingleton(settings);
builder.Services.AddSingleton<SalesforceAuthService>();
builder.Services.AddHostedService<CometDWorker>();

await builder.Build().RunAsync();
