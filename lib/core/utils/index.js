var fs = require('fs');

class Utils {
  requireIfExits(path) {
    return (fs.existsSync(path)) ? require(path) : null;
  }
}

module.exports = new Utils();