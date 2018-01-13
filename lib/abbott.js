const path = require('path');
const logger = require('./modules/logging/log4js').build(null, 'abbott-framework-lib');
const ModuleLoader = require('./module-loader');
// const DialogContextManager = require('./controllers/dialog-context');
// const WebServer = require(__dirname + '/webserver');

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
  get logger() {
    if (!this.__logger) {
      this.__logger = this.modules.resolveFor('logging', 'abbott');
    }

    return this.__logger;
  }

  get webserver() {
    return this.__webserver;
  }

  constructor(options, appContext = {}) {
    this.options = options || {};
    this.options.botName = this.options.botName || 'my-bot';
    this.options.botFirendlyName = this.options.botFirendlyName || 'My BOT';

    this.options.webserver = options.webserver || {};
    this.options.webserver.port = options.webserver.port || (process.env.ABBOTT_WEBSERVER_PORT || 3000);

    this.modules = new ModuleLoader({
      moduleTypes: {
        logging: {
          maxCount: 1
        },
        webserver: {
          maxCount: 1
        },
        controllers: true,
        messageEnrichments: true,
        messageHandlers: true,
        storage: {
          maxCount: 1
        }
      }
    });
    // this.options.port = this.options.port || 3000;

    // this.options.platforms = this.options.platforms || {};

    // this.options.nlp = this.options.nlp || {};

    // this.options.storage = this.options.storage || {
    //   local: path.join(process.cwd(), '.data/db')
    // };

    // this.contextManager = new DialogContextManager();

    // this.appContext = appContext;
  }

  _loadWebserver() {
    this.__webserver = this.modules.resolveFor('webserver', this.options.webserver);
  }

  // _loadNLPProviders() {
  //   this.nlpProcessor = null;

  //   if (this.options.nlp) {
  //     let optNlpKey = Object.keys(this.options.nlp)[0];

  //     if (optNlpKey) {
  //       let Processor = require(__dirname + '/nlpProviders/' + optNlpKey);
  //       this.nlpProcessor = new Processor(this);
  //     }
  //   }
  // }

  _loadControllers() {
    this.controllers = {};

    let controllersList = this.modules.resolveFor('controllers', this);
    if (controllersList) {
      if (!Array.isArray(controllersList)) {
        controllersList = [ controllersList ];
      }

      controllersList.forEach((controller) => {
        if (this.controllers[controller.key]) return;
    
        this.controllers[controller.key] = controller;
      });
    }
  }

  loadDefaultModules() {
    if (this.modules.hasFor('logging') <= 0) {
      this.modules.load(path.join(__dirname, 'modules/logging/log4js'));
    }

    if (this.modules.hasFor('webserver') <= 0) {
      this.modules.load(path.join(__dirname, 'modules/webserver/express'));
    }
  }

  prepare() {  
    this._loadWebserver();

    this._loadControllers();
  }

  start() {
    // this._loadNLPProviders();
    this.logger.debug('Starting...');
    return this.webserver.start()
      .then(() => {
        this.logger.debug('Started!');
        if (this.controllers) {
          let platformKeys = Object.keys(this.controllers);
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
    this.logger.debug('Stopping...');
    return this.webserver.stop()
      .then(() => {
        this.logger.debug('Stopped!');
      });
  }
};
