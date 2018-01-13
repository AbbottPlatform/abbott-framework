const Botkit = require('../../../botkit/CoreBot');
const logging = require('../../../logging');

function AbbottBot(configuration) {

  configuration = configuration || {};
  
  configuration.logger = logging('abbott-framework:botkit:abbott');

  // Create a core botkit bot
  var botkit_core = Botkit(configuration || {});

  // customize the bot definition, which will be used when new connections
  // spawn!
  botkit_core.defineBot(require(__dirname + '/worker.js'));

  botkit_core.middleware.format.use((bot, message, platform_message, next) => {
    if (message.pipeData) {
      platform_message.pipeData = message.pipeData;
    }

    if (message.custom) {
      platform_message.custom = message.custom;
    }

    if (message.text) {
      platform_message.text = message.text;
    }

    platform_message.endConversation = message.endConversation || false;
    platform_message.expectUserResponse = message.expectUserResponse || false;

    next();
  });    

  // set up a web route for receiving outgoing webhooks and/or commands
  botkit_core.createWebhookEndpoints = function (webserver, authenticationTokens) {

    if (authenticationTokens !== undefined && arguments.length > 1 && arguments[1].length) {
      secureWebhookEndpoints.apply(null, arguments);
    }

    let hostAddress = process.env.ABBOTT_HOSTADDRESS || `http://${botkit_core.config.hostname}:${botkit_core.config.port}`;

    botkit_core.logger.info(`Serving webhook at: ${hostAddress}/abbott/receive`);
    webserver.post('/abbott/receive', function (req, res) {
      // Now, pass the webhook into be processed
      botkit_core.handleWebhookPayload(req, res);
    });

    return botkit_core;
  };

  botkit_core.handleWebhookPayload = function (req, res) {
    // is this an events api url handshake?
    if (req.body.type === 'url_verification') {
      botkit_core.logger.debug('Received url handshake');
      res.json({ challenge: req.body.challenge });
      return;
    }

    var payload = req.body;
    // if (payload.payload) {
    //   payload = JSON.parse(payload.payload);
    // }

    if (req.query.collectPipeData) {
      payload.collectPipeData = true;
    }    

    if (payload.originalRequest.source === 'abbott') {
      let bot = botkit_core.spawn({ response: res });
      // Receive messages and trigger events from the Events API
      return handleEventsAPI(payload, bot, res);
    }
  };

  function handleEventsAPI(payload, bot, res) {
    var message = {};

    // let's normalize some of these fields to match the rtm message format
    if ((payload.originalRequest.source === 'abbott') && (payload.query)) {
      message.text = payload.query;
      message.type = 'message';
      message.user = payload.originalRequest.user.userId;
      message.channel = payload.originalRequest.user.userId;

      if (payload.collectPipeData) {
        message.collectPipeData = payload.collectPipeData;
      }

      botkit_core.ingest(bot, message, res);
    }
  }

  return botkit_core;
}

module.exports = AbbottBot;
