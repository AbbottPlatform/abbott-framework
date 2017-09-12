# Abbott Framework Samples

## Pre-requisites

### Use a tunnel service to test your bot locally

Strongly recommended to use ngrok, you can check on this link bellow how use ngrok:

https://www.chatbot-academy.com/ngrok-chatbot-development/

## Slack Sample

1. Create an slack app to connect with your BOT

2. Get your slack app Client ID and Client Secret and set into [slack-app.js](slack-app.js)

3. Run your node bot instance

```
npm run sample-slack
```

4. Be sure that your slack app webhooks is configured properly on you [Slack App Portal](https://api.slack.com/apps/[YOUR_APP_ID]/general)

5. Connect your bot with a slack team

- Access the [Slack team login page](https://[YOUR_TUNNEL_DNS_ADDRESS]/slack/login)

## Facebook Sample

1. Create an facebook messager app to connect with your BOT

2. Get your facebook app Access Token and App Secret and set into [facebook-app.js](facebook-app.js)

3. Run your node bot instance

```
npm run sample-facebook
```

4. Be sure that your facebook app webhooks is configured properly on you [Facebook Messenger App Portal](https://developers.facebook.com/apps/[YOUR_APP_ID]/messenger/)

## Actions on Google Sample

1. Create an Actions on Google project to connect with your BOT
- [Actions on Google Console](https://console.actions.google.com)

2. Get your Actions on Google Project Id and set into the files bellow:
- [gactions-app.js](gactions-app.js)
- [actons-on-google/updateActionsGoogle.sh](actons-on-google/updateActionsGoogle.sh)

3. Run your node bot instance

```
npm run sample-gactions
```

4. Be sure that your Actions on Google app webhooks is configured properly on your [actions.json file](actons-on-google/action.json)

5. Download / Install the [GActions CLI](https://developers.google.com/actions/tools/gactions-cli)

6. Deploy yor action package

```bash
$ ./samples/actions-on-google/updateActionsGoogle.sh
```
