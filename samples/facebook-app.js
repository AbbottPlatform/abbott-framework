const env = require('node-env-file');
env(__dirname + '/.env');

const AbbottFramework = require('../').AbbottFramework;
const IntentFlowHandler = require('../').IntentFlowHandler;

var abbottConfig = {
  botName: 'abbott-facebook-sample',
  botFirendlyName: 'Abbott Facebook Sample',
  port: process.env.PORT || 3000,
  platforms: {
    facebook: {
      access_token: '[YOUR_FACEBOOK_ACCESS_TOKEN]',
      verify_token: '[YOUR_FACEBOOK_VERIFY_TOKEN]', 
      app_secret: '[YOUR_FACEBOOK_APP_SECRET]',
      validate_requests: true, // Refuse any requests that don't come from FB on your receive webhook
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

console.log('Abbott Framework Inititlized!');