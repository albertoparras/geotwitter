#!/usr/bin/env node
'use strict'; /*jslint node: true, es5: true, indent: 2 */
var amulet = require('amulet');
var Cookies = require('cookies');
var events = require('events');
var fs = require('fs');
var http = require('http-enhanced');
// var https = require('https');
var logger = require('winston');
var mime = require('mime');
var path = require('path');
var request = require('request');
var Router = require('regex-router');
var socketio = require('socket.io');
var sv = require('sv');
var tweet = require('twilight/tweet');
var util = require('util');

var argv = require('optimist').default({port: 3600, hostname: '127.0.0.1'}).argv;

amulet.set({minify: true, root: path.join(__dirname, 'templates')});
mime.default_type = 'text/plain';

var staticRoot = 'http://127.0.0.1:3601';
var static_buffers = [];

// set up some local static file handling.
var R = new Router();
R.get(/^\/favicon.ico/, function(m, req, res) { res.die(404, '404, chromebuddy.'); });
R.get(/^\/static\/(.+)/, function(m, req, res) {
  var filepath = m[1].replace(/\.{2,}/g, '');
  var content_type = mime.lookup(filepath);
  res.writeHead(200, {'Content-Type': content_type});

  if (static_buffers[filepath]) {
    res.end(static_buffers[filepath]);
  }
  else {
    fs.readFile(path.join('static', filepath), function (err, data) {
      if (err) throw err;
      static_buffers[filepath] = data;
      res.end(data);
    });
  }
});
// and render basic static page
R.default = function(m, req, res) {
  var ctx = {staticRoot: staticRoot};
  amulet.stream(['layout.mu', 'show.mu'], ctx).pipe(res);
};



// quickstart the simple server
var server = http.createServer(function(req, res) {
  // req.cookies = new Cookies(req, res);
  var started = Date.now();
  res.on('finish', function() {
    logger.info('duration', {url: req.url, method: req.method, ms: Date.now() - started});
  });

  R.route(req, res);
}).listen(argv.port, argv.hostname, function() {
  logger.info('GeoTwitter ready at ' + argv.hostname + ':' + argv.port);
});



// this is the bit that pulls in Twitter
var TwitterPipe = function() {
  events.EventEmitter.call(this);

  this.accounts = [];
  this.responses = [];
};
util.inherits(TwitterPipe, events.EventEmitter);
TwitterPipe.prototype.readAccounts = function(callback) {
  var self = this;
  // load account data from the local file called ~/.twitter
  sv.Parser.readToEnd('~/.twitter', {encoding: 'utf8'}, function(err, accounts) {
    self.accounts = accounts;
    callback(err, accounts);
  });
};
TwitterPipe.prototype.getOAuth = function() {
  // just pick out a random account
  var account = this.accounts[Math.random() * this.accounts.length | 0];
  return {
    consumer_key: account.consumer_key,
    consumer_secret: account.consumer_secret,
    token: account.access_token,
    token_secret: account.access_token_secret,
  };
};

TwitterPipe.prototype.add = function(form, callback) {
  // callback signature: function(err, response)
  // response also added to this.responses if it succeeds
  var self = this;
  var url = 'https://stream.twitter.com/1.1/statuses/filter.json';
  var req = request.post(url, {form: form, oauth: this.getOAuth()});

  req.on('response', function(res) {
    if (res.statusCode == 200) {
      self.responses.push(res);

      var tweet_stream = res.pipe(new tweet.JSONStoTweet())
      .on('data', function(tweet) {
        self.emit('data', tweet);
      })
      .on('error', function(err) {
        logger.error(err);
      });

      callback(null, res);
    }
    else {
      callback(res);
    }
  });
};
var twitter_pipe = new TwitterPipe();
twitter_pipe.readAccounts(function(err, accounts) {
  if (err) throw err;
  else logger.info('Read ' + accounts.length + ' accounts');
});

function add_default_filter(callback) {
  // var form = {locations: '-180,-90,180,90', stall_warnings: true}; // Global
  var form = {locations: '-126.3867,24.7668,-65.8301,49.4967', stall_warnings: true}; // USA
  // var form = {locations: '-91.5131,36.9703,-87.4952,42.5083', stall_warnings: true}; // IL

  logger.debug('Starting default filter.', form);
  twitter_pipe.add(form, function(err, res) {
    if (err) {
      logger.error('TwitterPipe add failed, retrying in 2s.');
      setTimeout(function() {
        add_default_filter(callback);
      }, 2000);
    }
    else {
      if (callback) {
        callback(err, res);
      }
    }
  });
}


// mostly pull things from the twitter pipe and push them over into all sockets
var io = socketio.listen(server);
// it will log every emitted payload at the default log level (crazy!)
io.set('log level', 1);
io.sockets.on('connection', function (socket) {
  logger.info('New socket connection established');

  socket.emit('greeting', {text: 'Hello.', connected: Object.keys(io.connected).length});

  logger.info('twitter_pipe.responses', {responses: twitter_pipe.responses.length});

  // if anybody is listening and we aren't already streaming tweets, start a default one
  if (twitter_pipe.responses.length === 0) {
    add_default_filter();
  }

  socket.on('chat', function (data) {
    logger.info('Socket emitted "chat" message:', data);
    // "broadcast." just means emit only to the others with connections
    // socket.broadcast.emit('chat', data);
    io.sockets.emit('chat', data);
  });
});

twitter_pipe.on('data', function(data) {
  // console.log('Emitting');
  io.sockets.emit('tweet', data);
});
