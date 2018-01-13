const path = require('path');
const env = require('node-env-file');
env(__dirname + '/.env');

const Abbott = require('../').AbbottFramework;
const logger = require('../lib/modules/logging/log4js').build(null, 'my-bot-app');

var abbottConfig = {
  botName: 'abbott-sample',
  botFirendlyName: 'Abbott Sample',
  languages: {
    default: 'en-US',
    available: [ 'en-US', 'pt-BR']
  }
  // port: process.env.PORT || 3000,
  // platforms: {
  //   abbott: {}
  // },
  // nlp: {
  //   apiai: {
  //     token: process.env.NLP_DIALOGFLOW_TOKEN || '[YOUR_API.AI_DEVELOPER_TOKEN]'
  //   }
  // }
};

try {
  const abbott = new Abbott(abbottConfig);
  abbott.loadDefaultModules();

  abbott.modules.load(path.join(__dirname, '../lib/modules/controllers/abbott'), { 
    verify_token: 123456
  });
  
  abbott.modules.load(path.join(__dirname, '../lib/modules/messageEnrichments/nlp/dialogFlow'), {
    token: process.env.NLP_DIALOGFLOW_TOKEN || '[YOUR_API.AI_DEVELOPER_TOKEN]'
  });

  abbott.modules.load(path.join(__dirname, 'messageHandlers/weather-msg-handler'));

  abbott.prepare();

  abbott.start()
    .then(() => {
      logger.info('Ready!');
    })
    .catch((err) => logger.error(err));
}
catch (err) {
  logger.error(err);
  process.exit(1);
}
