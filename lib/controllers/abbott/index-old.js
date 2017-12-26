const BotkitAbbottBot = require(__dirname + '/botkit');
const BaseController = require('../base-controler');

module.exports = class AbbottController extends BaseController {
  get botkitType() {
    return 'abbott';
  }

  get hearsMentionEvents() {
    return [];
  }

  get hearsMessageEvents() {
    return ['message'];
  }

  constructor(abbottCore) {
    super('abbott', abbottCore, {
      __dirname: __dirname
    });

    if (this.abbottCore.options.storage) {
      this.config.storage = this.abbottCore.options.storage;
    }

    this.initializeAbbottBot();
  }

  getBotkitOptions() {
    let botOpt = super.getBotkitOptions();
    return botOpt;
  }

  initializeAbbottBot() {
    this.controller = BotkitAbbottBot(this.getBotkitOptions());
    this.controller.webserver = this.webserver;

    this.controller.startTicking();

    this.controller.createWebhookEndpoints(this.webserver);
  }

  process(req, res) {
    this.controller.handleWebhookPayload(req, res);
  }
};
