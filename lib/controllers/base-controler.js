var path = require('path');
var coreUtils = require('../core/utils');

module.exports = class BaseController {
  get botkitType() {
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
    return this.abbottCore.options.platforms[this.key];
  }

  get botkitConfig() {
    return this.abbottCore.options.sdks.botkit;
  }

  get nlpProcessor() {
    return this.abbottCore.nlpProcessor;
  }

  get webserver() {
    return this.abbottCore.webserver;
  }

  constructor(key, abbottCore, globals) {
    this.key = key;
    this.abbottCore = abbottCore;

    this.abbottCore.options.platforms[key] = this.abbottCore.options.platforms[key] || {};

    this.globals = globals || {};
    this.globals.__dirname = this.globals.__dirname || __dirname;

    if (this.abbottCore.options.storage) {
      this.config.storage = JSON.parse(JSON.stringify(this.abbottCore.options.storage));
    }
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

  start() {
    this.loadSkills();
  }
};