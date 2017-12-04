const request = require('request');

module.exports = function (botkit, config) {
  var bot = {
    type: 'google',
    botkit: botkit,
    config: config || {
      gactionsApp: null
    },
    utterances: botkit.utterances,
    identity: { // default identity values
      id: null,
      name: '',
    }
  };

  bot.googleApp = bot.config.gactionsApp || null;

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

  bot.send = function (message, cb) {
    var msgArgs = [];

    /*
    * types:
    * simple
    * list
    * carousel
    */
    var messagetype = 'simple';

    if (message.text) {
      msgArgs.push(message.text);
    } else {
      if (message.richResponse) {
        msgArgs.push(message.richResponse);
      }

      if (message.carousel) {
        msgArgs.push(message.carousel);
        messagetype = 'carousel';
      } else if (message.list) {
        msgArgs.push(message.list);
        messagetype = 'list';
      }
    }

    let fnResponse = null;

    if ((message.endConversation) && (!message.expectUserResponse)) {
      fnResponse = bot.googleApp.tell;

      if (messagetype === 'list') {
        fnResponse = bot.googleApp.tellWithList;
      } else if (messagetype === 'carousel') {
        fnResponse = bot.googleApp.tellWithCarousel;        
      }
    } else {
      fnResponse = bot.googleApp.ask;

      if (messagetype === 'list') {
        fnResponse = bot.googleApp.askWithList;
      } else if (messagetype === 'carousel') {
        fnResponse = bot.googleApp.askWithCarousel;        
      }
    }

    botkit.logger.debug('SAY', msgArgs);
    fnResponse.apply(bot.googleApp, msgArgs);
    if (cb) cb();
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
