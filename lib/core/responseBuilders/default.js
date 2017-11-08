module.exports = class {
  get responseFormattersBySource() {
    return {
      'apiai': (responseMessage) => {
        if (responseMessage.response.speech !== undefined) {
          return responseMessage.response.speech;
        }

        return responseMessage.response;
      },
      'abbott': (responseMessage) => {
        return responseMessage.response;
      }
    };
  }

  constructor(intentFlowHandler) {
    this.intentFlowHandler = intentFlowHandler;
  }

  build(responseMessage) {
    var responseConvo = null;
    var finalResponse = '';

    if (responseMessage instanceof Array) {
      responseMessage.forEach((respItem) => {
        var curResponse = this.responseFormattersBySource[respItem.source](respItem);

        if (finalResponse.trim().length > 0) {
          finalResponse += ((respItem.source === 'abbott') ? '<br/>' : '\n') + curResponse;
        } else {
          finalResponse += curResponse;
        }

        responseConvo = respItem.convo || null;
      });
    } else {
      responseConvo = responseMessage.convo || null;
      finalResponse = this.responseFormattersBySource[responseMessage.source](responseMessage);
    }
    
    return {
      convo: responseConvo,
      response: finalResponse
    };
  }
};