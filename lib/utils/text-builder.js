module.exports = class TextBuilder {
  constructor() {
    this.text = '';
  }

  add() {
    if ((arguments) && (arguments.length > 0)) {
      for (let i = 0; i < arguments.length; i++) {
        this.text += String(arguments[i]);
      }
    }
    return this;
  }

  newLine() {
    this.add('\n');
    return this;
  }

  toString() {
    return this.text;
  }
};
