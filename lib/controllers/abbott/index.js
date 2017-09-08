var debug = require('debug')('abbott-framework:abbott');

var BotkitAbbottBot = require(__dirname + '/botkit');
var BaseController = require('../base-controler');

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
    console.log('Initializing Abbott Engine...');
    debug('Initializing controller class...');
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
    this.controller.webserver = this.abbottCore.webserver;

    this.controller.startTicking();
  }

  process(req, res) {
    this.controller.handleWebhookPayload(req, res);
  }
};