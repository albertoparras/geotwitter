/*
 * heatmap.js 0.2 Leaflet overlay
 *
 * Copyright (c) 2012, Dominik Moritz
 * Dual-licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and the Beerware (http://en.wikipedia.org/wiki/Beerware) license.
 *
 * Attribution
 *  - Some snippets for canvas layer: https://gist.github.com/2566567
 *  - QuadTree: https://github.com/jsmarkus/ExamplesByMesh/tree/master/JavaScript/QuadTree
 */

"use strict"; /*jslint indent: 2, browser: true */ /*globals _, $, L, QuadTree */

/** Types:

Rectangle: {
  x: Number,
  y: Number,
  width: Number,
  height: Number
}

*/

function Wied_heatmap() {
  var heatmap_config = {
    radius: 1000, // why!
    // element: 'heatmapEl',
    // visible: true,
    opacity: 80, // percent
    debug: true,
    gradient: {
      0.45: 'rgb(0,0,255)',
      0.55: 'rgb(0,255,255)',
      0.65: 'rgb(0,255,0)',
      0.95: 'yellow',
      1.0: 'rgb(255,0,0)'
    }
  };
  // return heatmapFactory.create
  var heatmap = heatmapFactory.create(heatmap_config);
  return new L.TileLayer.HeatMap(heatmap_config);
}

/** QuadTree wants a rectangle, not a L.LatLngBounds class. */
L.LatLngBounds.prototype.toRectangle = function() {
  return {
    x: this.getSouthWest().lng,
    y: this.getSouthWest().lat,
    width: this.getNorthEast().lng - this.getSouthWest().lng,
    height: this.getNorthEast().lat - this.getSouthWest().lat
  };
};

L.TileLayer.HeatMap = L.TileLayer.Canvas.extend({
  options: {
    debug: false,
    opacity: 0.9,  // opactity is between 0 and 1, not in percent
    radius: {
      value: 20,
      absolute: false  // true: radius in meters, false: radius in pixels
    }
  },

  initialize: function (options, data) {
    var self = this;
    L.Util.setOptions(this, options);

    this.max_value = 0;
    // this.latLngBounds = null;
    this.store = new QuadTree(this.latLngBounds.toRectangle(), false, 6, 6);

    this.drawTile = function (tile, tilePoint, zoom) {
      var ctx = {
        canvas: tile,
        tilePoint: tilePoint,
        zoom: zoom
      };

      if (self.options.debug) {
        self._debugInfo(ctx);
      }
      this._draw(ctx);
    };
  },

  // Insert data point into quadtree and redraw heatmap canvas
  addData: function(latLng, value) {
    // latLng must be a single L.LatLng object
    // value is optional and defaults to 1
    var self = this;

    // set default value and update the heatmap's max_value
    if (value === undefined) value = 1;
    this.max_value = Math.max(this.max_value, value);

    if (this.latLngBounds) {
      this.latLngBounds.extend(latLng);
    }
    else {
      this.latLngBounds = new L.LatLngBounds([latLng]);
      this.store.root.bounds = this.latLngBounds.toRectangle();
    }

    this.store.insert({
      x: latLng.lon,
      y: latLng.lat,
      value: value
    });

    this.redraw();
  },

  _createTileProto: function () {
    var proto = this._canvasProto = L.DomUtil.create('div', 'leaflet-tile');

    var tileSize = this.options.tileSize;
    proto.style.width = tileSize+"px";
    proto.style.height = tileSize+"px";
    proto.width = tileSize;
    proto.height = tileSize;
  },


  /**
   * Transforms coordinates to tile space
   */
  _tilePoint: function (ctx, coords) {
    // start coords to tile 'space'
    var s = ctx.tilePoint.multiplyBy(this.options.tileSize);

    // actual coords to tile 'space'
    var p = this._map.project(new L.LatLng(coords[1], coords[0]));

    // point to draw
    var x = Math.round(p.x - s.x);
    var y = Math.round(p.y - s.y);
    return [x, y];
  },

  _getLatRadius: function () {
    return (this.options.radius.value / 40075017) * 360;
  },

  _getLngRadius: function (point) {
    return this._getLatRadius() / Math.cos(L.LatLng.DEG_TO_RAD * point.lat);
  },

  /*
   * The idea is to create two points and then get
   * the distance between the two in order to know what
   * the absolute radius in this tile could be.
   */
  projectLatlngs: function (point) {
    var lngRadius = this._getLngRadius(point),
      latlng2 = new L.LatLng(point.lat, point.lng - lngRadius, true),
      p = this._map.latLngToLayerPoint(latlng2),
      q = this._map.latLngToLayerPoint(point);
    return Math.max(Math.round(q.x - p.x), 1);
  },

  _draw: function (ctx) {
      if (!this._quad || !this._map) {
          return;
      }

      var self = this,
          options = this.options,
          tile = ctx.canvas,
          tileSize = options.tileSize,
          radiusValue = this.options.radius.value;

      var localXY, value, pointsInTile = [];

      var nwPoint = ctx.tilePoint.multiplyBy(tileSize),
          sePoint = nwPoint.add(new L.Point(tileSize, tileSize));

      // Set the radius for the tile, if necessary.
      // The radius of a circle can be either absolute in pixels or in meters
      // The radius in pixels is not the same on the whole map.
      if (options.radius.absolute) {
          var centerPoint = nwPoint.add(new L.Point(tileSize/2, tileSize/2));
          var p = this._map.unproject(centerPoint);
          radiusValue = this.projectLatlngs(p);
      }

      var heatmap = h337.create({
          "radius": radiusValue,
          "element": tile,
          "visible": true,
          "opacity": 100,  // we use leaflet's opacity for tiles
          "gradient": options.gradient,
          "debug": options.debug
      });

      // padding
      var pad = new L.Point(radiusValue, radiusValue);
      nwPoint = nwPoint.subtract(pad);
      sePoint = sePoint.add(pad);

      var bounds = new L.LatLngBounds(this._map.unproject(sePoint), this._map.unproject(nwPoint));
      this.quad_tree.retrieveInBounds(bounds.toRectangle()).forEach(function(obj) {
          localXY = self._tilePoint(ctx, [obj.x, obj.y]);
          value = obj.value;
          pointsInTile.push({
              x: localXY[0],
              y: localXY[1],
              count: value
          });
      });

      heatmap.store.setDataSet({max: this.max_value, data: pointsInTile});

      return this;
  },

  _debugInfo: function (ctx) {
    var canvas = L.DomUtil.create('canvas', 'leaflet-tile-debug');
    var tileSize = this.options.tileSize;
    canvas.width = tileSize;
    canvas.height = tileSize;
    ctx.canvas.appendChild(canvas);
    ctx.dbgcanvas = canvas;

    var max = tileSize;
    var g = canvas.getContext('2d');
    g.strokeStyle = '#000000';
    g.fillStyle = '#FFFF00';
    g.strokeRect(0, 0, max, max);
    g.font = "12px Arial";
    g.fillRect(0, 0, 5, 5);
    g.fillRect(0, max - 5, 5, 5);
    g.fillRect(max - 5, 0, 5, 5);
    g.fillRect(max - 5, max - 5, 5, 5);
    g.fillRect(max / 2 - 5, max / 2 - 5, 10, 10);
    var text = ctx.tilePoint.x + ' ' + ctx.tilePoint.y + ' ' + ctx.zoom;
    g.strokeText(text, max / 2 - 30, max / 2 - 10);

    this._debugPoint(ctx, [0,0]);
  },
  _debugPoint: function (ctx, geom) {
    var p = this._tilePoint(ctx, geom);
    var c = ctx.dbgcanvas;
    var g = c.getContext('2d');
    g.beginPath();
    g.fillStyle = '#FF0000';
    g.arc(p.x, p.y, 4, 0, Math.PI * 2);
    g.closePath();
    g.fill();
    g.restore();
  },

});
