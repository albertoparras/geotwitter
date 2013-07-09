"use strict"; /*jslint indent: 2, browser: true */ /*globals _, $, L, QuadTree */
/**

Docs for the original webgl-heatmap:
  http://codeflow.org/entries/2013/feb/04/high-performance-js-heatmaps/

*/

/** Types:

Rectangle: {
  x: Number,
  y: Number,
  width: Number,
  height: Number
}

*/

/** QuadTree wants a rectangle, not a L.LatLngBounds class. */
L.LatLngBounds.prototype.toRectangle = function() {
  return {
    x: this.getSouthWest().lng,
    y: this.getSouthWest().lat,
    width: this.getNorthEast().lng - this.getSouthWest().lng,
    height: this.getNorthEast().lat - this.getSouthWest().lat
  };
};

L.TileLayer.WebGLHeatMap = L.TileLayer.Canvas.extend({
  // options: {
  //   debug: false,
  //   opacity: 0.9,  // opacity is between 0 and 1, not in percent
  //   radius: {
  //     value: 20,
  //     absolute: false  // true: radius in meters, false: radius in pixels
  //   }
  // },

  drawTile: function(canvas, tilePoint, zoom) {
    // console.log('drawTile', arguments);
    // var ctx = {
    //   canvas: tile,
    //   tilePoint: tilePoint,
    //   zoom: zoom
    // };
    // canvas: HTMLCanvasElement
    // tilePoint: Point
    // zoom: Number
    // createWebGLHeatmap is defined in webgl-heatmap.js
    var webgl_heatmap = createWebGLHeatmap({canvas: canvas});
  },

  // tileDrawn: function(canvas) {
  //   // canvas: HTMLCanvasElement
  // },

  initialize: function(options) {
    // console.log('initialize', arguments);
    // var self = this;
    // L.Util.setOptions(this, options);

    // this.max_value = 0;
    // this.latLngBounds = null;
    // this.store = new QuadTree(this.latLngBounds.toRectangle(), false, 6, 6);

  },

  // Insert data point into quadtree and redraw heatmap canvas
  addLatLng: function(latLng, value) {
    // heatmap.addPoint(x, y, size, intensity);

    // latLng must be a single L.LatLng object
    // // value is optional and defaults to 1
    // var self = this;

    // // set default value and update the heatmap's max_value
    // if (value === undefined) value = 1;
    // this.max_value = Math.max(this.max_value, value);

    // if (this.latLngBounds) {
    //   this.latLngBounds.extend(latLng);
    // }
    // else {
    //   this.latLngBounds = new L.LatLngBounds([latLng]);
    //   this.store.root.bounds = this.latLngBounds.toRectangle();
    // }

    // this.store.insert({
    //   x: latLng.lon,
    //   y: latLng.lat,
    //   value: value
    // });

    // this.redraw();
  },

  // /**
  //  * Transforms coordinates to tile space
  //  */
  // _tilePoint: function (ctx, coords) {
  //   // start coords to tile 'space'
  //   var s = ctx.tilePoint.multiplyBy(this.options.tileSize);

  //   // actual coords to tile 'space'
  //   var p = this._map.project(new L.LatLng(coords[1], coords[0]));

  //   // point to draw
  //   var x = Math.round(p.x - s.x);
  //   var y = Math.round(p.y - s.y);
  //   return [x, y];
  // },

  // _getLatRadius: function () {
  //   return (this.options.radius.value / 40075017) * 360;
  // },

  // _getLngRadius: function (point) {
  //   return this._getLatRadius() / Math.cos(L.LatLng.DEG_TO_RAD * point.lat);
  // },

  /*
   * The idea is to create two points and then get
   * the distance between the two in order to know what
   * the absolute radius in this tile could be.
   */
  // projectLatlngs: function (point) {
  //   var lngRadius = this._getLngRadius(point),
  //     latlng2 = new L.LatLng(point.lat, point.lng - lngRadius, true),
  //     p = this._map.latLngToLayerPoint(latlng2),
  //     q = this._map.latLngToLayerPoint(point);
  //   return Math.max(Math.round(q.x - p.x), 1);
  // },

  // _draw: function (ctx) {
  //     if (!this._quad || !this._map) {
  //         return;
  //     }

  //     var self = this,
  //         options = this.options,
  //         tile = ctx.canvas,
  //         tileSize = options.tileSize,
  //         radiusValue = this.options.radius.value;

  //     var localXY, value, pointsInTile = [];

  //     var nwPoint = ctx.tilePoint.multiplyBy(tileSize),
  //         sePoint = nwPoint.add(new L.Point(tileSize, tileSize));

  //     // Set the radius for the tile, if necessary.
  //     // The radius of a circle can be either absolute in pixels or in meters
  //     // The radius in pixels is not the same on the whole map.
  //     if (options.radius.absolute) {
  //         var centerPoint = nwPoint.add(new L.Point(tileSize/2, tileSize/2));
  //         var p = this._map.unproject(centerPoint);
  //         radiusValue = this.projectLatlngs(p);
  //     }

  //     var bounds = new L.LatLngBounds(this._map.unproject(sePoint), this._map.unproject(nwPoint));
  //     this.quad_tree.retrieveInBounds(bounds.toRectangle()).forEach(function(obj) {
  //         localXY = self._tilePoint(ctx, [obj.x, obj.y]);
  //         value = obj.value;
  //         pointsInTile.push({
  //             x: localXY[0],
  //             y: localXY[1],
  //             count: value
  //         });
  //     });

  //     // heatmap.store.setDataSet({max: this.max_value, data: pointsInTile});

  //     return this;
  // },

  // _debugInfo: function (ctx) {
  //   var canvas = L.DomUtil.create('canvas', 'leaflet-tile-debug');
  //   var tileSize = this.options.tileSize;
  //   canvas.width = tileSize;
  //   canvas.height = tileSize;
  //   ctx.canvas.appendChild(canvas);
  //   ctx.dbgcanvas = canvas;

  //   var max = tileSize;
  //   var g = canvas.getContext('2d');
  //   g.strokeStyle = '#000000';
  //   g.fillStyle = '#FFFF00';
  //   g.strokeRect(0, 0, max, max);
  //   g.font = "12px Arial";
  //   g.fillRect(0, 0, 5, 5);
  //   g.fillRect(0, max - 5, 5, 5);
  //   g.fillRect(max - 5, 0, 5, 5);
  //   g.fillRect(max - 5, max - 5, 5, 5);
  //   g.fillRect(max / 2 - 5, max / 2 - 5, 10, 10);
  //   var text = ctx.tilePoint.x + ' ' + ctx.tilePoint.y + ' ' + ctx.zoom;
  //   g.strokeText(text, max / 2 - 30, max / 2 - 10);

  //   this._debugPoint(ctx, [0,0]);
  // },
  // _debugPoint: function (ctx, geom) {
  //   var p = this._tilePoint(ctx, geom);
  //   var c = ctx.dbgcanvas;
  //   var g = c.getContext('2d');
  //   g.beginPath();
  //   g.fillStyle = '#FF0000';
  //   g.arc(p.x, p.y, 4, 0, Math.PI * 2);
  //   g.closePath();
  //   g.fill();
  //   g.restore();
  // },

});
