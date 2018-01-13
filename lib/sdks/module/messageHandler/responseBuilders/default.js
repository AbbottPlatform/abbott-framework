module.exports = class {
  get responseFormattersBySource() {
    return {
      'nlp-dialogflow': (responseMessage) => {
        if (responseMessage.speech !== undefined) {
          return responseMessage.speech;
        }

        return responseMessage;
      },
      'abbott': (responseMessage) => {
        return responseMessage;
      }
    };
  }

  constructor(intentFlowHandler) {
    this.intentFlowHandler = intentFlowHandler;
  }

  build(responseMessage) {
    var finalResponse = '';

    if (responseMessage instanceof Array) {
      responseMessage.forEach((respItem) => {
        var curResponse = this.responseFormattersBySource[respItem.source](respItem);

        if (finalResponse.trim().length > 0) {
          finalResponse += ((respItem.source === 'abbott') ? '<br/>' : '\n') + curResponse;
        } else {
          finalResponse += curResponse;
        }
      });
    } else {
      finalResponse = this.responseFormattersBySource[responseMessage.source](responseMessage);
    }
    
    return {
      response: finalResponse
    };
  }
};
