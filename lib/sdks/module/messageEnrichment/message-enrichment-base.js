module.exports = class {
  get modules() {
    return this.__modules;
  }

  get controller() {
    return this.__controller;
  }

  get logger$() {
    if (!this.__logger) {
      this.__logger = this.modules.resolveFor('logging', `enrichments:${this.moduleDef.name}`);
    }

    return this.__logger;
  }

  constructor(moduleLoader, controller) {
    this.__modules = moduleLoader;
    this.__controller = controller;
  }

  prepare() {
  }

  process(message) {
    throw new Error('Method "process" is not implemented on "message-handler"!');
  }
};
