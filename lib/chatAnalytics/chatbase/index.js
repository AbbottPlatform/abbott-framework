const ChatAnalyticsBase = require('../analytics-base');

const request = require('request');

module.exports = class extends ChatAnalyticsBase {
  constructor(abbottController, options) {
    super(abbottController, options);
  }

  _getDefaultPayload(message) {
    return {
      url: 'https://chatbase.com/api/message',
      method: 'POST',
      json: {
        api_key: this.options.api_key,
        time_stamp: (new Date().getTime()) / 1000,
        platform: this.abbottController.botkitType,
        message: message,
      }
    };
  }

  _sendRequest(payload) {
    try {
      request(payload, (err, httpRsp, body) => {
        if ((err) || (body.status !== 200)) {
          console.error(err, body);
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  sendUserMessageAnayltics(message, userId, intent = null) {
    let payload = this._getDefaultPayload(message);

    payload.json.user_id = userId;
    payload.json.type = 'user';

    if (intent) {
      payload.json.intent = intent;
    } else {
      payload.json.not_handled = true;
    }

    this._sendRequest(payload);
  }

  sendBOTMessageAnayltics(message, intent = null) {
    let payload = this._getDefaultPayload(message);

    payload.json.user_id = '[bot-user]';
    payload.json.type = 'agent';

    if (intent) {
      payload.json.intent = intent;
    } else {
      payload.json.not_handled = true;
    }

    this._sendRequest(payload);
  }
};
