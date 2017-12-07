const Botkit = require('../../../botkit/CoreBot');
const logging = require('../../../logging');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const querystring = require('querystring');
const async = require('async');

function GActionsBot(configuration) {

  var ActionsSDKApp = require('actions-on-google').ActionsSdkApp;

  configuration = configuration || {};
  
  configuration.logger = logging('abbott-framework:botkit:gactions');
  
  // Create a core botkit bot
  var gactions_botkit = Botkit(configuration || {});

  // Set some default configurations unless they've already been set.

  var spawned_bots = [];

  // customize the bot definition, which will be used when new connections
  // spawn!
  gactions_botkit.defineBot(require(__dirname + '/worker.js'));

  // Middleware to track spawned bots and connect existing RTM bots to incoming webhooks
  gactions_botkit.middleware.spawn.use(function (worker, next) {

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

  gactions_botkit.middleware.format.use( (bot, message, platform_message, next) => {
    if (message.text) {
      platform_message.text = message.text;
    }
    
    if (message.richResponse) {
      platform_message.richResponse = message.richResponse;
    }

    if (message.carousel) {
      platform_message.carousel = message.carousel;
    }

    if (message.list) {
      platform_message.list = message.list;
    }

    platform_message.endConversation = message.endConversation || false;
    platform_message.expectUserResponse = message.expectUserResponse || false;

    next();
  });
    
  // set up a web route for receiving outgoing webhooks and/or commands
  gactions_botkit.createWebhookEndpoints = function (webserver, authenticationTokens) {

    if (authenticationTokens !== undefined && arguments.length > 1 && arguments[1].length) {
      secureWebhookEndpoints.apply(null, arguments);
    }

    gactions_botkit.logger.info(
      '** Serving webhook endpoints for commands and outgoing ' +
      'webhooks at: http://' + gactions_botkit.config.hostname + ':' + gactions_botkit.config.port + '/gactions/receive');
    webserver.post('/gactions/receive', function (req, res) {
      // Now, pass the webhook into be processed
      const assistant = new ActionsSDKApp({ request: req, response: res });

      assistant.handleRequest(function (app) {
        gactions_botkit.handleWebhookPayload(req, res, app);
      });
    });

    return gactions_botkit;
  };

  gactions_botkit.handleWebhookPayload = function (req, res, gactionsApp) {
    let intent = gactionsApp.getIntent();

    if (intent) {
      var payload = {
        type: intent,
        text: gactionsApp.getRawInput(),
        user: gactionsApp.getUser().userId,
        channel: gactionsApp.getConversationId()
      };

      let bot = gactions_botkit.spawn({
        gactionsApp: gactionsApp
      });

      // Receive messages and trigger events from the Events API
      gactions_botkit.ingest(bot, payload, res);
    }
  };

  return gactions_botkit;
}

module.exports = GActionsBot;
