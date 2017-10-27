const path = require('path');
const logger = require('./logging')('abbott-framework');

logger.debug('lib imported!');

/**
  @typedef AbbottFrameworkOptions
  @name AbbottFramework-Options
  @type {object}
  @property {boolean} debug - Enable debug mode.
 */

/**
 * Main Abbott Framework Class.
 * @name AbbottFramework
 * @class
 * @param {AbbottFrameworkOptions} options
 */
module.exports = class {
  constructor(options) {
    this.options = options || {};
    this.options.debug = this.options.debug || false;
    this.options.botName = this.options.botName || 'my-bot';
    this.options.port = this.options.port || 3000;
    process.env.express_port = this.options.port;

    this.options.platforms = this.options.platforms || {};
    
    this.options.sdks = this.options.sdks || {};
    this.options.sdks.botkit = this.options.sdks.botkit || {};

    this.options.nlp = this.options.nlp || {};

    this.options.storage = this.options.storage || {
      local: path.join(process.cwd(), '.data/db')
    };

    this.webserver = require(__dirname + '/components/express_webserver.js')(this.options.webserver);

    this.nlpProcessor = null;

    if (this.options.nlp) {
      let optNlpKey = Object.keys(this.options.nlp)[0];

      if (optNlpKey) {
        let Processor = require(__dirname + '/nlpProcessors/' + optNlpKey);
        this.nlpProcessor = new Processor(this);
      }
    }

    this.controllers = {};
    if (this.options.platforms) {
      let platformKeys = Object.keys(this.options.platforms);
      for (let i = 0; i < platformKeys.length; i++) {
        this.importController(platformKeys[i]);
      }
    }
  }

  importController(controllerName) {
    if (this.controllers[controllerName]) return;

    let Controller = require(__dirname + '/controllers/' + controllerName);
    
    this.controllers[controllerName] = new Controller(this);
  }

  start() {
    if (this.options.platforms) {
      let platformKeys = Object.keys(this.options.platforms);
      for (let i = 0; i < platformKeys.length; i++) {
        let controller = this.controllers[platformKeys[i]];
        if (controller) {
          controller.start();
        }
      }
    }
  }
};