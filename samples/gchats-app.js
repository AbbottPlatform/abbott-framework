const env = require('node-env-file');
env(__dirname + '/.env');

const AbbottFramework = require('../').AbbottFramework;
const IntentFlowHandler = require('../').IntentFlowHandler;

var abbottConfig = {
  botName: 'abbott-gchats-sample',
  botFirendlyName: 'Abbott Google Chats Sample',
  port: process.env.PORT || 3000,
  platforms: {
    gchats: {
      verify_token: '[YOUR_ABBOTT_VERIFY_TOKEN]',
      chats_regex: '[GOOGLE_CHATS_REGEX]'
    }
  },
  nlp: {
    apiai: {
      token: '[YOUR_API.AI_DEVELOPER_TOKEN]'
    }
  }
};

const abbottFramework = new AbbottFramework(abbottConfig);

abbottFramework.start();

console.log('Abbott Framework Initialized!');