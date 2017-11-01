const logging = require('../logging');

/**
 * NLP Processor base class.
 * @name BaseProcessor
 * @class
 * @param {string} key
 * @param {Object} abbottCore
 */
module.exports = class {
  get logger() {
    if (!this.__logger) {
      this.__logger = logging(`abbott-framework:nlp-processors:${this.key}`);
    }
    return this.__logger;
  }

  get config() {
    return this.abbottCore.options.nlp[this.key];
  }

  constructor(key, abbottCore) {
    this.key = key;
    this.abbottCore = abbottCore;

    this.abbottCore.options.nlp[key] = this.abbottCore.options.nlp[key] || {};

    this.logger.debug('BaseProcessor -> Initialized');
  }

  process(message, bot) {
  }

  processEvent(message, bot) {
  }

  eventRequest(eventData) {    
  }
};