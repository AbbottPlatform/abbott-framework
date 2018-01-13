class DialogContext {
  get name() {
    return this._name;
  }

  get vars() {
    return this._vars;
  }

  constructor(name = 'default') {
    this._name = name;
    this._vars = {};
  }

  // _validateContextKeys(contextKeys) {
  //   return true;
  // }

  // _setKey(contextKeys) {
  //   if (this._validateContextKeys(contextKeys)) {
  //     this._key = buildKey(contextKeys);
  //   }
  // }

  setVar(key, value) {
    this._vars[key] = value;
  }
}

function buildKey(sessionKey) {
  let _key = '';

  for (var prop in sessionKey) {
    if (sessionKey.hasOwnProperty(prop)) {
      _key += prop + ':' + sessionKey[prop] + '|';
    }
  }

  return _key;
}

module.exports = class DialogContextManager {
  constructor() {
    this._contexts = {};
  }

  setContext(sessionKey, contextName = 'default') {
    let _key = buildKey(sessionKey);

    let context = new DialogContext(contextName);
    this._contexts[_key] = this._contexts[_key] || {};

    this._contexts[_key][context.name] = context;

    return context;
  }

  updateContext() {
  }

  deleteContext(sessionKey, contextName = 'default') {
    let _key = buildKey(sessionKey);

    if ((this._contexts[_key]) && (this._contexts[_key][contextName])) {
      delete this._contexts[_key][contextName];
    }
  }

  getContext(sessionKey, contextName = 'default') {
    let _key = buildKey(sessionKey);

    if ((this._contexts[_key]) && (this._contexts[_key][contextName])) {
      return this._contexts[_key][contextName];
    }

    return null;
  }

  listContexts() {
  }
};
