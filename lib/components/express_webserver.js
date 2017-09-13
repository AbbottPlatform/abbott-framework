var express = require('express');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var debug = require('debug')('abbott-framework:webserver');

module.exports = function (options) {
    options = options || {};

    var webserver = express();

    webserver.use(bodyParser.json());
    webserver.use(bodyParser.urlencoded({ extended: true }));
    
    webserver.listen(process.env.express_port || 3000, null, function () {
        debug('Express webserver configured and listening at http://localhost:' + process.env.express_port || 3000);
    });

    return webserver;
};
