const DefaultResponseBuilder = require('./default');

const richResponseAppenderBySource = {
  'apiai': (googleApp, finalResponse, richResponse, respItem) => {

    if ((typeof respItem.response === 'string' || respItem.response instanceof String)) {
      richResponse.addSimpleResponse(respItem.response); 
    } else if ((respItem.response.type === 'simple_response') || (respItem.response.speech)) {
      richResponse.addSimpleResponse(respItem.response.textToSpeech || respItem.response.speech);
    } else if (respItem.response.type === 'suggestion_chips') {
      richResponse.suggestions = respItem.response.suggestions; 
    } else if (respItem.response.type === 'basic_card') {
      var cardBuild = googleApp.buildBasicCard(respItem.response.formattedText)
        .setTitle(respItem.response.title)
        .setImage(respItem.response.image.url, 'Image');
      
      if ((respItem.response.buttons) && (respItem.response.buttons.length > 0)) {
        for (var i = 0; i < respItem.response.buttons.length; i++) {
          var buttonItem = respItem.response.buttons[i];
          cardBuild = cardBuild.addButton(buttonItem.title, ((buttonItem.openUrlAction) && (buttonItem.openUrlAction.url)) ? buttonItem.openUrlAction.url : null);
        }
      }

      richResponse.addBasicCard(cardBuild);
    }
  },
  'abbott': (googleApp, finalResponse, richResponse, respItem) => {
    if ((typeof respItem.response === 'string' || respItem.response instanceof String)) {
      richResponse.addSimpleResponse(respItem.response);
    } else {
      if (respItem.response.richResponse) {
        if (respItem.response.richResponse.items) {
          richResponse.items = respItem.response.richResponse.items;
        }
      }
  
      if (((respItem.response.carousel) && (respItem.response.carousel.items)) || 
        ((respItem.response.list) && (respItem.response.list.items))) {
  
        var buildObj = null;
        var arrayItems = [];
  
        if (respItem.response.carousel) {
          buildObj = googleApp.buildCarousel();
          arrayItems = respItem.response.carousel.items;
        } else if (respItem.response.list) {
          buildObj = googleApp.buildList(respItem.response.list.text || null);
          arrayItems = respItem.response.list.items;
        }
        
        for (let i = 0; i < arrayItems.length; i++) {
          let item = arrayItems[i];
          let optionItem = googleApp.buildOptionItem(item.id || 'ITEM_' + i, []);
  
          if (item.title) {
            optionItem.setTitle(item.title);
          }
  
          if (item.description) {
            optionItem.setDescription(item.description);
          }
  
          if (item.image) {
            optionItem.setImage(item.image.url, item.image.accessibilityText || 'Image');
          }
          
          buildObj.addItems(optionItem);
        }
  
        if (respItem.response.carousel) {
          finalResponse.carousel = buildObj;
        } else if (respItem.response.list) {
          finalResponse.list = buildObj;
        }
      }
    }
  }
};

module.exports = class extends DefaultResponseBuilder {
  get googleApp() {
    return this.intentFlowHandler.bot.googleApp;
  }

  get responseFormattersBySource() {
    return richResponseAppenderBySource;
  }

  constructor(intentFlowHandler) {
    super(intentFlowHandler);
  }

  _appendItemToRichResponse(finalResponse, richResponse, respItem) {
    this.responseFormattersBySource[respItem.source](this.googleApp, finalResponse, richResponse, respItem);
  }

  build(responseMessage) {
    var finalResponse = null;
    var responseConvo = null;

    var richResponse = this.googleApp.buildRichResponse();
    finalResponse = {
    };

    if (responseMessage instanceof Array) {
      responseMessage.forEach((respItem) => {
        this._appendItemToRichResponse(finalResponse, richResponse, respItem);
        responseConvo = respItem.convo || null;
      });
    } else {
      this._appendItemToRichResponse(finalResponse, richResponse, responseMessage);
      responseConvo = responseMessage.convo || null;
    }

    if ((richResponse.items) && (richResponse.items.length > 0)) {
      finalResponse.richResponse = richResponse;
    }
    
    return {
      convo: responseConvo,
      response: finalResponse
    };
  }
};