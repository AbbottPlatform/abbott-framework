const logging = require('../logging');
const logger = logging('abbott-framework:core:intent-flow-handler');

var fetch = require('node-fetch');
var MessageFormat = require('messageformat');

var jspath = require('jspath');
var objectMapper = require('object-mapper');
var mapperSetKeyValue = require('object-mapper').setKeyValue;
var localeval = require('localeval');

const TextBuilder = require('./utils/textBuilder');
const responseBuilders = {
  default: require('./responseBuilders/default'),
  abbott: require('./responseBuilders/abbott'),
  google: require('./responseBuilders/google'),
  slack: require('./responseBuilders/slack'),
  gchats: require('./responseBuilders/gchats')
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

logger.debug('lib imported!');

module.exports = class IntentFlowHandler {

  get botType() {
    switch (this.bot.type) {
      case 'fb':
        return 'facebook';
      default:
        return this.bot.type;
    }
  }

  get responseMessages() {
    return this.nlpPayload.result.fulfillment.messages;
  }

  get responseAction() {
    return this.nlpPayload.result.action;
  }

  get responseActionIncomplete() {
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

  get logger() {
    if (!this.__logger) {
      this.__logger = logging(`abbott-framework:intent-flow-handler:(action: ${this.rootAction})`);
    }
    return this.__logger;
  }

  constructor(rootAction, controller, message, nlpPayload, bot) {
    this.rootAction = rootAction;
    this.controller = controller;
    this.message = message;
    this.nlpPayload = nlpPayload;
    this.bot = bot;
    this.pipeData = {};

    const ResponseBuilder = responseBuilders[this.botType] || responseBuilders['default'];
    this.responseBuilder = new ResponseBuilder(this);

    /* DEPRECATED */
    this.mainContextName = rootAction.replace('.', '-') + '-followup';

    this.messageFormat = enMessageFmt;

    this.logger.debug(`IntentFlowHandler -> initialized!`);
  }

  process() {
    this.logger.debug(`[process] -> starting...`);
    if ((this.responseMessages) && (this.responseMessages.length > 0)) {
      if (this.hasInputContext) {
        this.logger.debug(`[process] -> finding conversation context... (channel: ${this.message.channel})`);
        this.bot.findConversation(this.message, (convo) => {
          if (convo) {
            this.logger.debug(`[process] -> conversation context found!`);
            this._continueConversation(convo);
          } else {
            this.logger.debug(`[process] -> conversation context not found!`);
            this._startConversation();
          }
        });
      } else {
        this._startConversation();
      }
    }
  }

  _startConversation() {
    this.logger.debug(`[_startConversation] -> starting a new conversation context...`);
    this.bot.startConversation(this.message, (err, convo) => {
      convo.on('end', (convo) => {
        if (convo.status == 'completed') {
          console.info('[convo][end][completed]');
        } else {
          console.info('[convo][end][?]: something happened that caused the conversation to stop prematurely');
        }
      });

      convo.setVar('contexts', this.nlpPayload.result.contexts);
      convo.setVar('action', this.responseAction);

      // Set timeout for the conversation to 10 minutes.
      this._continueConversation(convo);

      convo.setTimeout(600000);
    });
  }

  _findQuickReply(responseText) {
    let response;
    let quickReplies = /<<(.*)>>/gi.exec(responseText);
    let options;

    if (quickReplies) {
      options = quickReplies[1].split(',');
      options = options.map(function (item) {
        return {
          content_type: 'text',
          title: item,
          payload: item
        };
      });

      response = {
        text: responseText.replace(quickReplies[0], ''),
        quick_replies: options
      };
    } else {
      response = responseText;
    }

    return response;
  }

  _customPayloadHasCustomPlatforms(payload) {
    return (('default' in payload) || 
      ('abbott' in payload) || 
      ('slack' in payload) || 
      ('google' in payload) || 
      ('facebook' in payload) || 
      ('gchats' in payload)) ? true : false;
  }

  _addCustomPayloadPlatform(payload, targetPayloadPlatforms) {
    let platforms = ['abbott', 'slack', 'google', 'facebook', 'gchats'];
    platforms.forEach((platformKey) => {
      if ((platformKey in payload) && (platformKey === this.botType)) {
        targetPayloadPlatforms[platformKey] = targetPayloadPlatforms[platformKey] || [];
        targetPayloadPlatforms[platformKey].push(payload[platformKey]);
        delete payload[platformKey];
      }
    });

    if ((!(this.botType in targetPayloadPlatforms)) && ('default' in payload)) {
      targetPayloadPlatforms['default'] = targetPayloadPlatforms['default'] || [];
      targetPayloadPlatforms['default'].push(payload['default']);
    }
  }

  _continueConversation(convo) {
    this.logger.debug(`[_continueConversation] -> starting...`);
    if (this.responseActionIncomplete) {
      this.logger.debug(`[_continueConversation] -> starting response action incomplete flow...`);
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

        if (apiMessage.payload) {
          let customPayloadHasCustomPlatforms = this._customPayloadHasCustomPlatforms(apiMessage.payload);

          if (apiMessage.platform) {
            if ((apiMessage.platform === this.botType) && (!customPayloadHasCustomPlatforms)) {
              customPayloads[apiMessage.platform] = customPayloads[apiMessage.platform] || [];
              customPayloads[apiMessage.platform].push(apiMessage.payload);
            }
          } else if (customPayloadHasCustomPlatforms) {
            this._addCustomPayloadPlatform(apiMessage.payload, customPayloads);
          } else { 
            customPayloads.default.push(apiMessage.payload);
          }
        } else { //Text message
          if (apiMessage.platform) {
            if (apiMessage.platform === this.botType) {
              textMessages[apiMessage.platform] = textMessages[apiMessage.platform] || [];
              textMessages[apiMessage.platform].push(apiMessage);
            }
          } else {
            textMessages.default.push(apiMessage);
          }
        }
      }

      if (this.botType in textMessages) {
        if ((textMessages[this.botType]) && (textMessages[this.botType].length > 0)) {
          for (let i = 0; i < textMessages[this.botType].length; i++) {
            responsePromises.push({
              source: 'apiai',
              response: textMessages[this.botType][i]
            });
          }
        }
      } else if ((textMessages.default) && (textMessages.default.length > 0)) {
        for (let i = 0; i < textMessages.default.length; i++) {
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

        for (let i = 0; i < payloadApis.length; i++) {
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

      this.logger.debug(`[_continueConversation] -> processing responses (count: ${responsePromises.length})...`);
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

    var actionIncomplete = messageResponse.actionIncomplete || false;
    var finalResponse = finalResponseData.response;

    convo = finalResponseData.convo || convo;

    if ((this.message.collectPipeData) && (this.pipeData)) {
      if (typeof (finalResponse) == 'string') {
        finalResponse = {
          text: finalResponse
        };
      }

      this.pipeData.conversationId = this.message.channel;
      
      if (this.nlpPayload) {

        this.pipeData.nlp = this.pipeData.nlp || {};
        this.pipeData.nlp.apiai = this.pipeData.nlp.apiai || {};

        this.pipeData.nlp.apiai.intents = this.pipeData.nlp.apiai.intents || [];
        
        this.pipeData.nlp.apiai.intents.push({
          intentId: this.nlpPayload.result.metadata.intentId,
          intentName: this.nlpPayload.result.metadata.intentName,
          action: this.nlpPayload.result.action,
          score: this.nlpPayload.result.score,
          parameters: this.nlpPayload.result.parameters,
          contexts: this.nlpPayload.result.contexts,
          sessionId: this.nlpPayload.sessionId,
        });
      }

      finalResponse.pipeData = this.pipeData;
    }

    this.logger.debug(`[_sendResponse] -> sending response (botType: ${this.botType})...`);
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

  fetch(url, options) {
    return fetch(url, options)
      .then((apiBotResp) => {
        return apiBotResp.json();
      });
  }

  _handlePayloadResponse(customPayload, convo) {
    let respPromise = null;

    if (customPayload.apiURL) {
      respPromise = this.fetch(customPayload.apiURL);
    } else {
      respPromise = Promise.resolve(customPayload.data || {});
    }

    return respPromise.then((data) => {
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

      transformParent.transform = (value, fromObject, toObject, fromKey, toKey) => {
        return localeval(tmpTransformValue, {
          src: data,
          format: this.messageFormat,
          textBuilder: new TextBuilder(),
          value: value,
          fromObject: fromObject,
          toObject: toObject,
          fromKey: fromKey,
          toKey: toKey
        });
      };
    }

    let defaulVaules = jspath.apply('..*{.default}', respMap);
    for (let i = 0; i < defaulVaules.length; i++) {
      let defaulVaulesParent = defaulVaules[i];

      let tmpDefaultValue = defaulVaulesParent.default;

      defaulVaulesParent.default = (fromObject, fromKey, toObject, toKey) => {
        return localeval(tmpDefaultValue, {
          src: data,
          format: this.messageFormat,
          textBuilder: new TextBuilder(),
          setKeyValue: mapperSetKeyValue,
          fromObject: fromObject,
          toObject: toObject,
          fromKey: fromKey,
          toKey: toKey
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

  _getContextByName(ctxName) {
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

  _parseContextParam(ctxParam) {
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

  _getContextParam(context, paramName) {
    var paramResult = null;

    if (paramName in context.parameters) {
      var ctx_param = context.parameters[paramName];
      paramResult = this._parseContextParam(ctx_param);
    }

    return paramResult;
  }

  _foreachProperty(jsObj, funcIteration) {
    if (!funcIteration) return;

    for (var name in jsObj) {
      if (jsObj.hasOwnProperty(name)) {
        funcIteration(name, jsObj[name]);
      }
    }
  }
};