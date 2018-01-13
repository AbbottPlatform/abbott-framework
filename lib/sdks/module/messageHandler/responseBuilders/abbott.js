module.exports = class {
  get responseFormattersBySource() {
    return {
      'nlp-dialogflow': (responseMessage) => {
        if (responseMessage.speech !== undefined) {
          return {
            response: responseMessage.speech
          };
        }

        return {
          response: responseMessage
        };
      },
      'abbott': (responseMessage) => {
        if (typeof responseMessage.response === 'string') {
          if (responseMessage.response.trim().length > 0) {
            responseMessage.response = responseMessage.response.trim();
          }
        }

        return responseMessage;
      }
    };
  }

  constructor(intentFlowHandler) {
    this.intentFlowHandler = intentFlowHandler;
  }

  build(responseMessage) {
    var finalResponse = null;

    if (responseMessage instanceof Array) {
      let _reponseTexts = [];
      finalResponse = {        
        actionIncomplete: false
      };

      responseMessage.forEach((respItem) => {
        let curResponse = this.responseFormattersBySource[respItem.source](respItem);

        finalResponse.actionIncomplete = curResponse.actionIncomplete;
        
        _reponseTexts.push(curResponse.response);
      });

      finalResponse.response = _reponseTexts.join('\n');
    } else {
      finalResponse = this.responseFormattersBySource[responseMessage.source](responseMessage);
    }
    
    return finalResponse;
  }
};
