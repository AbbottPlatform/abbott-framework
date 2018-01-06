const BaseController = require('../new-base-controler');

module.exports = class AbbottController extends BaseController {
  get botkitType() {
    return this.type;
  }

  get type() {
    return 'abbott';
  }
  
  get hearsMentionEvents() {
    return [];
  }

  get hearsMessageEvents() {
    return ['message_received'];
  }

  constructor(abbottCore) {
    super('abbott', abbottCore, {
      __dirname: __dirname
    });
  }

  processReceive(payload, response) {
    if ((payload.originalRequest.source === 'abbott') && (payload.query)) {
      let message = {};

      message.text = payload.query;
      //message.type = payload.type || 'message';
      message.user = payload.originalRequest.user.userId;
      message.channel = payload.originalRequest.user.userId;

      if (payload.collectPipeData) {
        message.collectPipeData = payload.collectPipeData;
      }

      super.processReceive(message, response);
    }
  }

  start() {
    this.middleware.format.use((bot, message, platform_message, next) => {
      if (message.pipeData) {
        platform_message.pipeData = message.pipeData;
      }
  
      if (message.custom) {
        platform_message.custom = message.custom;
      }
  
      if (message.text) {
        platform_message.text = message.text;
      }
  
      platform_message.endConversation = message.endConversation || false;
      platform_message.expectUserResponse = message.expectUserResponse || false;
  
      next();
    }); 

    super.start();
  }
};
