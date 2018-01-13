const { MessageHandlerBase } = require('../../lib/sdks/module/messageHandler');

const MessageHandler = class extends MessageHandlerBase {
  constructor(moduleLoader, controller, message, convo) {
    super(moduleLoader, controller, message, convo);
  }

  prepareResponse(response) {
    return new Promise((resolve) => {

      if (response.apiURL) {
        this._handlePayloadResponse(response)
        .then((resp) => {
          if (resp) {
            return {
              source: 'abbott',
              type: 'customPayload',
              actionIncomplete: response.actionIncomplete || false,
              response: resp.resultMessage
            };
          }
        })
        .then(resolve);
      } else {
        resolve(response);
      }
    });
  }
};

module.exports = {
  def: {
    name: 'messageHandler-weather',
    type: 'messageHandlers',
    version: '1.0.0'
  },
  build: function () {
    return new MessageHandler(...arguments);
  },
  isMatch: (controller, message) => {
    const targetAction = 'abbott-handler.weather';
    return (message.enrichments['nlp-dialogflow'].action.startsWith(targetAction));
  }
};
