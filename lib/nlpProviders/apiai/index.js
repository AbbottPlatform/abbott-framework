const apiaibotkit = require('@abbott-platform/api-ai-botkit');
const uuidV4 = require('uuid/v4');
const Entities = require('html-entities').XmlEntities;
const decoder = new Entities();

const BaseProcessor = require('../base-processor');

function isDefined(obj) {
  if (typeof obj == 'undefined') {
    return false;
  }

  if (!obj) {
    return false;
  }

  return obj != null;
}

module.exports = class extends BaseProcessor {
  constructor(abbottCore) {
    super('apiai', abbottCore);

    this.config.token = this.config.token || null;

    this.apiai = apiaibotkit(this.config.token);

    this.logger.debug('initialized!');
  }

  process(message, bot) {
    this.logger.debug('[process] -> starting...');
    try {

      if (isDefined(message.text)) {
        let userId = message.user;

        let requestText = decoder.decode(message.text);
        requestText = requestText.replace("’", "'");

        if (isDefined(bot.identity) && isDefined(bot.identity.id)) {
          // it seems it is Slack

          if (message.user == bot.identity.id) {
            // message from bot can be skipped
            return;
          }

          if (message.text.indexOf("<@U") == 0 && message.text.indexOf(bot.identity.id) == -1) {
            // skip other users direct mentions
            return;
          }

          let botId = '<@' + bot.identity.id + '>';
          if (requestText.indexOf(botId) > -1) {
            requestText = requestText.replace(botId, '');
          }

          userId = message.channel;
        }

        if (!(userId in this.apiai.sessionIds)) {
          this.apiai.sessionIds[userId] = uuidV4();
        }

        let requestOpts = {
          sessionId: this.apiai.sessionIds[userId],
          originalRequest: {
            data: message,
            source: "api-ai-botkit"
          }
        };

        if (message.lang) {
          requestOpts.lang = message.lang;
        }

        let request = this.apiai.apiaiService.textRequest(requestText, requestOpts);

        request.on('response', (response) => {
          this.apiai.allCallback.forEach((callback) => {
            callback(message, response, bot);
          });

          if (isDefined(response.result)) {
            let action = response.result.action;

            if (isDefined(action)) {
              if (this.apiai.actionCallbacks[action]) {
                this.apiai.actionCallbacks[action].forEach((callback) => {
                  callback(message, response, bot);
                });
              }
            }
          }
        });

        request.on('error', (error) => {
          console.error(error);
        });

        request.end();
      }

    } catch (err) {
      console.error(err);
    }
  }

  processEvent(message, bot, params = null) {
    return this.eventRequest({
      name: message.eventName,
      channel: message.channel,
      lang: message.lang || null,
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

      let eventParam = {
        name: eventData.name,
      };
      let eventOpts = {
        sessionId: this.apiai.sessionIds[eventData.channel],
        originalRequest: {
          source: "api-ai-abbott"
        }
      };

      if (eventData.lang) {
        eventOpts.lang = eventData.lang;
      }

      if (eventData.params) {
        eventParam.data = eventData.params;
      }

      let request = this.apiai.apiaiService.eventRequest(eventParam, eventOpts);

      request.on('response', (response) => {
        this.logger.debug(`[eventRequest][apiaiService] -> receiving event request response for [${eventData.name}]...`);
        if (eventData.params) {
          response.eventParams = eventData.params;
        }
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
