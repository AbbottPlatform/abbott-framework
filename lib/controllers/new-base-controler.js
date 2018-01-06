const path = require('path');
const coreUtils = require('../core/utils');
const logging = require('../logging');
const ConversationContext = require('./dialog-context');
const ware = require('ware');
const clone = require('clone');

/**
 * Controller Base Class for chat engines.
 * @name BaseController
 * @class
 */
module.exports = class BaseController {
  get logger() {
    if (!this.__logger) {
      this.__logger = logging(`abbott-framework:controllers:${this.key}`);
    }
    return this.__logger;
  }

  get type() {
    return null;
  }

  get hearsMentionEvents() {
    return [];
  }

  get hearsTriggerEvents() {
    return [];
  }

  get triggerEventsNLPMap() {
    return {
    };
  }

  get hearsMessageEvents() {
    return [];
  }

  get config() {
    return this._config;
  }

  get nlpProcessor() {
    return this.abbottCore.nlpProcessor;
  }

  get webserver() {
    return this.abbottCore.webserver.server;
  }

  get middleware() {
    return this._middleware;
  }

  get contextManager() {
    return this.abbottCore.contextManager;
  }

  constructor(key, abbottCore, globals) {
    this.key = key;
    this.events = {};
    this.abbottCore = abbottCore;

    this._config = this.abbottCore.options.platforms[key] || {};

    this._config.hostname = process.env.ABBOTT_HOSTADDRESS || 'localhost';

    this.globals = globals || {};
    this.globals.__dirname = this.globals.__dirname || __dirname;

    if (this.abbottCore.options.storage) {
      this.config.storage = JSON.parse(JSON.stringify(this.abbottCore.options.storage));
    }

    this.initialize();

    this.logger.debug('BaseController -> initialized!');
  }

  _startMiddlewares() {
    this._middleware = {
      spawn: ware(),
      ingest: ware(),
      normalize: ware(),
      categorize: ware(),
      receive: ware(),
      heard: ware(), // best place for heavy i/o because fewer messages
      triggered: ware(), // like heard, but for other events
      capture: ware(),
      format: ware(),
      send: ware(),
    };
  }

  getBotkitOptions() {
    let botkitOpts = {
      debug: false
    };

    var storeNameSpace = this.abbottCore.options.botName + '-' + this.key;

    if (this.config.storage.datastore) {
      var namespace = null;
      if (this.config.storage.datastore.namespace) {
        namespace = this.config.storage.datastore.namespace + '-' + this.key;
      }

      this.config.storage.datastore.namespace = namespace || storeNameSpace;

      botkitOpts.storage = require('@abbott-platform/botkit-storage-datastore')(this.config.storage.datastore);
    } else if (this.config.storage.local) {
      botkitOpts.json_file_store = path.join(this.config.storage.local, storeNameSpace); // store user data in a simple JSON format
    }

    return botkitOpts;
  }

  loadComponents(componentsPath) {
    this.loadLibsFrom(componentsPath, (comp) => {
      comp(this);
    });
  }

  loadSkills() {
    var customSkills = coreUtils.requireIfExits(this.globals.__dirname + '/skills');
    if (!customSkills) {
      var skillsGeneric = coreUtils.requireIfExits(__dirname + '/generic/skills');
      if (skillsGeneric) {
        skillsGeneric(this);
      }
    } else {
      customSkills(this);
    }

    if (this.nlpProcessor) {
      var nlpProcessorSkills = coreUtils.requireIfExits(__dirname + '/generic/skills/nlp/' + this.nlpProcessor.key);
      if (nlpProcessorSkills) {
        nlpProcessorSkills(this);
      }
    }
  }

  loadLibsFrom(libDir, eachCallback) {
    require('fs').readdirSync(libDir).forEach((file) => {
      if (eachCallback) {
        eachCallback(require(path.join(libDir, file)));
      }
    });
  }

  loadRoutes() {
    let routesCfg = {
      baseDir: path.join(this.globals.__dirname, 'routes'),
      extraParams: [
        this
      ]
    };

    this.abbottCore.webserver.loadRoute(routesCfg);
  }

  initialize() {
    this._startMiddlewares();

    this.initializeWorkerClass();

    this.changeEars(this.hears_regexp);
  }

  initializeWorkerClass() {
    this.defineWorker(require(__dirname + '/base-worker'));
  }

  startConversation(bot, message, cb) {
    var convo = bot;

    bot.conversationContext = {
      new: true,
    };
    /*
    this.startTask(bot, message, (task, convo) => {
      cb(null, convo);
    });
    */

    cb(null, convo);
  }

  createConversation(bot, message, cb) {
    /*
    var task = new Task(bot, message, this);

    task.id = botkit.taskCount++;

    var convo = task.createConversation(message);

    this.tasks.push(task);

    cb(null, convo);
    */
  }

  defineWorker(unitClass) {
    if (typeof (unitClass) != 'function') {
      throw new Error('Worker definition must be a class');
    }
    this._WorkerClass = unitClass;
  }

  spawn(config, cb) {
    var worker = new this._WorkerClass(this, config);
    // mutate the worker so that we can call middleware
    worker.say = (message, cb) => {
      var platform_message = {};
      this.middleware.send.run(worker, message, (err, worker, message) => {
        if (err) {
          this.logger.error('An error occured in the send middleware:: ' + err);
        } else {
          this.middleware.format.run(worker, message, platform_message,  (err, worker, message, platform_message) => {
            if (err) {
              this.logger.error('An error occured in the format middleware: ' + err);
            } else {
              worker.send(platform_message, cb);
            }
          });
        }
      });
    };

    // add platform independent convenience methods
    worker.startConversation = (message, cb) => {
      this.startConversation(worker, message, cb);
    };

    worker.createConversation = (message, cb) => {
      this.createConversation(worker, message, cb);
    };

    this.middleware.spawn.run(worker, (err, worker) => {
      if (err) {
        this.logger.error('Error in middlware.spawn.run: ' + err);
      } else {
        this.trigger('spawned', [worker]);

        if (cb) {
          cb(worker);
        }
      }
    });

    return worker;
  }

  ingest(bot, payload, source) {
    // keep an unmodified copy of the message
    payload.raw_message = clone(payload);

    payload._pipeline = {
      stage: 'ingest',
    };

    this.middleware.ingest.run(bot, payload, source, (err, bot, payload, source) => {
      if (err) {
        this.logger.error('An error occured in the ingest middleware: ', err);
        return;
      }
      this.normalize(bot, payload);
    });
  }

  normalize(bot, payload) {
    payload._pipeline.stage = 'normalize';
    this.middleware.normalize.run(bot, payload, (err, bot, message) => {
      if (err) {
        this.logger.error('An error occured in the normalize middleware: ', err);
        return;
      }

      if (!message.type) {
        message.type = 'message_received';
      }

      this.categorize(bot, message);
    });
  }

  categorize(bot, message) {
    message._pipeline.stage = 'categorize';
    this.middleware.categorize.run(bot, message, (err, bot, message) => {
      if (err) {
        this.logger.error('An error occured in the categorize middleware: ', err);
        return;
      }

      this.receiveMessage(bot, message);
    });
  }

  receiveMessage(bot, message) {
    message._pipeline.stage = 'receive';
    this.middleware.receive.run(bot, message, (err, bot, message) => {
      if (err) {
        this.logger.error('An error occured in the receive middleware: ', err);
        return;
      } else {
        this.logger.debug('RECEIVED MESSAGE');
        bot.findConversation(message, (convo) => {
          if (convo) {
            convo.handle(message);
          } else {
            this.trigger(message.type, [bot, message]);
          }
        });
      }
    });
  }

  /**
   * hears_regexp - default string matcher uses regular expressions
   *
   * @param  {array}  tests    patterns to match
   * @param  {object} message message object with various fields
   * @return {boolean}        whether or not a pattern was matched
   */
  hears_regexp(tests, message) {
    for (var t = 0; t < tests.length; t++) {
      if (message.text) {

        // the pattern might be a string to match (including regular expression syntax)
        // or it might be a prebuilt regular expression
        var test = null;
        if (typeof (tests[t]) == 'string') {
          try {
            test = new RegExp(tests[t], 'i');
          } catch (err) {
            this.logger.error('Error in regular expression: ' + tests[t] + ': ' + err);
            return false;
          }
          if (!test) {
            return false;
          }
        } else {
          test = tests[t];
        }

        let match = message.text.match(test);
        if (match) {
          message.match = match;
          return true;
        }
      }
    }
    return false;
  }

  /**
   * changeEars - change the default matching function
   *
   * @param  {function} new_test a function that accepts (tests, message) and returns a boolean
   */
  changeEars(new_test) {
    this.hears_test = new_test;
  }

  hears(keywords, events, middleware_or_cb, cb) {

    // the third parameter is EITHER a callback handler
    // or a middleware function that redefines how the hear works
    var test_function = this.hears_test;
    if (cb) {
      test_function = middleware_or_cb;
    } else {
      cb = middleware_or_cb;
    }

    if (typeof (keywords) == 'string') {
      keywords = [keywords];
    }

    if (keywords instanceof RegExp) {
      keywords = [keywords];
    }

    if (typeof (events) == 'string') {
      events = events.split(/\,/g).map(function (str) {
        return str.trim();
      });
    }

    for (var e = 0; e < events.length; e++) {
      ((keywords, test_function) => {

        this.on(events[e], (bot, message) => {

          if (test_function && test_function(keywords, message)) {

            this.logger.debug('I HEARD', keywords);
            this.middleware.heard.run(bot, message, (err, bot, message) => {

              cb.apply(this, [bot, message]);
              this.trigger('heard_trigger', [bot, keywords, message]);
            });

            return false;
          }
        }, true);
      })(keywords, test_function);
    }

    return this;
  }

  on(event, cb, is_hearing) {
    this.logger.debug('Setting up a handler for', event);
    var events = (typeof (event) == 'string') ? event.split(/\,/g) : event;

    for (var e in events) {
      if (!this.events[events[e]]) {
        this.events[events[e]] = [];
      }
      this.events[events[e]].push({
        callback: cb,
        type: is_hearing ? 'hearing' : 'event'
      });
    }
    return this;
  }

  trigger(event, data) {
    if (this.events[event]) {

      var hearing = this.events[event].filter((e) => {
        return (e.type === 'hearing');
      });

      var handlers = this.events[event].filter((e) => {
        return (e.type !== 'hearing');
      });

      // first, look for hearing type events
      // these are always handled before normal event handlers
      for (var e = 0; e < hearing.length; e++) {
        var res = hearing[e].callback.apply(this, data);
        if (res === false) {
          return;
        }
      }

      // now, if we haven't already heard something,
      // fire the remaining event handlers
      if (handlers.length) {
        this.middleware.triggered.run(data[0], data[1], (err, bot, message) => {
          for (var e = 0; e < handlers.length; e++) {
            var res = handlers[e].callback.apply(this, data);
            if (res === false) {
              return;
            }
          }
        });
      }
    }
  }

  start() {
    this.loadSkills();

    this.loadRoutes();
  }

  processHttpReceive(req, res) {
    this.processReceive(req.body, {
      http: res
    });
  }

  processReceive(payload, response) {
    let bot = this.spawn({ response: response });
    this.ingest(bot, payload, response);
  }
};