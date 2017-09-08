var request = require('request');

module.exports = function (botkit, config) {
  var bot = {
    type: 'abbott',
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
    if (this.response) {
      var that = this;
      this.response.status(200).json({ 
        ok: true,
        message: msg
      });
    }
  }

  bot.send = function (message, cb) {
    //TODO: Need to discover why it is been called twince by (tick)
    if (bot.response.finished) return;

    var msgArgs = [];

    /*
    * types:
    * simple
    */
    // var messagetype = 'simple';

    if (message.text) {
      msgArgs.push({
        text: message.text
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

  bot.findConversation = function (message, cb) {
    cb();
  };

  return bot;
};