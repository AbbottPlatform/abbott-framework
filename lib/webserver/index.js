var path = require('path');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var querystring = require('querystring');
const logging = require('../logging');
const { webserverRouteLoader } = require('../loaders');

module.exports = class {
  get logger() {
    if (!this.__logger) {
      this.__logger = logging(`abbott-framework:webserver`);    
    }
    return this.__logger;
  }

  constructor(options) {
    this.options = options || {};

    this.server = express();
    this.server.use(bodyParser.json());
    this.server.use(bodyParser.urlencoded({ extended: true }));

    this.serverRoutes = webserverRouteLoader(this.server, path.join(__dirname, 'routes'));
  }

  start() {
    return new Promise((resolve, reject) => {
      this.serverListener = this.server.listen(process.env.express_port || 3000, () => {
        this.logger.debug('Webserver configured and listening at http://localhost:' + process.env.express_port || 3000);
        resolve();
      });    
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      try {
        this.logger.debug('Closing webserver...');
        this.serverListener.close(() => {
          this.logger.debug('Webserver closed!');
          resolve();
        });
      } catch(ex) {
        reject(ex);
      }
    });
  }

};
/*
module.exports = function (options) {
  var logger = logging(`abbott-framework:webserver`);

  options = options || {};

  var webserver = express();

  webserver.use(bodyParser.json());
  webserver.use(bodyParser.urlencoded({ extended: true }));

  var webserverRoutes = webserverRouteLoader(webserver, path.join(__dirname, 'routes'));

  // var bot_assets_dir = path.join(process.cwd(), 'bot');

  // var mimeImage = {
  //   gif: 'image/gif',
  //   jpg: 'image/jpeg',
  //   png: 'image/png',
  //   svg: 'image/svg+xml'
  // };

  // webserver.get('/bot/avatar', (req, res) => {
  //   var file = path.join(bot_assets_dir, 'avatar.png');
  //   if (file.indexOf(bot_assets_dir + path.sep) !== 0) {
  //     return res.status(403).end('Forbidden');
  //   }
  //   var type = mimeImage[path.extname(file).slice(1)] || 'text/plain';
  //   var s = fs.createReadStream(file);
  //   s.on('open', function () {
  //     res.set('Content-Type', type);
  //     s.pipe(res);
  //   });
  //   s.on('error', function () {
  //     res.set('Content-Type', 'text/plain');
  //     res.status(404).end('Not found');
  //   });
  // });

  webserver.listen(process.env.express_port || 3000, null, function () {
    logger.debug('Express webserver configured and listening at http://localhost:' + process.env.express_port || 3000);
  });

  return webserver;
};
*/
