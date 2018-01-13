module.exports = function (abbottController) {

  /* Collect some very simple runtime stats for use in the uptime/debug command */
  var stats = {
    triggers: 0,
    convos: 0,
  };

  abbottController.on('heard_trigger', function () {
    stats.triggers++;
  });

  abbottController.on('conversationStarted', function () {
    stats.convos++;
  });

  if ((abbottController.hearsMentionEvents) && (abbottController.hearsMentionEvents.length > 0)) {
    abbottController.on(abbottController.hearsMentionEvents.join(','), (bot, message) => {
      //TODO: Add message pre-process midlewares 
      if (!message.text.trim()) {
        // start a conversation to handle this response.
        bot.startConversation(message, (err, convo) => {
          convo.ask('Hello, how can i help you?');
        });
      }
    });
  }

  if ((abbottController.hearsMessageEvents) && (abbottController.hearsMessageEvents.length > 0)) {
    abbottController.hears(['^uptime$', '^debug$'], abbottController.hearsMessageEvents.join(','), (bot, message) => {
      //TODO: Add message handler midlewares 
      bot.startConversation(message, (err, convo) => {
        if (!err) {
          let uptime = formatUptime(process.uptime());

          convo.say(`My main process has been online for ${uptime}. Since booting, I have heard ${stats.triggers} triggers, and conducted ${stats.convos} conversations.`);
        }
      });
    });
          
    abbottController.hears('.*', abbottController.hearsTriggerEvents, (bot, message) => {
      //TODO: Add message handler midlewares 
      abbottController.callMessageHandler(bot, message);
      // if (abbottController.nlpProcessor) {
      //   message.eventName = abbottController.triggerEventsNLPMap[message.type] || message.type;
      //   abbottController.nlpProcessor.processEvent(message, bot);
      // }
    });

    abbottController.hears('.+', abbottController.hearsMessageEvents, (bot, message) => {
      abbottController.callMessageHandler(bot, message);
    });
  }

  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
  /* Utility function to format uptime */
  function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
      uptime = uptime / 60;
      unit = 'minute';
    }
    if (uptime > 60) {
      uptime = uptime / 60;
      unit = 'hour';
    }
    if (uptime != 1) {
      unit = unit + 's';
    }

    uptime = parseInt(uptime) + ' ' + unit;
    return uptime;
  }
};
