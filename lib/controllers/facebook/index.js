const BotkitFacebook = require(__dirname + '/botkit');
const path = require('path');
const BaseController = require('../base-controler');

module.exports = class FacebookController extends BaseController {
  get botkitType() {
    return 'fb';
  }

  get hearsMentionEvents() {
    return [];
  }

  get hearsMessageEvents() {
    return ['message_received'];
  }

  constructor(abbottCore) {
    super('facebook', abbottCore, {
      __dirname: __dirname
    });

    this.config.access_token = this.config.access_token || null;
    this.config.verify_token = this.config.verify_token || null;
    this.config.app_secret = this.config.app_secret || null;
    this.config.validate_requests = this.config.validate_requests || false;

    if ((!this.config) || 
        (!this.config.access_token) || 
        (!this.config.verify_token) || 
        (!this.config.app_secret)) {
      throw this.usage_tip();
    }

    this.initializeController();
  }

  getBotkitOptions() {
    let botOpt = super.getBotkitOptions();

    botOpt.access_token = this.config.access_token;
    botOpt.verify_token = this.config.verify_token;
    botOpt.app_secret = this.config.app_secret;
    botOpt.validate_requests = this.config.validate_requests;

    return botOpt;
  }

  initializeController() {
    // Create the Botkit controller, which controls all instances of the bot.
    this.controller = BotkitFacebook(this.getBotkitOptions());
    this.controller.webserver = this.webserver;
    
    this.controller.startTicking();

    this.controller.createWebhookEndpoints(this.webserver, this.controller.spawn({}));
  }

  usage_tip() {
    var strReturn = 'ERROR: Missing Facebook Parameters!';
    return strReturn;
  }
};
