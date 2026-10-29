# Salesforce Platform Event Subscribers (.NET)

Two independent Worker Services that subscribe to the SAME platform event:

| Project | Protocol | Payload | Use it for |
|---|---|---|---|
| `src/CometD.Subscriber` | Streaming API (CometD / Bayeux, HTTP long-polling) | JSON | Learning, quick tests |
| `src/PubSub.Subscriber` | Pub/Sub API (gRPC) | Avro (decoded with schema) | New / production integrations |

`src/Salesforce.Common` holds shared code: settings, OAuth token service, replay-id store.

## Step 1 - Salesforce: create the OAuth app (once)
1. Setup > App Manager > New External Client App (or New Connected App).
2. Enable OAuth. Callback URL: `https://localhost` (not used, but required).
3. Scopes: "Manage user data via APIs (api)".
4. Enable the **Client Credentials Flow** and choose a **Run As** user.
5. Run-As user needs **Read** permission on your platform event object
   (Permission Set > Object Settings > your event) and API Enabled.
6. Copy Consumer Key (ClientId) and Consumer Secret (ClientSecret).
7. Use your **My Domain** URL as `MyDomainUrl`. Menu names differ slightly between releases.

## Step 2 - Prerequisites
    dotnet --version        # .NET 8 SDK or later
(If you use a newer SDK only, change `net8.0` to your version in the 3 .csproj files.)

## Step 3 - Configure secrets (never commit these)
From the repo root:

    cd src/CometD.Subscriber
    dotnet user-secrets set "Salesforce:ClientId" "<consumer key>"
    dotnet user-secrets set "Salesforce:ClientSecret" "<consumer secret>"
    cd ../PubSub.Subscriber
    dotnet user-secrets set "Salesforce:ClientId" "<consumer key>"
    dotnet user-secrets set "Salesforce:ClientSecret" "<consumer secret>"

Edit `appsettings.json` in BOTH projects: `MyDomainUrl` and `EventName` (e.g. `Order_Notification__e`).

## Step 4 - Part A: run CometD
    cd src/CometD.Subscriber
    dotnet run

## Step 5 - Part B: run gRPC
    # from repo root
    ./download-proto.ps1
    cd src/PubSub.Subscriber
    dotnet build
    dotnet run

## Step 6 - Test
Publish an event from Salesforce (Developer Console > Execute Anonymous):

    Order_Notification__e e = new Order_Notification__e(/* your fields */);
    Database.SaveResult r = EventBus.publish(e);
    System.debug(r.isSuccess());

Both consoles should print the event fields.

## Replay
Each subscriber stores the last processed replay id (`cometd-replay.txt` / `pubsub-replay.txt`
next to the .exe). On restart it resumes after that event. Events are kept 72 hours; if you get a
replay-id-invalid error, delete the file.
Do not run both subscribers against the same replay files expecting a shared position - they are independent.

## Where to put your logic
Look for `YOUR BUSINESS LOGIC GOES HERE` in `CometDWorker.cs` and `PubSubWorker.cs`.
