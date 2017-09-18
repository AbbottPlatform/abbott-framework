const apiaibotkit = require('@abbott-platform/api-ai-botkit');
const uuidV4 = require('uuid/v4');

const BaseProcessor = require('../base-processor');

module.exports = class extends BaseProcessor {
  constructor(abbottCore) {
    super('apiai', abbottCore);

    this.config.token = this.config.token || null;

    this.apiai = apiaibotkit(this.config.token);
  }

  process(message, bot) {
    this.apiai.process(message, bot);
  }

  processEvent(message, bot) {
    return this.eventRequest({
      name: message.eventName,
      channel: message.channel
    })
      .then((response) => {
        this.apiai.allCallback.forEach((callback) => {
          callback(message, response, bot);
        });
      });
  }

  eventRequest(eventData) {
    return new Promise((resolve, reject) => {
      if (!(eventData.channel in this.apiai.sessionIds)) {
        this.apiai.sessionIds[eventData.channel] = uuidV4();
      }

      let request = this.apiai.apiaiService.eventRequest({
        name: eventData.name,
      },
      {
        sessionId: this.apiai.sessionIds[eventData.channel],
        originalRequest: {
          source: "api-ai-abbott"
        }
      });

      request.on('response', (response) => {
        resolve(response);
      });
      
      request.on('error', (error) => {
        reject(error);
      });

      request.end();
    });
  }
};