module.exports = class BaseProcessor {
  get config() {
    return this.abbottCore.options.nlp[this.key];
  }

  constructor(key, abbottCore) {
    this.key = key;
    this.abbottCore = abbottCore;

    this.abbottCore.options.nlp[key] = this.abbottCore.options.nlp[key] || {};
  }

  process(message, bot) {
  }

  processEvent(message, bot) {
  }

  eventRequest(eventData) {    
  }
};