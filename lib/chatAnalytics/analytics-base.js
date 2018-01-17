const logging = require('../logging');

module.exports = class {
  get logger() {
    if (!this.__logger) {
      this.__logger = logging(`abbott-framework:analytics`);
    }
    return this.__logger;
  }

  get abbottController() {
    return this.__abbottController;
  }

  get options() {
    return this.__options;
  }

  constructor(abbottController, options) {    
    this.__abbottController = abbottController;
    this.__options = options;
  }

  sendUserMessageAnayltics(message, userId, intent = null) {
  }

  sendBOTMessageAnayltics(message, intent = null) {
  }
};
