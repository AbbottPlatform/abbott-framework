var path = require('path');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var querystring = require('querystring');
var debug = require('debug')('abbott-framework:webserver');

module.exports = function (options) {
    options = options || {};

    var webserver = express();

    webserver.use(bodyParser.json());
    webserver.use(bodyParser.urlencoded({ extended: true }));
    
    var bot_assets_dir = path.join(process.cwd(), 'bot');

    var mime = {
        gif: 'image/gif',
        jpg: 'image/jpeg',
        png: 'image/png',
        svg: 'image/svg+xml'
    };

    webserver.get('/bot/avatar', (req, res) => {
        var file = path.join(bot_assets_dir, 'avatar.png');
        if (file.indexOf(bot_assets_dir + path.sep) !== 0) {
            return res.status(403).end('Forbidden');
        }
        var type = mime[path.extname(file).slice(1)] || 'text/plain';
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

    webserver.listen(process.env.express_port || 3000, null, function () {
        debug('Express webserver configured and listening at http://localhost:' + process.env.express_port || 3000);
    });

    return webserver;
};
