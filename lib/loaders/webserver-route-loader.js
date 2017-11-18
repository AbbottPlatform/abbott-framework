const fs = require('fs');
const path = require('path');
const express = require('express');
const fsUtils = require('../utils/fs');

module.exports = function (webserver, baseDir = __dirname, routePath = null) {
  const logger = require('../logging')('abbott-framework:webserver-route-loader');
  let server = webserver.server;
  
  var parentRoute = server;

  if (routePath) {
    parentRoute = express.Router();
    server.use(routePath, parentRoute);
  }

  let moduleLoaded = null;
  try {
    moduleLoaded = require(baseDir);
  } catch(err) {}

  if (moduleLoaded) {
    loadSubRoute(moduleLoaded, parentRoute, routePath);
  }

  let routeDirectories = null;
  try {
    let baseDirStats = fs.lstatSync(baseDir);
    if (baseDirStats.isDirectory()) {
      routeDirectories = fsUtils.getDirectories(baseDir);
    }
  } catch (err) {}
  
  if (routeDirectories) {
    routeDirectories.forEach((routeApiItem) => {
      logger.info(`directories: (${baseDir} / ${routeApiItem})`);
  
      loadSubRoute(require(path.join(baseDir, routeApiItem)), parentRoute, routePath, routeApiItem);
    });
  }

  function loadSubRoute(apiSubRoute, parentRoute, routePath, routeApiItem) {
    if (apiSubRoute) {
      let subPath = routePath || '/';
      let apiRoutePath = path.join(subPath, routeApiItem || '');
      let router = express.Router();

      apiSubRoute(webserver, router);

      parentRoute.use(apiRoutePath, router);
      logger.info(`subroute loaded (${apiRoutePath})!`);
    }
  }
  
  return parentRoute;
};
