const apiaibotkit = require('@abbott-platform/api-ai-botkit');
const uuidV4 = require('uuid/v4');

const BaseProcessor = require('../base-processor');

module.exports = class extends BaseProcessor {
  constructor(abbottCore) {
    super('apiai', abbottCore);

    this.config.token = this.config.token || null;

    this.apiai = apiaibotkit(this.config.token);

    this.logger.debug('initialized!');
  }

  process(message, bot) {
    this.logger.debug('[process] -> starting...');
    this.apiai.process(message, bot);
  }

  processEvent(message, bot, params = null) {
    return this.eventRequest({
      name: message.eventName,
      channel: message.channel,
      params: params
    })
      .then((response) => {
        this.apiai.allCallback.forEach((callback) => {
          callback(message, response, bot);
        });
      });
  }

  eventRequest(eventData) {
    this.logger.debug('[eventRequest] -> starting...');
    return new Promise((resolve, reject) => {
      this.logger.debug(`[eventRequest] -> checking channel [${eventData.channel}] exists as session on api-ai-botkit...`);
      if (!(eventData.channel in this.apiai.sessionIds)) {
        this.apiai.sessionIds[eventData.channel] = uuidV4();
        this.logger.debug(`[eventRequest][api-ai-botkit] -> created new session...`);
      }

      let requestOpts = {
        name: eventData.name,
      };

      if (eventData.params) {
        requestOpts.data = eventData.params;
      }

      let request = this.apiai.apiaiService.eventRequest(requestOpts,
      {
        sessionId: this.apiai.sessionIds[eventData.channel],
        originalRequest: {
          source: "api-ai-abbott"
        }
      });

      request.on('response', (response) => {
        this.logger.debug(`[eventRequest][apiaiService] -> receiving event request response for [${eventData.name}]...`);
        resolve(response);
      });
      
      request.on('error', (error) => {
        this.logger.error('[eventRequest][apiaiService][name: [${eventData.name}]]', error);
        reject(error);
      });

      this.logger.debug(`[eventRequest] -> sending event request for [${eventData.name}]...`);
      request.end();
    });
  }
};
