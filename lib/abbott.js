const path = require('path');
const logger = require('./logging')('abbott-framework');

const WebServer = require(__dirname + '/webserver');

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
  constructor(options, appContext = {}) {
    this.options = options || {};
    this.options.debug = this.options.debug || false;
    this.options.botName = this.options.botName || 'my-bot';
    this.options.botFirendlyName = this.options.botFirendlyName || 'My BOT';
    this.options.port = this.options.port || 3000;

    this.options.platforms = this.options.platforms || {};

    this.options.nlp = this.options.nlp || {};

    this.options.storage = this.options.storage || {
      local: path.join(process.cwd(), '.data/db')
    };

    this.options.webserver = options.webserver || {};

    this.appContext = appContext;

    this._loadWebserver();
    this._loadNLPProviders();
    this._loadControllers();
  }

  _loadWebserver() {
    process.env.express_port = this.options.port;

    this.webserver = new WebServer(this.options.webserver);    
  }

  _loadNLPProviders() {
    this.nlpProcessor = null;

    if (this.options.nlp) {
      let optNlpKey = Object.keys(this.options.nlp)[0];

      if (optNlpKey) {
        let Processor = require(__dirname + '/nlpProviders/' + optNlpKey);
        this.nlpProcessor = new Processor(this);
      }
    }
  }

  _loadControllers() {
    this.controllers = {};
    if (this.options.platforms) {
      let platformKeys = Object.keys(this.options.platforms);
      for (let i = 0; i < platformKeys.length; i++) {
        this._importController(platformKeys[i]);
      }
    }
  }

  _importController(controllerName) {
    if (this.controllers[controllerName]) return;

    let Controller = require(__dirname + '/controllers/' + controllerName);

    this.controllers[controllerName] = new Controller(this);
  }

  start() {
    return this.webserver.start()
      .then(() => {
        if (this.options.platforms) {
          let platformKeys = Object.keys(this.options.platforms);
          for (let i = 0; i < platformKeys.length; i++) {
            let controller = this.controllers[platformKeys[i]];
            if (controller) {
              controller.start();
            }
          }
        }
      });
  }

  stop() {
    return this.webserver.stop();
  }
};
