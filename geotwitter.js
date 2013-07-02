#!/usr/bin/env node
'use strict'; /*jslint node: true, es5: true, indent: 2 */
var amulet = require('amulet');
var Cookies = require('cookies');
var events = require('events');
var fs = require('fs');
var http = require('http-enhanced');
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



// set up some local static file handling.
var R = new Router();
R.get(/^\/favicon.ico/, function(m, req, res) { res.die(404, '404, chromebuddy.'); });
R.get(/^\/static\/(.+)/, function(m, req, res) {
  var filepath = m[1].replace(/\.{2,}/g, '');
  var content_type = mime.lookup(filepath);
  res.writeHead(200, {'Content-Type': content_type});
  fs.createReadStream(path.join('static', filepath)).pipe(res);
});
// and render basic static page
R.default = function(m, req, res) {
  var ctx = {
    // data: []
  };
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
};
util.inherits(TwitterPipe, events.EventEmitter);
TwitterPipe.prototype.add = function(oauth, form) {
  var self = this;
  return request.post('https://stream.twitter.com/1.1/statuses/filter.json', {form: form, oauth: oauth})
  .pipe(new tweet.JSONStoTweet())
  .on('data', function(tweet) {
    self.emit('data', tweet);
  })
  .on('error', function(err) {
    logger.error(err);
  });
};
var twitter_pipe = new TwitterPipe();
// and init the Twitter stuff from a local file called ~/.twitter
sv.Parser.readToEnd('~/.twitter', {encoding: 'utf8'}, function(err, accounts) {
  var account = accounts[Math.random() * accounts.length | 0];
  var oauth = {
    consumer_key: account.consumer_key,
    consumer_secret: account.consumer_secret,
    token: account.access_token,
    token_secret: account.access_token_secret,
  };
  var form = {locations: '-180,-90,180,90', stall_warnings: true};
  twitter_pipe.add(oauth, form);
});


// mostly pull things from the twitter pipe and push them over into all sockets
var io = socketio.listen(server);
// it will log every emitted payload at the default log level (crazy!)
io.set('log level', 1);
io.sockets.on('connection', function (socket) {
  socket.emit('news', { greeting: 'hello there' });
  twitter_pipe.on('data', function(data) {
    socket.emit('tweet', data);
  });
  socket.on('shout', function (data) {
    // socket.emit('news', { hello: 'world' });
    var data_upper = (data + '').toUpperCase();
    io.sockets.emit('news', data_upper);
  });
});
