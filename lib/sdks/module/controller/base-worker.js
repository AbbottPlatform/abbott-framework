/**
 * Worker Base Class for chat engines, represents the conversation instance for the current request.
 * @name BaseWorker
 * @class
 */
module.exports = class BaseWorker {
  get logger() {
    if (!this.__logger) {
      this.__logger = this.modules.resolveFor('logging', `abbott-framework:controller:worker:${this.type}`);
    }
    return this.__logger;
  }

  get type() {
    return this.controller.type;
  }

  get modules() {
    return this.controller.modules;
  }

  /**
   * Creates an instance of BaseWorker.
   * @param {BaseController} controller 
   * @param {any} config 
   */
  constructor(controller, config) {
    this.controller = controller;
    this.config = config;
  }

  sendMessage(msg) {
    if ((this.config.response) && (this.config.response.http)) {
      this.config.response.http.status(200).json({ 
        ok: true,
        message: msg
      });
    }
  }

  //TODO: turn it generic
  send (message, cb) {
    //TODO: Need to discover why it is been called twince by (tick)
    // if (bot.response.finished) return;

    var msgArgs = [];

    msgArgs.push(message);
    
    let fnResponse = null;

    if ((message.endConversation) && (!message.expectUserResponse)) {
      fnResponse = this.sendMessage;
    } else {
      fnResponse = this.sendMessage;
    }

    this.logger.debug('SAY', msgArgs);
    fnResponse.apply(this, msgArgs);
    
    if (cb) cb();
  }

  say(message, cb) {
    var platform_message = {};
    this.controller.middleware.send.run(this, message, (err, worker, message) => {
      if (err) {
        this.logger.error('An error occured in the send middleware:: ' + err);
      } else {
        this.controller.middleware.format.run(this, message, platform_message, (err, worker, message, platform_message) => {
          if (err) {
            this.logger.error('An error occured in the format middleware: ' + err);
          } else {
            worker.send(platform_message, cb);
          }
        });
      }
    });
    this.logger.debug('SAY:', message);
  }
  
  ask(message, cb) {
    this.logger.debug('REPLY WITH QUESTION:', message);
    this.say(message, cb);
    // botkit.startConversation(message, function (convo) {
    //   convo.ask(question, cb);
    // });
  }

  // TODO:
  // reply(src, resp) {
  //   this.logger.debug('REPLY:', resp);
  // }

  findConversation(message, cb) {
    this.logger.debug('DEFAULT FIND CONVO');
    cb(null);
  }

};  
