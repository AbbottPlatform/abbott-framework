const log4js = require('log4js');

const logger = (moduleLoader, logSourceName) => {  
  if ((!logSourceName) || (logSourceName.length <= 0))
    logSourceName = '';

  let logger = log4js.getLogger(logSourceName);

  logger.level = process.env.ABBOTT_LOGGING_LEVEL || 'ERROR';

  return logger;
};

module.exports = {
  def: {
    name: 'log4js',
    description: 'log4js abbott logging module',
    type: 'logging',
    version: '1.0.0'
  },
  build: function () {
    return logger(...arguments);
  }
};
