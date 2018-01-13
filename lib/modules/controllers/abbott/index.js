const path = require('path');
const BaseController = require('../../../sdks/module/controller/base-controler');

const AbbottController = class extends BaseController {
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

  get local() {
    return this.__local;
  }

  constructor(moduleLoader, abbottCore) {
    super('abbott', moduleLoader, abbottCore);
    this.__local = {
      __dirname: __dirname
    };
  }

  loadRoutes() {
    super.loadRoutes();

    let routesCfg = {
      baseDir: path.join(__dirname, 'routes'),
      extraParams: [
        this
      ]
    };

    this.abbottCore.webserver.loadRoute(routesCfg);    
  }

  processReceive(payload, response) {
    if ((payload.originalRequest.source === 'abbott') && (payload.query)) {
      super.processReceive(payload, response);
    } else {
      throw new Error('Forbidden');
    }
  }

  start() {
    this.middleware.normalize.use((bot, message, next) => {
      message.text = message.raw_message.query;
      //message.type = payload.type || 'message';
      message.user = message.raw_message.originalRequest.user.userId;
      message.channel = message.raw_message.originalRequest.user.userId;

      if (message.raw_message.collectPipeData) {
        message.collectPipeData = message.raw_message.collectPipeData;
      }

      next();
    });

    this.middleware.format.use((bot, message, platform_message, next) => {
      if ((typeof message === 'string') || (message instanceof String)) {
        message = {
          text: message
        };
      }

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

module.exports = {
  def: {
    name: 'abbott',
    description: 'Abbott Engine controller module',
    type: 'controllers',
    version: '1.0.0'
  },
  build: function () {
    return new AbbottController(...arguments);
  }
};
