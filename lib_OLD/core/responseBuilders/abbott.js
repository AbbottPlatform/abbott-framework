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
        if (typeof responseMessage.response === 'string') {
          if (responseMessage.response.trim().length > 0) {
            responseMessage.response = responseMessage.response.trim();
          }

          return responseMessage.response;
        }

        return { custom: responseMessage.response };
      }
    };
  }

  constructor(intentFlowHandler) {
    this.intentFlowHandler = intentFlowHandler;
  }

  build(responseMessage) {
    var responseConvo = null;
    var finalResponse = null;

    if (responseMessage instanceof Array) {
      let _reponseTexts = [];
      responseMessage.forEach((respItem) => {
        _reponseTexts.push(this.responseFormattersBySource[respItem.source](respItem));
        responseConvo = respItem.convo || null;
      });

      finalResponse = _reponseTexts.join('\n');
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
