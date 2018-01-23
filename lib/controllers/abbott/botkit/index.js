const Botkit = require('../../../botkit/CoreBot');
const logging = require('../../../logging');

function AbbottBot(configuration) {

  configuration = configuration || {};
  
  configuration.logger = logging('abbott-framework:botkit:abbott');

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

    if (req.query.collectPipeData) {
      payload.collectPipeData = true;
    }    

    if (payload.originalRequest.source === 'abbott') {
      let bot = botkit_core.spawn({ response: res });
      botkit_core.ingest(bot, payload, res);
    }
  };

  botkit_core.middleware.normalize.use(function (bot, message, next) {
    message.text = message.query;
    message.type = 'message';
    message.user = message.originalRequest.user.userId;
    message.channel = message.originalRequest.user.userId;

    if (message.collectPipeData) {
      message.collectPipeData = message.collectPipeData;
    }

    next();
  });

  return botkit_core;
}

module.exports = AbbottBot;
