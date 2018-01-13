var fetch = require('node-fetch');
var MessageFormat = require('messageformat');

var jspath = require('jspath');
var objectMapper = require('object-mapper');
var mapperSetKeyValue = require('object-mapper').setKeyValue;
var localeval = require('localeval');

const TextBuilder = require('../../../utils/text-builder');
const responseBuilders = {
  default: require('./responseBuilders/default'),
  abbott: require('./responseBuilders/abbott'),
  google: require('./responseBuilders/google'),
  slack: require('./responseBuilders/slack'),
  gchats: require('./responseBuilders/gchats'),
  facebook: require('./responseBuilders/facebook')
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

module.exports = class {
  get modules() {
    return this.__modules;
  }

  get logger$() {
    if (!this.__logger) {
      this.__logger = this.modules.resolveFor('logging', `message-handler:${this.botType}`);
    }

    return this.__logger;
  }

  get controller() {
    return this.__controller;
  }

  get botType() {
    return this.controller.type;
  }

  get message() {
    return this.__message;
  }

  get convo() {
    return this.__convo;
  }

  get nlpEnrichment() {
    return this.message.enrichments['nlp-dialogflow'];
  }

  get responseMessages() {
    return this.nlpEnrichment.fulfillment.messages;
  }

  constructor(moduleLoader, controller, message, convo) {
    this.__modules = moduleLoader;
    this.__controller = controller;
    this.__message = message;
    this.__convo = convo;

    this.pipeData = {
      conversationId: this.message.channel
    };

    const ResponseBuilder = responseBuilders[this.botType] || responseBuilders['default'];
    this.responseBuilder = new ResponseBuilder(this);

    this.messageFormat = enMessageFmt;
  }

  _customPayloadHasCustomPlatforms(payload) {
    return (('default' in payload) ||
      (this.botType in payload)) ? true : false;
  }

  _addCustomPayloadPlatform(payload, targetPayloadPlatforms) {
    if (this.botType in payload) {
      targetPayloadPlatforms[this.botType] = targetPayloadPlatforms[this.botType] || [];
      targetPayloadPlatforms[this.botType].push(payload[this.botType]);
      delete payload[this.botType];
    }

    if ((!(this.botType in targetPayloadPlatforms)) && ('default' in payload)) {
      targetPayloadPlatforms['default'] = targetPayloadPlatforms['default'] || [];
      targetPayloadPlatforms['default'].push(payload['default']);
    }
  }

  _buildTextResponsePromises(responsePromises, payloadTargets) {
    if ((this.botType in payloadTargets) && (payloadTargets[this.botType].length > 0)) {
      payloadTargets[this.botType].forEach((responseItem) => {
        responseItem.source = 'nlp-dialogflow';
        responseItem.actionIncomplete = this.nlpEnrichment.actionIncomplete;
        responsePromises.push(Promise.resolve().then(() => this.prepareResponse(responseItem)));
      });
    } else if ((payloadTargets.default) && (payloadTargets.default.length > 0)) {
      payloadTargets.default.forEach((responseItem) => {
        responseItem.source = 'nlp-dialogflow';
        responseItem.actionIncomplete = this.nlpEnrichment.actionIncomplete;
        responsePromises.push(Promise.resolve().then(() => this.prepareResponse(responseItem)));
      });
    }
  }

  _buildCustomResponsePromises(responsePromises, payloadTargets) {
    var payloadApis = [];

    if ((this.botType in payloadTargets) && (payloadTargets[this.botType].length > 0)) {
      payloadApis = payloadTargets[this.botType];
    } else {
      payloadApis = payloadTargets.default;
    }

    payloadApis.forEach((customPayload) => {
      try {
        responsePromises.push(Promise.resolve().then(() => this.prepareResponse(customPayload)));
        // responsePromises.push(this._handlePayloadResponse(customPayload)
        //   .then((resp) => {
        //     if (resp) {
        //       return {
        //         source: 'abbott',
        //         type: 'customPayload',
        //         convo: resp.convo,
        //         actionIncomplete: customPayload.actionIncomplete,
        //         response: resp.resultMessage
        //       };
        //     }
        //   }));
      } catch (ex) {
        this.logger$.error(err);
      }
    });
  }

  selectResponses() {
    var responsePromises = [];

    var textMessages = {
      'default': []
    };

    var customPayloads = {
      'default': []
    };

    this.responseMessages.forEach((apiMessage) => {
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
    });

    this._buildTextResponsePromises(responsePromises, textMessages);

    this._buildCustomResponsePromises(responsePromises, customPayloads);

    return responsePromises;
  }

  prepareResponse(response) {
    return new Promise((resolve) => {
      resolve(response);
    });
  }

  _addPipelineDataInfoToResponse(response) {
    if (this.pipeData) {
      if (this.nlpEnrichment) {

        this.pipeData.nlp = this.pipeData.nlp || {};
        this.pipeData.nlp.dialogflow = this.pipeData.nlp.dialogflow || {};

        this.pipeData.nlp.dialogflow.intents = this.pipeData.nlp.dialogflow.intents || [];

        this.pipeData.nlp.dialogflow.push(this.nlpEnrichment);
      }

      response.pipeData = this.pipeData;
    }
  }

  _sendResponse(messageResponse) {
    if (!messageResponse) return;

    var finalResponseData = this.responseBuilder.build(messageResponse);

    if (!finalResponseData) return;

    var actionIncomplete = messageResponse.actionIncomplete || false;
    var finalResponse = finalResponseData.response;

    if (typeof (finalResponse) == 'string') {
      finalResponse = {
        text: finalResponse
      };
    }

    if ((this.message.collectPipeData) && (this.pipeData)) {
      this._addPipelineDataInfoToResponse(finalResponse);
    }

    this.logger$.debug(`[_sendResponse] -> sending response...`);
    if ((actionIncomplete) && (finalResponse)) {
      this.convo.ask(finalResponse);
    } else if (finalResponse) {
      this.convo.say(finalResponse);
    }
  }

  processResponse(message) {
    let responsePromises = this.selectResponses();

    return Promise.all(responsePromises)
      .then((responseMessages) => {
        if ((this.botType === 'google') || (this.botType === 'abbott')) {
          this._sendResponse(responseMessages);
        } else {
          responseMessages.forEach((responseData) => {
            this._sendResponse(responseData);
          });
        }
      });
  }

  //----------------------------------------------------------------------------------------------

  fetch(url, options) {
    return fetch(url, options)
      .then((apiBotResp) => {
        return apiBotResp.json();
      });
  }

  _handlePayloadResponse(customPayload) {
    let respPromise = null;

    if (customPayload.apiURL) {
      respPromise = this.fetch(customPayload.apiURL);
    } else {
      respPromise = Promise.resolve(customPayload.data || {});
    }

    return respPromise.then((data) => {
      let resp = this._handleFetchResponse(customPayload, data);
      return resp;
    })
    .catch((err) => {
      this.logger$.error(err);
    });
  }

  _handleFetchResponse(customPayload, data) {
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

    //Necessary adjustments when comes from DialogFlow
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
};
