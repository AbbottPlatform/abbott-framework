module.exports = class {
  get responseFormattersBySource() {
    return {
      'apiai': (responseMessage) => {
        if (responseMessage.response.speech !== undefined) {
          return responseMessage.response.speech;
        } else if (responseMessage.response.type === 1) {
          let templateElement = {
            "title": responseMessage.response.title,
            "image_url": responseMessage.response.imageUrl,
            "subtitle": responseMessage.response.subtitle
          };

          if ((responseMessage.response.buttons) && (responseMessage.response.buttons.length > 0)) {
            templateElement.buttons = responseMessage.response.buttons.map((buttonSrc) => {
              return {
                "type": "web_url",
                "url": buttonSrc.postback,
                "title": buttonSrc.text
              };
            });
          }

          responseMessage.response = {
            attachment: {
              "type": "template",
              "payload": {
                "template_type": "generic",
                "elements": [
                  templateElement
                ]
              }
            }
          };
        } else if (responseMessage.response.type === 2) {
          responseMessage.response = {
            "text": responseMessage.response.title,
            "quick_replies": responseMessage.response.replies.map((itemReply) => {
              return {
                "content_type": "text",
                "title": itemReply,
                "payload": itemReply
              };
            })
          };
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
