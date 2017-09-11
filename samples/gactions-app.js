const env = require('node-env-file');
env(__dirname + '/.env');

const AbbottFramework = require('../').AbbottFramework;
const IntentFlowHandler = require('../').IntentFlowHandler;

var abbottConfig = {
  botName: 'abbott-gactions-sample',
  botFirendlyName: 'Abbott Actions on Google Sample',
  port: process.env.PORT || 3000,
  platforms: {
    gactions: {
      projectId: '[ACTIONS_GOOGLE_PROJECT_ID]'
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