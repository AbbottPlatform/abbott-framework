const fs = require('fs');
const path = require('path');

module.exports = function (webserver, router, controller) {
  const logger = require('../../../../logging')('abbott-framework:controllers:botkit:routes(/abbott)');
  
  router.post('/receive', function (req, res) {
    controller.processHttpReceive(req, res);
  });

  logger.debug('route loaded!');
};
