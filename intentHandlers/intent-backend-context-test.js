var { IntentFlowHandler } = require('../');

module.exports = class IntentBackendContextTest extends IntentFlowHandler {

  constructor(controller, message, nlpPayload, bot) {
    super('abbott-intent-backend-context', controller, message, nlpPayload, bot);
  }

  _handlePayloadResponse(customPayload, convo) {
    return super._handlePayloadResponse(customPayload, convo);
  }

  _sendResponse(convo, messageResponse) {
    let dialogContext = this.getContext('intent-backend-context');
    if (!dialogContext) {
      dialogContext = this.setContext('intent-backend-context');
    }

    let curNumber = this.nlpPayload.result.parameters.number;
    let prevNumber = dialogContext.vars.number;

    dialogContext.setVar('number', curNumber);

    super._sendResponse(convo, messageResponse);
  }
};

module.exports.isMatch = function (nlpPayload) {
  return (nlpPayload.result.action.startsWith('abbott.intent.backend.context.')) ? true : false;
};
