const fs = require('fs');
const path = require('path');

module.exports = function (webserver, router) {
  const logger = require('../../../logging')('abbott-framework:webserver(/bot)');
  logger.debug('route loaded!');
  
  var mimeImage = {
    gif: 'image/gif',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml'
  };

  var bot_assets_dir = path.join(process.cwd(), 'bot');
  
  router.get('/avatar', (req, res) => {
    var file = path.join(bot_assets_dir, 'avatar.png');
    if (file.indexOf(bot_assets_dir + path.sep) !== 0) {
      return res.status(403).end('Forbidden');
    }
    var type = mimeImage[path.extname(file).slice(1)] || 'text/plain';
    var s = fs.createReadStream(file);
    s.on('open', function () {
      res.set('Content-Type', type);
      s.pipe(res);
    });
    s.on('error', function () {
      res.set('Content-Type', 'text/plain');
      res.status(404).end('Not found');
    });
  });
};
