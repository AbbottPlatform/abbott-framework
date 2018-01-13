const { MessageEnrichmentBase } = require('../../../../sdks/module/messageEnrichment');

var apiai = require('apiai');
var uuid = require('node-uuid');

const MessageEnrichment = class extends MessageEnrichmentBase {
  get config() {
    return this.__config;
  }

  constructor(moduleLoader, controller, config) {
    super(moduleLoader, controller);

    if (!config || !config.token) {
      throw new Error('No dialogflow token provided.');
    }

    this.__config = {
      minimum_confidence: 0.5,
      dialogflow: {
        language: null
      }
    };

    this.__config = Object.assign(this.__config, config);

    this.apiai = apiai(this.config.token, this.config.dialogflow);
  }

  _sendTextRequest(text, options) {
    this.logger$.debug('Sending message to dialogflow:', text);
    
    return new Promise((resolve, reject) => {
      let opts = {
        sessionId: uuid.v1()
      };

      opts = Object.assign(opts, options);

      let request = this.apiai.textRequest(text, opts);

      request.on('response', (response) => resolve(response));

      request.on('error', (error) => reject(error));

      request.end();
    });
  }

  _sendEventRequest(event, options) {
    this.logger$.debug('Sending event request to dialogflow:', event);
    
    return new Promise((resolve, reject) => {
      let opts = {
        sessionId: uuid.v1()
      };

      opts = Object.assign(opts, options);

      let request = this.apiai.eventRequest({
        name: event,
      }, opts);

      request.on('response', (response) => {
        this.logger.debug(`[eventRequest] -> receiving event request response for [${event}]...`);
        resolve(response);
      });
      
      request.on('error', (error) => {
        this.logger.error('[eventRequest][name: [${eventData.name}]]', error);
        reject(error);
      });

      request.end();
    });
  }

  process(message) {
    return new Promise((resolve, reject) => {
  
      let sessionId = message.channel || uuid.v1();

      let dialogFlowPromise = Promise.resolve();

      if (message.event) {
        dialogFlowPromise = dialogFlowPromise.then(() => this._sendEventRequest(message.event, {
          sessionId: sessionId
        }));
      } else if (message.text) {
        dialogFlowPromise = dialogFlowPromise.then(() => this._sendTextRequest(message.text, {
          sessionId: sessionId
        }));
      }

      dialogFlowPromise
        .then((response) => {
          let result = {
            language: response.lang,
            sessionId: response.sessionId,
            intents: [],
            parameters: response.result.parameters,
            fulfillment: response.result.fulfillment,
            action: response.result.action,
            actionIncomplete: response.result.actionIncomplete,
            contexts: response.result.contexts
          };

          if (response.result.score >= this.config.minimum_confidence) {
            result.intents = [ 
              {
                name: response.result.metadata.intentName,
                score: response.result.score
              }
            ];
          }

          return result;
        })
        .then(resolve)
        .catch(reject);
    });
  }
};

module.exports = {
  def: {
    name: 'nlp-dialogflow',
    type: 'messageEnrichments',
    version: '1.0.0'
  },
  defaultArgs: null,
  build: function () {
    let args = Array.prototype.slice.call(arguments, 0);

    if (this.defaultArgs) {
      args = args.concat(this.defaultArgs);
    }

    return new MessageEnrichment(...args);
  },
  isMatch: (controller, message) => {
    return ((message.text) || (message.event));
  }
};
