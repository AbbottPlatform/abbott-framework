const Botkit = require('@abbott-platform/botkit/lib/CoreBot');
const logging = require('../../../logging');

function AbbottBot(configuration) {
  const logger = logging('abbott-framework:controllers:abbott:botkit');

  // Create a core botkit bot
  var botkit_core = Botkit(configuration || {});

  // Set some default configurations unless they've already been set.

  var spawned_bots = [];

  // customize the bot definition, which will be used when new connections
  // spawn!
  botkit_core.defineBot(require(__dirname + '/worker.js'));

  // Middleware to track spawned bots and connect existing RTM bots to incoming webhooks
  botkit_core.middleware.spawn.use(function (worker, next) {

    // lets first check and make sure we don't already have a bot
    // for this team! If we already have an RTM connection, copy it
    // into the new bot so it can be used for replies.

    var existing_bot = null;
    if (worker.config.id) {
      for (var b = 0; b < spawned_bots.length; b++) {
        if (spawned_bots[b].config.id) {
          if (spawned_bots[b].config.id == worker.config.id) {
            // WAIT! We already have a bot spawned here.
            // so instead of using the new one, use the exist one.
            existing_bot = spawned_bots[b];
          }
        }
      }
    }

    if (!existing_bot && worker.config.id) {
      spawned_bots.push(worker);
    }
    next();

  });

  // set up a web route for receiving outgoing webhooks and/or commands
  botkit_core.createWebhookEndpoints = function (webserver, authenticationTokens) {

    if (authenticationTokens !== undefined && arguments.length > 1 && arguments[1].length) {
      secureWebhookEndpoints.apply(null, arguments);
    }

    let hostAddress = process.env.ABBOTT_HOSTADDRESS || `http://${botkit_core.config.hostname}:${botkit_core.config.port}`;

    logger.info(`Serving webhook at: ${hostAddress}/abbott/receive`);
    webserver.post('/abbott/receive', function (req, res) {
      // Now, pass the webhook into be processed
      botkit_core.handleWebhookPayload(req, res);
    });

    return botkit_core;
  };

  botkit_core.handleWebhookPayload = function (req, res) {
    // is this an events api url handshake?
    if (req.body.type === 'url_verification') {
      logger.debug('Received url handshake');
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
      return handleEventsAPI(payload, bot);
    }
  };

  function handleEventsAPI(payload, bot) {
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

      botkit_core.receiveMessage(bot, message);
    }
  }

  botkit_core.handleAbbottEvents = function () {

    logger.debug('Setting up custom handlers for processing messages');
    botkit_core.on('message_received', function (bot, message) {
      if (message.type === 'message') {
        botkit_core.trigger(message.type, [bot, message]);
      } else {
        // this is a non-message object, so trigger a custom event based on the type
        botkit_core.trigger(message.type, [bot, message]);
      }
    });
  };
  
  botkit_core.handleAbbottEvents();

  return botkit_core;
}

module.exports = AbbottBot;
