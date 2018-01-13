const log4js = require('log4js');

module.exports = (libPackageName) => {  
  if ((!libPackageName) || (libPackageName.length <= 0))
    libPackageName = '';

  let logger = log4js.getLogger(libPackageName);

  logger.level = process.env.ABBOTT_LOG_LEVEL || 'ERROR';

  return logger;
};