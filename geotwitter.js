#!/usr/bin/env node
'use strict'; /*jslint node: true, es5: true, indent: 2 */
var path = require('path');
var amulet = require('amulet');
var http = require('http-enhanced');
var Cookies = require('cookies');
var logger = require('./logger');
var argv = require('optimist').default({port: 3600, hostname: '127.0.0.1'}).argv;
var Router = require('regex-router');
var io = require('socket.io').listen(80);

amulet.set({minify: true, root: path.join(__dirname, 'templates')});

// Cookies.prototype.defaults = function() {
//   var expires = new Date(Date.now() + 31*86400 *1000); // 1 month
//   return {expires: expires};
// };

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

var R = new Router();
R.get(/^\/favicon.ico/, function(m, req, res) { res.die(404, 'No'); });
R.default = function(m, req, res) {

};

http.createServer(function(req, res) {
  req.cookies = new Cookies(req, res);

  var started = Date.now();
  res.on('finish', function() {
    logger.info('duration', {url: req.url, method: req.method, ms: Date.now() - started});
  });

  R.route(req, res);
}).listen(argv.port, argv.hostname, function() {
  logger.info('GeoTwitter ready at ' + argv.hostname + ':' + argv.port);
});
