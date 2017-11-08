var debug = require('debug')('abbott-framework:gactions');

var BotkitGActionsBot = require('@abbott-platform/botkit/lib/GActionsBot');
var BaseController = require('../base-controler');

module.exports = class GActionsController extends BaseController {
  get botkitType() {
    return 'google';
  }

  get hearsMentionEvents() {
    return [];
  }

  get hearsTriggerEvents() {
    return [ 'assistant.intent.action.MAIN' ];
  }

  get triggerEventsNLPMap() {
    return {
      'assistant.intent.action.MAIN': 'WELCOME'
    };
  }

  get hearsMessageEvents() {
    return [ 'assistant.intent.action.TEXT' ];
  }

  constructor(abbottCore) {
    debug('Initializing controller class...');
    super('gactions', abbottCore, {
      __dirname: __dirname
    });

    if (this.abbottCore.options.storage) {
      this.config.storage = this.abbottCore.options.storage;
    }

    this.initializeGActionsBot();
  }

  getBotkitOptions() {
    let botOpt = super.getBotkitOptions();
    return botOpt;
  }

  initializeGActionsBot() {
    this.controller = BotkitGActionsBot(this.getBotkitOptions());
    this.controller.webserver = this.webserver;

    this.controller.startTicking();

    this.controller.createWebhookEndpoints(this.webserver);
  }
};
