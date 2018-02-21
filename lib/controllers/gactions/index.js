const BotkitGActionsBot = require(__dirname + '/botkit');
const BaseController = require('../base-controler');

module.exports = class GActionsController extends BaseController {
  get botkitType() {
    return 'google';
  }

  get hearsMentionEvents() {
    return [];
  }

  get hearsTriggerEvents() {
    return [ 'actions.intent.MAIN' ];
  }

  get triggerEventsNLPMap() {
    return {
      'actions.intent.MAIN': 'WELCOME'
    };
  }

  get hearsMessageEvents() {
    return [ 'actions.intent.TEXT' ];
  }

  constructor(abbottCore) {
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
