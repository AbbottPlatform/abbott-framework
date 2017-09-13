var path = require('path');
var fs = require('fs');

const IntentFlowHandler = require(path.join(__dirname, '../../../../../core/intent-flow-handler'));

var intentHandlers = [];

var customIntentHandlersPath = path.join(process.cwd(), 'intentHandlers');

if (fs.existsSync(customIntentHandlersPath)) {
  fs.readdirSync(customIntentHandlersPath)
    .forEach((file) => {
      if (file.match(/^[^.].*[.]js$/i)) {
        intentHandlers.push(require(path.join(customIntentHandlersPath, file)));
      }
    });
}

var intentHandlersPath = path.join(__dirname, '../../../../intentHandlers');
  fs.readdirSync(intentHandlersPath)
    .forEach((file) => {
      if (file.match(/^[^.].*[.]js$/i)) {
        intentHandlers.push(require(path.join(intentHandlersPath, file)));
      }
    });

module.exports = function (abbottController) {
  abbottController.nlpProcessor.apiai.all(function (message, resp, bot) {
    if (bot.type !== abbottController.botkitType) return;
    // console.log('[abbottController.nlpProcessor.apiai.all]:', resp.result.action);
    var intentHandler = null;

    for (var i = 0; i < intentHandlers.length; i++) {
      var IntentHandlerType = intentHandlers[i];
      if (IntentHandlerType.isMatch(resp)) {
        intentHandler = new IntentHandlerType(abbottController, message, resp, bot);
        break;
      }
    }

    if (!intentHandler) {
      intentHandler = new IntentFlowHandler(resp.result.action || '', abbottController, message, resp, bot);
    }

    intentHandler.process();
  });
};
