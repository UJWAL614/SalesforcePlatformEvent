# Run from the SalesforceEvents root folder.
Invoke-WebRequest `
  -Uri "https://raw.githubusercontent.com/forcedotcom/pub-sub-api/main/pubsub_api.proto" `
  -OutFile "src/PubSub.Subscriber/Protos/pubsub_api.proto"
Write-Host "Downloaded pubsub_api.proto"
