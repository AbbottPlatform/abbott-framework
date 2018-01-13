var path = require('path');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var querystring = require('querystring');

const ExpressWeberver = class {
  get logger() {
    if (!this.__logger) {
      this.__logger = this.modules.resolveFor('logging', 'abbott-framework:webserver');
    }

    return this.__logger;
  }

  get webserverRouteLoader() {
    return this.__webserverRouteLoader;
  }

  constructor(moduleLoader, options) {
    this.modules = moduleLoader;
    
    this.options = options || {};
    this.options.baseRoutes = this.options.baseRoutes || [];

    this.options.port = this.options.port || 3000;

    this.server = express();
    this.server.use(bodyParser.json());
    this.server.use(bodyParser.urlencoded({ extended: true }));

    this.serverRoutes = {};
  }

  loadInitialRoutes() {
    this.loadRoute(path.join(__dirname, '../../../webserver/routes'));

    if (this.options.baseRoutes.length > 0) {
      this.options.baseRoutes.forEach((item) => {
        this.loadRoute(item);
      });
    }
  }

  loadRoute(routeOpts) {
    let baseRouteDir = null;
    let baseRoutePath = null;

    if (typeof routeOpts === 'string' || routeOpts instanceof String) {
      baseRouteDir = routeOpts;
    } else {
      baseRouteDir = routeOpts.baseDir || null;
      baseRoutePath = routeOpts.routePath || null;
    }

    if (!this.serverRoutes[baseRouteDir]) {
      this.serverRoutes[baseRouteDir] = this.webserverRouteLoader(this, baseRouteDir, baseRoutePath, routeOpts.extraParams);
    }
  }

  prepare() {
    this.__webserverRouteLoader = require('./webserver-route-loader');

    this.loadInitialRoutes();
  }

  start() {
    return new Promise((resolve, reject) => {
      if (!this.serverListener) {
        this.serverListener = this.server.listen(this.options.port, () => {
          this.logger.debug('Webserver configured and listening at http://localhost:' + this.options.port);
          resolve();
        });    
      } else {
        resolve();
      }
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      try {
        this.logger.debug('Closing webserver...');
        this.serverListener.close(() => {
          this.logger.debug('Webserver closed!');
          this.serverListener = null;
          resolve();
        });
      } catch(ex) {
        reject(ex);
      }
    });
  }

};

module.exports = {
  def: {
    name: 'express',
    description: 'ExpressJS abbott webserver module',
    type: 'webserver',
    version: '1.0.0',
    instanceMode: 'single' /* single, new */
  },
  build: function () {
    return new ExpressWeberver(...arguments);
  }
};
