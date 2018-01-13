module.exports = class {
  constructor(config) {
    this.config = config || {};
    this.config.moduleTypes = config.moduleTypes || {};
    this.config.moduleTypes.generic = config.moduleTypes.generic || {};

    this.modules = {};
  }

  load(module) {
    let args = null;
    
    if (arguments.length > 1) {
      args = Array.prototype.slice.call(arguments, 1);
    }    
    
    return new Promise((resolve, reject) => {
      let moduleObj = require(module);
      let modType = moduleObj.def.type || 'generic';

      moduleObj.def.instanceMode = moduleObj.def.instanceMode || 'new';

      let modTypeCfg = this.config.moduleTypes[modType];

      if (!modTypeCfg) {
        return reject(new Error('Invalid module type'));
      }

      if ((modTypeCfg) && (modTypeCfg.maxCount)) {
        let registeredModulesCount = this.hasFor(modType);

        if (registeredModulesCount > modTypeCfg.maxCount) {
          return reject(new Error(`Reached max modules registrations for the type "${modType}"!`));
        }
      }

      if (args) {
        moduleObj.defaultArgs = args;
      }

      this.modules[modType] = this.modules[modType] || {};

      this.modules[modType][moduleObj.def.name] = moduleObj;

      resolve(moduleObj.def);
    });
  }

  hasFor(moduleType) {
    let modulesCount = 0;

    if (this.modules[moduleType]) {
      modulesCount = Object.keys(this.modules[moduleType]).length;
    }

    return modulesCount;
  }

  resolveFirst(moduleType, params, acceptFilterCallback = null) {
    acceptFilterCallback = acceptFilterCallback || ((moduleObj, index) => { return (index === 0); });

    let modInstance = null;

    this._iterateModules(moduleType,
      (moduleObj, index) => {
        if (acceptFilterCallback(moduleObj, index)) {
          modInstance = this._getModuleInstance(moduleObj, params);
        }
      }, acceptFilterCallback);

    return modInstance;
  }

  resolveFor(moduleType, params, mapCallback = null, filterCallback = null) {
    let moduleInstances = [];

    this._iterateModules(moduleType,
      (moduleObj) => {
        if ((!filterCallback) || (filterCallback(moduleObj))) {
          let modInstance = this._getModuleInstance(moduleObj, params);
          
          if (mapCallback) {
            modInstance = mapCallback(modInstance, moduleObj.def);
          }

          moduleInstances.push(modInstance);  
        }
      }, null);

    if (moduleInstances.length === 1) {
      return moduleInstances[0];
    } else if (moduleInstances.length > 1) {
      return moduleInstances;
    } else {
      return null;
    }
  }

  _iterateModules(moduleType, actionCallback, breakDecisionCallback = null) {
    if (this.modules[moduleType]) {
      let index = 0;
      for (var key in this.modules[moduleType]) {
        if (this.modules[moduleType].hasOwnProperty(key)) {
          let moduleObj = this.modules[moduleType][key];

          if (actionCallback) {
            actionCallback(moduleObj, index);
          }

          if ((breakDecisionCallback) && (breakDecisionCallback(moduleObj, index))) {
            break;
          }
          index++;
        }
      }
    }
  }

  _getModuleInstance(moduleObj, params) {
    let modInstance = null;

    if ((moduleObj.defaultArgs) && (!params)) {
      params = moduleObj.defaultArgs;
    }

    let instanceArgs = [ this ];

    if (Array.isArray(params)) {
      instanceArgs = instanceArgs.concat(params);
    } else {
      instanceArgs.push(params);
    }

    if (moduleObj.def.instanceMode === 'single') {
      if (!moduleObj.def.instance) {
        moduleObj.def.instance = moduleObj.build(...instanceArgs);

        if (moduleObj.def.instance.prepare) {
          moduleObj.def.instance.prepare();
        }
      }

      modInstance = moduleObj.def.instance;
    } else {
      modInstance = moduleObj.build(...instanceArgs);

      if (modInstance.prepare) {
        modInstance.prepare();
      }
    }

    modInstance.moduleDef = moduleObj.def;

    return modInstance;
  }
};
