const fs = require('fs');
const path = require('path');
const express = require('express');
const fsUtils = require('../utils/fs');

module.exports = function (webserver, baseDir = __dirname, routePath = null) {
  const logger = require('../logging')('abbott-framework:webserver-route-loader');
  
  var parentRoute = webserver;

  if (routePath) {
    parentRoute = express.Router();
    webserver.use(routePath, parentRoute);
  }

  var routeDirectories = fsUtils.getDirectories(baseDir);
  
  routeDirectories.forEach((routeApiItem) => {
    logger.info(`directories: (${baseDir} / ${routeApiItem})`);

    var apiSubRoute = require(path.join(baseDir, routeApiItem));
    if (apiSubRoute) {
      let subPath = routePath || '/';
      let apiRoutePath = path.join(subPath, routeApiItem);
      let router = express.Router();

      apiSubRoute(webserver, router);

      parentRoute.use(apiRoutePath, router);
      logger.info(`subroute loaded (${apiRoutePath})!`);
    }
  });
  
  return parentRoute;
};
