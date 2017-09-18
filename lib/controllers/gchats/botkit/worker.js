var request = require('request');
const fetch = require('node-fetch');

module.exports = function (botkit, config) {
  var bot = {
    type: 'gchats',
    botkit: botkit,
    config: config || {
      response: null
    },
    utterances: botkit.utterances,
    identity: { // default identity values
      id: null,
      name: '',
    }
  };

  bot.response = bot.config.response || null;

  // Set when destroy() is called - prevents a reconnect from completing
  // if it was fired off prior to destroy being called
  var destroyed = false;

  /**
   * Shutdown and cleanup the spawned worker
   */
  bot.destroy = function () {
    // this prevents a startRTM from completing if it was fired off
    // prior to destroy being called
    destroyed = true;

    botkit.shutdown();
  };

  function sendMessage(msg) {
    fetch(config.response_url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(msg)
    });
  }

  bot.send = function (message, cb) {
    var msgArgs = [];

    /*
    * types:
    * simple
    */
    // var messagetype = 'simple';

    let msgSender = {
      displayName: config.botFirendlyName || 'Abbott',
      avatarUrl: `https://${bot.response.req.hostname}/bot/avatar`
    };

    if (message.text) {
      msgArgs.push({
        sender: msgSender,
        text: message.text
      });
    } else if (message.cards) {
      msgArgs.push({
        sender: msgSender,
        cards: message.cards
      });
    }

    let fnResponse = null;

    if ((message.endConversation) && (!msg.expectUserResponse)) {
      fnResponse = sendMessage;
    } else {
      fnResponse = sendMessage;
    }

    botkit.debug('SAY', msgArgs);
    fnResponse.apply(bot, msgArgs);
    if (cb) {
      cb();
    }
  };

  bot.reply = function (src, resp, cb) {
    var msg = {};

    if (typeof (resp) == 'string') {
      msg.text = resp;
    } else {
      msg = resp;
    }

    msg.channel = src.channel;

    bot.say(msg, cb);
  };

  bot.startConversation = function (message, cb) {
    botkit.startConversation(this, message, cb);
  };

  bot.createConversation = function (message, cb) {
    botkit.createConversation(this, message, cb);
  };

  /**
       * This handles the particulars of finding an existing conversation or
       * topic to fit the message into...
       */
  bot.findConversation = function (message, cb) {
    botkit.debug('CUSTOM FIND CONVO', message.user, message.channel);
    if (message.type == 'message' || message.type == 'outgoing_webhook') {
      for (var t = 0; t < botkit.tasks.length; t++) {
        for (var c = 0; c < botkit.tasks[t].convos.length; c++) {
          if (
            botkit.tasks[t].convos[c].isActive() &&
            botkit.tasks[t].convos[c].source_message.user == message.user &&
            botkit.tasks[t].convos[c].source_message.channel == message.channel
          ) {
            botkit.debug('FOUND EXISTING CONVO!');

            // modify message text to prune off the bot's name (@bot hey -> hey)
            // and trim whitespace that is sometimes added
            // this would otherwise happen in the handleSlackEvents function
            // which does not get called for messages attached to conversations.

            if (message.text) {
              message.text = message.text.trim();

              var direct_mention = new RegExp('^\<\@' + bot.identity.id + '\>', 'i');

              message.text = message.text.replace(direct_mention, '')
                .replace(/^\s+/, '').replace(/^\:\s+/, '').replace(/^\s+/, '');
            }

            cb(botkit.tasks[t].convos[c]);
            return;
          }
        }
      }
    }

    cb();
  };

  return bot;
};