var BotkitSlack = require('@abbott-platform/botkit/lib/SlackBot');
var debug = require('debug')('abbott-framework:slack');
var path = require('path');

var BaseController = require('../base-controler');

module.exports = class SlackController extends BaseController {
  get botkitType() {
    return 'slack';
  }

  get hearsMentionEvents() {
    return [ 'direct_mention', 'mention' ];
  }

  get hearsMessageEvents() {
    return [ 'direct_message', 'direct_mention', 'mention', 'interactive_message_callback' ];
  }

  constructor(abbottCore) {
    debug('Initializing controller class...');
    super('slack', abbottCore, {
      __dirname: __dirname
    });

    this.config.clientId = this.config.clientId || null;
    this.config.clientSecret = this.config.clientSecret || null;
    this.config.scopes = this.config.scopes || ['bot'];

    this.config.web = this.config.web || {};
    this.config.web.loginSuccessRoute = this.config.web.loginSuccessRoute || '/slack/login_success.html';
    this.config.web.loginErrorRoute = this.config.web.loginErrorRoute || '/slack/login_error.html';

    if ((!this.config) || 
        (!this.config.clientId) || 
        (!this.config.clientSecret)) {
      throw this.usage_tip();
    }

    this.initializeController();
  }

  getBotkitOptions() {
    let botOpt = super.getBotkitOptions();

    botOpt.clientId = this.config.clientId;
    botOpt.clientSecret = this.config.clientSecret;
    botOpt.scopes = this.config.scopes;
    
    return botOpt;
  }

  initializeController() {
    // Create the Botkit controller, which controls all instances of the bot.
    this.controller = BotkitSlack(this.getBotkitOptions());
    this.controller.webserver = this.webserver;
    
    this.controller.startTicking();

    this.controller.createOauthEndpoints(this.webserver, (err, req, res) => {
      if (err) {
        return res.redirect(this.config.web.loginErrorRoute);
      } else {
        res.cookie('abbot-slack-team_id', req.identity.team_id);
        res.redirect(this.config.web.loginSuccessRoute);
      }
    }, {
      rootRoute: '/slack'
    });

    this.controller.createWebhookEndpoints(this.webserver);

    // no longer necessary since slack now supports the always on event bots
    // // Set up a system to manage connections to Slack's RTM api
    // // This will eventually be removed when Slack fixes support for bot presence
    // var rtm_manager = require(__dirname + '/components/rtm_manager.js')(controller);
    //
    // // Reconnect all pre-registered bots
    // rtm_manager.reconnect();

    this.loadComponents(path.join(__dirname, 'components'));
  }

  usage_tip() {
    var strReturn = '';
    strReturn += '~~~~~~~~~~';
    strReturn += '\n';
    strReturn += 'Botkit Starter Kit';
    strReturn += '\n';
    strReturn += 'Execute your bot application like this:';
    strReturn += '\n';
    strReturn += 'clientId=<MY SLACK CLIENT ID> clientSecret=<MY CLIENT SECRET> PORT=3000 node bot.js';
    strReturn += '\n';
    strReturn += 'Get Slack app credentials here: https://api.slack.com/apps';
    strReturn += '\n';
    strReturn += '~~~~~~~~~~';
    return strReturn;
  }
};