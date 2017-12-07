const env = require('node-env-file');
env(__dirname + '/.env');

const AbbottFramework = require('../').AbbottFramework;
const IntentFlowHandler = require('../').IntentFlowHandler;
const logger = require('../').logging();

var abbottConfig = {
  botName: 'abbott-gchats-sample',
  botFirendlyName: 'Abbott Google Chats Sample',
  port: process.env.PORT || 3000,
  platforms: {
    gchats: {
      verify_token: process.env.GCHATS_VERIFY_TOKEN || '[YOUR_ABBOTT_VERIFY_TOKEN]',
      chats_regex: process.env.GCHATS_CHATS_REGEX || '[GOOGLE_CHATS_REGEX]'
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
