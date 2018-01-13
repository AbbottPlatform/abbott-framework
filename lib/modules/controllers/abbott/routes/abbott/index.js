const path = require('path');

module.exports = function (webserver, router, controller) {
  const logger = controller.modules.resolveFor('logging', 'abbott-framework:controllers:botkit:routes(/abbott)');
  
  router.post('/receive', function (req, res) {
    controller.processHttpReceive(req, res);
  });

  logger.debug('route loaded!');
};
