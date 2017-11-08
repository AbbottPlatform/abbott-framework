const fs = require('fs');
const path = require('path');

module.exports = class {
  static getDirectories(srcpath) {
    if (fs.existsSync(srcpath)) {
      return fs.readdirSync(srcpath)
        .filter((file) => fs.lstatSync(path.join(srcpath, file)).isDirectory());
    }

    return [];
  }
};
