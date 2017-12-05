const env = require('node-env-file');
env(__dirname + '/.env');

const AbbottFramework = require('../').AbbottFramework;
const IntentFlowHandler = require('../').IntentFlowHandler;
const logger = require('../').logging();

var abbottConfig = {
  botName: 'abbott-facebook-sample',
  botFirendlyName: 'Abbott Facebook Sample',
  port: process.env.PORT || 3000,
  platforms: {
    facebook: {
      access_token: process.env.FACEBOOK_ACCESS_TOKEN || '[YOUR_FACEBOOK_ACCESS_TOKEN]',
      verify_token: process.env.FACEBOOK_VERIFY_TOKEN || '[YOUR_FACEBOOK_VERIFY_TOKEN]', 
      app_secret: process.env.FACEBOOK_APP_SECRET || '[YOUR_FACEBOOK_APP_SECRET]',
      validate_requests: true, // Refuse any requests that don't come from FB on your receive webhook
    }
  },
  nlp: {
    apiai: {
      token: process.env.NLP_DIALOGFLOW_TOKEN || '[YOUR_API.AI_DEVELOPER_TOKEN]'
    }
  }
};

try {
  const abbottFramework = new AbbottFramework(abbottConfig);

  abbottFramework.start()
    .then(() => {
      logger.info('BOT Initialized!');
    })
    .catch((err) => logger.error(err));
}
catch (err) {
  logger.error(err);
  process.exit(1);
}
