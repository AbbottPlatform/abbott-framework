module.exports = function (abbottController) {

  /* Collect some very simple runtime stats for use in the uptime/debug command */
  var stats = {
    triggers: 0,
    convos: 0,
  };

  abbottController.controller.on('heard_trigger', function () {
    stats.triggers++;
  });

  abbottController.controller.on('conversationStarted', function () {
    stats.convos++;
  });

  if ((abbottController.hearsMentionEvents) && (abbottController.hearsMentionEvents.length > 0)) {
    abbottController.controller.on(abbottController.hearsMentionEvents.join(','), (bot, message) => {
      if (!message.text.trim()) {
        // start a conversation to handle this response.
        bot.startConversation(message, (err, convo) => {
          convo.addQuestion('Hello, how can i help you?', (response, convo) => {
            this.nlpProcessor.process(response, bot);
          }, {}, 'default');
        });
      }
    });
  }

  if ((abbottController.hearsMessageEvents) && (abbottController.hearsMessageEvents.length > 0)) {
    abbottController.controller.hears(['^uptime$', '^debug$'], abbottController.hearsMessageEvents.join(','), function (bot, message) {

      if (abbottController.chatAnalytics) {
        abbottController.chatAnalytics.sendUserMessageAnayltics(message.text, message.user, '[abbott][debug]');
      }

      bot.createConversation(message, function (err, convo) {
        if (!err) {
          convo.setVar('uptime', formatUptime(process.uptime()));
          convo.setVar('convos', stats.convos);
          convo.setVar('triggers', stats.triggers);

          if (abbottController.chatAnalytics) {
            abbottController.chatAnalytics.sendBOTMessageAnayltics("[SUCCESS]", '[abbott][debug]');
          }

          convo.say('My main process has been online for {{vars.uptime}}. Since booting, I have heard {{vars.triggers}} triggers, and conducted {{vars.convos}} conversations.');
          convo.activate();
        }
      });
    });

    abbottController.controller.hears('.*', abbottController.hearsTriggerEvents, function (bot, message) {
      if (abbottController.nlpProcessor) {
        message.eventName = abbottController.triggerEventsNLPMap[message.type] || message.type;
        abbottController.nlpProcessor.processEvent(message, bot);
      } else {
        if (abbottController.chatAnalytics) {
          abbottController.chatAnalytics.sendUserMessageAnayltics(message.text, message.user, null);
        }
      }
    });

    abbottController.controller.hears('.+', abbottController.hearsMessageEvents, function (bot, message) {
      if (abbottController.nlpProcessor) {
        abbottController.nlpProcessor.process(message, bot);
      } else {
        if (abbottController.chatAnalytics) {
          abbottController.chatAnalytics.sendUserMessageAnayltics(message.text, message.user, null);
        }
      }
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
