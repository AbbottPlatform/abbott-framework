const DefaultResponseBuilder = require('./default');

module.exports = class extends DefaultResponseBuilder {
  get responseFormattersBySource() {
    var baseFormatters = super.responseFormattersBySource;

    baseFormatters.apiai = (responseMessage) => {
      if (responseMessage.response.speech) {
        return responseMessage.response.speech;
      } else {
        var baseResponse = {
          "attachments": []
        };

        if (responseMessage.response.type === 1) {
          baseResponse.attachments = [
            {
              "fallback": "",
              "color": "",
              "callback_id": "apiai_card_callback",
              "image_url": responseMessage.response.imageUrl,
              "title": responseMessage.response.title,
              "text": responseMessage.response.subtitle,
              "actions": []
            }
          ];

          if ((responseMessage.response.buttons) && (responseMessage.response.buttons.length > 0)) {
            var idxActions = 0;
            if (responseMessage.response.title === responseMessage.response.buttons[0].text) {
              baseResponse.attachments[0].title_link = responseMessage.response.buttons[0].postback;            
              idxActions = 1;
            }

            for (var i = idxActions; i < responseMessage.response.buttons.length; i++) {
              var buttonItem = responseMessage.response.buttons[i];
              
              baseResponse.attachments[0].actions.push({
                "name": buttonItem.text,
                "text": buttonItem.text,
                "type": "button",
                "value": buttonItem.postback
              });
            }
          }

        } else if ((responseMessage.response.type === 2) && (responseMessage.response.replies)) {
          var attachActions = responseMessage.response.replies.map((replyItem) => {
            return {
              "name": "apiai_quick_reply",
              "text": replyItem,
              "type": "button",
              "value": replyItem
            };
          });

          baseResponse.text = responseMessage.response.title;
          baseResponse.attachments = [
            {
              "fallback": "",
              "callback_id": "apiai_quick_reply",
              "color": "",
              "attachment_type": "default",
              "actions": attachActions
            }
          ];
        }

        return baseResponse;
      }

      return responseMessage.response;
    };

    return baseFormatters;
  }

  constructor(intentFlowHandler) {
    super(intentFlowHandler);
  }

  build(responseMessage) {
    var responseConvo = null;
    var finalResponse = '';

    if (responseMessage instanceof Array) {
      throw new Error('Wrong message format!');
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