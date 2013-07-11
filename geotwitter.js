#!/usr/bin/env node
'use strict'; /*jslint node: true, es5: true, indent: 2 */
var amulet = require('amulet');
var fs = require('fs');
var http = require('http-enhanced');
var logger = require('winston');
var mime = require('mime');
var path = require('path');
var sv = require('sv');
var socketio = require('socket.io');
var util = require('util');

var Cookies = require('cookies');
var Router = require('regex-router');
var TwitterPool = require('./twitter-pool');

var argv = require('optimist').default({
  port: 3600,
  hostname: '127.0.0.1',
  static_port: '3601',
  socketio_port: '3600',
  accounts: '~/.twitter',
}).argv;

// minify: true,
amulet.set({root: path.join(__dirname, 'templates')});
mime.default_type = 'text/plain';

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
  var ctx = {
    hostname: argv.hostname,
    static_port: argv.static_port,
    socketio_port: argv.socketio_port,
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
var twitter_pool = new TwitterPool();
sv.Parser.readToEnd(argv.accounts, {encoding: 'utf8'}, function(err, accounts) {
  if (err) throw err;
  twitter_pool.accounts = accounts;
  logger.info('Read ' + accounts.length + ' accounts');
});

var BOUNDS = {
  // sw.lon,sw.lat,ne.lon,ne.lat
  global: '-180,-90,180,90',
  usa: '-126.3867,24.7668,-65.8301,49.4967',
  illinois: '-91.5131,36.9703,-87.4952,42.5083'
};

// mostly pull things from the twitter pipe and push them over into all sockets
var io = socketio.listen(server);
// it will log every emitted payload at the default log level (crazy!)
io.set('log level', 1);
io.sockets.on('connection', function (socket) {
  logger.info('New socket connection established');

  socket.emit('greeting', {text: 'Hello.', connected: Object.keys(io.connected).length});


  logger.info('twitter_pool.responses', {responses: twitter_pool.responses.length});

  function ready() {
    var current_req = twitter_pool.responses[0].request;
    logger.info('current request', current_req.form);
    socket.emit('filter', current_req.form);
  }

  // if anybody is listening and we aren't already streaming tweets, start a default one
  if (twitter_pool.responses.length === 0) {
    var form = {locations: BOUNDS.illinois, stall_warnings: true};
    logger.debug('Starting default filter.', form);
    twitter_pool.addPersistent(form, ready);
  }
  else {
    ready();
  }

  socket.on('filter', function (form) {
    logger.info('filtering', form);
    twitter_pool.removeAll();

    // var form = {stall_warnings: true};
    // data.type should be either 'locations' or 'track'
    // form[data.type] = data.query;
    twitter_pool.addPersistent(form);
    io.sockets.emit('filter', form);
  });

  socket.on('chat', function (data) {
    logger.info('Socket emitted "chat" message:', data);
    // "broadcast." just means emit only to the others with connections
    // socket.broadcast.emit('chat', data);
    io.sockets.emit('chat', data);
  });
});

twitter_pool.on('data', function(data) {
  io.sockets.emit('tweet', data);
});
