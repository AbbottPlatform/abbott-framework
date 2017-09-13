const createLogger = require('logging').default; 
const log = createLogger('AbbottFramework:core:intent-flow-handler');

var fetch = require('node-fetch');
var MessageFormat = require('messageformat');

var jspath = require('jspath');
var objectMapper = require('object-mapper');
var localeval = require('localeval');

const TextBuilder = require('./utils/textBuilder');
const responseBuilders = { 
  default: require('./responseBuilders/default'), 
  google: require('./responseBuilders/google'),
  slack: require('./responseBuilders/slack')
};

var listJoinFormatter = {
  prop: function (v, lc, p) {
    return v[p];
  },
  listJoin: function (list, cult, sep) {
    sep = sep || ', ';
    return list.join(sep);
  }
};

var enMessageFmt = new MessageFormat('en').setIntlSupport(true);
enMessageFmt.currency = 'USD';

enMessageFmt.addFormatters(listJoinFormatter);

log.debug('Lib imported!');

module.exports = class IntentFlowHandler {

  get botType() {
    switch (this.bot.type) {
      case 'fb':
        return 'facebook';
      default:
       return this.bot.type;
    }
  }

  get responseMessages () {
    return this.nlpPayload.result.fulfillment.messages;
  }

  get responseAction () {
    return this.nlpPayload.result.action;
  }
  
  get responseActionIncomplete () {
    return this.nlpPayload.result.actionIncomplete;
  }

  get hasInputContext() {
    return ((this.nlpPayload.result.contexts) && (this.nlpPayload.result.contexts.length > 0)) ? true : false;
  }

  /* DEPRECATED */
  get mainContext() {
    let mainCtx = null;
    if (this.hasInputContext) {
      for (var i = 0; i < this.nlpPayload.result.contexts.length; i++) {
        var ctx = this.nlpPayload.result.contexts[i];
        if (ctx.name == this.mainContextName) {
          mainCtx = ctx;
          break; 
        }
      }
    }
    return mainCtx;
  }

  /* DEPRECATED */
  get mainContextParams() {
    let ctxParams = null;

    let mainCtx = this.mainContext;
    if (mainCtx) {
      ctxParams = mainCtx.parameters;
    }

    return ctxParams;
  }

  constructor (rootAction, controller, message, nlpPayload, bot) {
    this.rootAction = rootAction;
    this.controller = controller;
    this.message = message;
    this.nlpPayload = nlpPayload;
    this.bot = bot;

    const ResponseBuilder = responseBuilders[this.botType] || responseBuilders['default'];
    this.responseBuilder = new ResponseBuilder(this);

    /* DEPRECATED */
    this.mainContextName = rootAction.replace('.','-') + '-followup';

    this.messageFormat = enMessageFmt;
  }

  process () {
    if ((this.responseMessages) && (this.responseMessages.length > 0)) {
      if (this.hasInputContext) {
        this.bot.findConversation(this.message, (convo) => {
          if (convo) {
            this._continueConversation(convo);              
          } else {
            this._startConversation();
          }
        });
      } else {
        this._startConversation();
      }
    }
  }

  _startConversation() {
    this.bot.startConversation(this.message, (err, convo) => {
      convo.on('end', (convo) => {
        if (convo.status == 'completed') {
          console.info('[convo][end][completed]');
        } else {
          console.info('[convo][end][?]: something happened that caused the conversation to stop prematurely');
        }
      });
      convo.onTimeout((convo) => {
        convo.say('Are you still there?');
        convo.next();
      });

      convo.setVar('contexts', this.nlpPayload.result.contexts);
      convo.setVar('action', this.responseAction);

      // Set timeout for the conversation to 10 minutes.
      this._continueConversation(convo);

      convo.setTimeout(600000);
    });
  }

  _findQuickReply (responseText) {
    let response;
    let quickReplies = /<<(.*)>>/gi.exec(responseText);
    let options;

    if(quickReplies){      
      options = quickReplies[1].split(',');
      options = options.map(function(item){
        return {
          content_type: 'text',
          title: item,
          payload: item
        }
      });

      response = {
        text: responseText.replace(quickReplies[0], ''),
        quick_replies: options
      };
    }else{
      response = responseText;
    }

    return response;
  }

  _continueConversation (convo) {
    if (this.responseActionIncomplete) {
        var responseText = this._findQuickReply(this.nlpPayload.result.fulfillment.speech);

        this._sendResponse(convo, {
          source: 'apiai',
          actionIncomplete: true,
          response: responseText
        });
    } else {
      var responsePromises = [];

      var textMessages = {
        'default': []
      };

      var customPayloads = {
        'default': []
      };

      var responseQueue = [];

      for (var i = 0; i < this.responseMessages.length; i++) {
        let apiMessage = this.responseMessages[i];

        if (apiMessage.payload) { //Text message
          if (apiMessage.platform) {
            customPayloads[apiMessage.platform] = customPayloads[apiMessage.platform] || [];
            customPayloads[apiMessage.platform].push(apiMessage.payload);
          } else { 
            customPayloads.default.push(apiMessage.payload);
          }
        } else {
          if (apiMessage.platform) {
            textMessages[apiMessage.platform] = textMessages[apiMessage.platform] || [];
            textMessages[apiMessage.platform].push(apiMessage);
          } else {
            textMessages.default.push(apiMessage);
          }
        }
      }

      if ((this.botType in textMessages) || ((customPayloads) && (this.botType in customPayloads))) {
        if ((textMessages[this.botType]) && (textMessages[this.botType].length > 0)) {
          for (var i = 0; i < textMessages[this.botType].length; i++) {
            responsePromises.push({
              source: 'apiai',
              response: textMessages[this.botType][i]
            });
          }
        }
      } else if ((textMessages.default) && (textMessages.default.length > 0)) {
        for (var i = 0; i < textMessages.default.length; i++) {
          responsePromises.push({
            source: 'apiai',
            response: textMessages.default[i]
          });
        }
      }

      if (customPayloads) {
        var payloadApis = [];

        if ((this.botType in customPayloads) && (customPayloads[this.botType].length > 0)) {
          payloadApis = customPayloads[this.botType];
        } else {
          payloadApis = customPayloads.default;
        }

        for (var i = 0; i < payloadApis.length; i++) {
          var customPayload = payloadApis[i];

          try {
            responsePromises.push(this._handlePayloadResponse(customPayload, convo)
              .then((resp) => {
                if (resp) {
                  return {
                    source: 'abbott',
                    type: 'customPayload',
                    convo: resp.convo,
                    actionIncomplete: customPayload.actionIncomplete,
                    response: resp.resultMessage
                  };                    
                }
              }));
          } catch (ex) {
            this._fetchErrorHandler(ex, convo);
          }
        }
      }

      Promise.all(responsePromises)
        .then((responseMessages) => {
          if ((this.botType === 'google') || (this.botType === 'abbott')) {
            this._sendResponse(convo, responseMessages);            
          } else {
            responseMessages.forEach((responseData) => {
              this._sendResponse(responseData.convo || convo, responseData);            
            });
          }
        });
    }
  }

  _sendResponse(convo, messageResponse) {
    if (!messageResponse) return;
    
    var finalResponseData = this.responseBuilder.build(messageResponse);

    if (!finalResponseData) return;    

    var actionIncomplete = finalResponseData.actionIncomplete || false;
    var finalResponse = finalResponseData.response;
    
    convo = finalResponseData.convo || convo;
        
    this._checkRetryConversation(convo, (convo) => {
      if ((actionIncomplete) && (finalResponse)) {
        convo.addQuestion(finalResponse, (response, convo) => {
          if (this.controller.nlpProcessor) {
            this.controller.nlpProcessor.process(response, this.bot);
          }
        }, {});
      } else if (finalResponse) {
        convo.say(finalResponse);
      }
      convo.next();
    });
  }

  _checkRetryConversation(convo, fnConversation) {
    if (!fnConversation) return;

    if (convo.status === "active") {
      fnConversation(convo);
    } else {
      this.bot.startConversation(this.message, (err, convo) => {
        fnConversation(convo);
      });
    }
  }

  fetch (url, options) {
    return fetch(url, options)
      .then((apiBotResp) => {
        return apiBotResp.json();
      });
  }

  _handlePayloadResponse (customPayload, convo) {
    return this.fetch(customPayload.apiURL)
      .then((data) => {
        let resp = this._handleFetchResponse(customPayload, data, convo);        
        resp.convo = convo;        
        return resp;
      })
      .catch((err) => {
        this._fetchErrorHandler(err, convo);
      });
  }

  _handleFetchResponse(customPayload, data, convo) {
    let resp = {};

    let newData = this._handleApiResponseModifiers(customPayload, data);

    if (customPayload.responseAsMessage) {
      resp.resultMessage = newData;
    } else if (customPayload.messageFormat) {
      resp.resultMessage = this.messageFormat.compile(customPayload.messageFormat)(newData);
    } else if (customPayload.message) {
      resp.resultMessage = customPayload.message;
    }

    return resp;
  }

  _normalizeModifierMap(modifierMap, data) {
    var respMap = JSON.stringify(modifierMap);

    respMap = respMap.replace(/(["].*(?:->.*)+["]:)/gm, function (g1) { 
        return g1.replace(/->/g, '.');
    });
    
    respMap = JSON.parse(respMap);

    let transformations = jspath.apply('..*{.transform}', respMap);
    for (var i = 0; i < transformations.length; i++) {
      let transformParent = transformations[i];
      
      let tmpTransformValue = transformParent.transform;

      transformParent.transform = (value) => { 
        return localeval(tmpTransformValue, {
          src: data,
          format: this.messageFormat,
          textBuilder: new TextBuilder(),
          value: value
        });
      };
    }

    return respMap;
  }

  _handleApiResponseModifiers(customPayload, data) {
    var outputData = data;
    
    if (customPayload.api) {
      var apiResponseModifier = customPayload.api.response;

      if ((apiResponseModifier) && (apiResponseModifier.map)) {
        var respMap = this._normalizeModifierMap(apiResponseModifier.map, data);

        outputData = apiResponseModifier.default || {};

        outputData = objectMapper(data, outputData, respMap);
      }
    }

    return outputData;
  }

  _fetchErrorHandler(err, convo) {
    console.error(err);
    this._checkRetryConversation(convo, (convo) => {
      convo.say('Ops! I\'m sick! Could you try again a second late?');
      convo.next();
    });
  }

  _getContextByName (ctxName) {
    var ctx = null;

    for (var i = 0; i < this.nlpPayload.result.contexts.length; i++) {
      var context = this.nlpPayload.result.contexts[i];
      if (context.name === ctxName) {
        ctx = context;
        break;
      }
    }

    return ctx;
  }

  _parseContextParam (ctxParam) {
    var paramResult = null;

    var valSplited = ctxParam.split(':');

    if (valSplited.length > 0) {
      if (valSplited.length === 1) {
        paramResult = {
          name: valSplited[0],
          value: valSplited[0]
        };
      } else if (valSplited.length === 2) {
        paramResult = {
          name: valSplited[0],
          value: valSplited[1]
        };
      }
    }

    return paramResult;
  }

  _getContextParam (context, paramName) {
    var paramResult = null;

    if (paramName in context.parameters) {
      var ctx_param = context.parameters[paramName];
      paramResult = this._parseContextParam(ctx_param);
    }

    return paramResult;
  }

  _foreachProperty (jsObj, funcIteration) {
    if (!funcIteration) return;
    
    for (var name in jsObj) {
      if (jsObj.hasOwnProperty(name)) {
        funcIteration(name, jsObj[name]);
      }
    }
  }
};