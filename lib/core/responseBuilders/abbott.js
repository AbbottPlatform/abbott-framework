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
        } else if (Array.isArray(responseMessage.response)) {
          let sanitizedArray = responseMessage.response.map((item) => {
            if (item.trim().length > 0) {
              item = item.trim();
            }
            return item;
          });

          return sanitizedArray;
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
      responseMessage.forEach((respItem) => {
        finalResponse = this.responseFormattersBySource[respItem.source](respItem);
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
