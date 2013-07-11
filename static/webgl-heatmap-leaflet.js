"use strict"; /*jslint indent: 2, browser: true, devel: true */
/*globals _, $, L, QuadTree, createWebGLHeatmap */
// createWebGLHeatmap is defined in webgl-heatmap.js

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

function visible(element) {
  // http://stackoverflow.com/questions/704758/how-to-check-if-an-element-is-really-visible-with-javascript
  if (element.offsetWidth === 0 || element.offsetHeight === 0) return false;
  var height = document.documentElement.clientHeight;
  var rects = element.getClientRects();
  var on_top = function(r) {
    for (var x = Math.floor(r.left), x_max = Math.ceil(r.right); x <= x_max; x++) {
      for (var y = Math.floor(r.top), y_max = Math.ceil(r.bottom); y <= y_max; y++) {
        if (document.elementFromPoint(x, y) === element) return true;
      }
    }
    return false;
  };
  for (var i = 0, l = rects.length; i < l; i++) {
    var r = rects[i];
    var in_viewport = r.top > 0 ? r.top <= height : (r.bottom > 0 && r.bottom <= height);
    if (in_viewport && on_top(r)) return true;
  }
  return false;
}

var WebGLHeatMap = L.TileLayer.Canvas.extend({
  latLngs: [],
  options: {
    async: false,
    // debug: true,
    updateWhenIdle: false,
    unloadInvisibleTiles: false,
    reuseTiles: false,
    size: 5,
    intensity: 0.8,
    // debug: false,
    // opacity: 0.9,  // opacity is between 0 and 1, not in percent
    // radius: {
    //   value: 20,
    //   absolute: false  // true: radius in meters, false: radius in pixels
    // }
  },
  // latLng -> layerPoint
  latLngToLayerPoint: function (latLng) {
    return this._map.latLngToLayerPoint(latLng);
  },
  // latLng -> tilePoint
  latLngToTilePoint: function (latLng) {
    var layer_point = this._map.latLngToLayerPoint(latLng);
    return this.layerPointToTilePoint(layer_point);
  },

  // layerPoint -> tilePoint
  layerPointToTilePoint: function(layer_point) {
    var origin = this._map.getPixelOrigin();
    var point = layer_point.add(origin).divideBy(this.options.tileSize);
    return new L.Point(point.x |0, point.y | 0);
  },

  // tilePoint -> layerPoint
  tilePointToLayerPoint: function(tile_point) {
    // i.e., _getTilePos(tile_point)
    var origin = this._map.getPixelOrigin();
    return tile_point.multiplyBy(this.options.tileSize).subtract(origin);
  },
  // tilePoint -> latLng
  tilePointToLatLng: function(tile_point) {
    var origin = this._map.getPixelOrigin();
    var layer_point = tile_point.multiplyBy(this.options.tileSize).subtract(origin);
    return this._map.layerPointToLatLng(layer_point);
  },

  // initialize: function(options) {
    // L.Util.setOptions(this, options);
    // var bounds = this._map.getPixelBounds(),
  // },
  // redraw: function () {
  //   for (var i in this._tiles) {
  //     this._redrawTile(this._tiles[i]);
  //   }
  //   return this;
  // },
  // _redrawTile: function (tile) {
  //   this.drawTile(tile, tile._tilePoint, this._map._zoom);
  // },
  // _createTileProto: function () {
  //   var proto = this._canvasProto = L.DomUtil.create('canvas', 'leaflet-tile canvas-tile');
  //   proto.width = proto.height = this.options.tileSize;
  //   // console.log('_createTileProto', proto);
  // },
  // _createTile: function () {
  //   var tile = this._canvasProto.cloneNode(false);
  //   tile.onselectstart = tile.onmousemove = L.Util.falseFn;
  //   // console.log('_createTile', tile);
  //   return tile;
  // },

  // _loadTile: function (tile, tilePoint) {
  //   tile._layer = this;
  //   tile._tilePoint = tilePoint;

  //   this._redrawTile(tile);

  //   if (!this.options.async) {
  //     this.tileDrawn(tile);
  //   }
  // },
  // _getTile: function () {
  //   return this._createTile();
  // },

  // tile_cache: {},
  _heatmaps: {},
  drawTile: function(tile, tile_point, zoom) {
    /** arguments:
      tile: HTMLCanvasElement
      tile_point: Point
      zoom: Numberhigher zoom = less map shown = closer to surface of earth */
    // L.DomUtil.addClass(tile, 'leaflet-heatmap-tile');

    var tile_name = 'x' + tile_point.x + 'y' + tile_point.y + 'z' + zoom;
    // 'WebGLHeatMap.drawTile: %s', // , visible(canvas)
    // var tile_bounds = L.Bounds([tile_point, tile_point.add([1, 1])]);
    var next_tile_point = tile_point.add([1, 1]);
    var nw_latLng = this.tilePointToLatLng(tile_point);
    var se_latLng = this.tilePointToLatLng(next_tile_point);
    var bounds = new L.LatLngBounds([nw_latLng, se_latLng]);
    // console.log(tile_id, bounds.toBBoxString());

    var latLngs = this.latLngs.filter(function(latLng) {
      return bounds.contains(latLng);
    });

    console.log("Redrawing %d points", latLngs.length, tile.width, tile.height);

    var tile_id = tile_point.x + ':' + tile_point.y;
    var tile = this._tiles[tile_id];
    var heatmap = this._heatmaps[tile_id];
    if (!heatmap || heatmap.canvas != tile) {
      console.log("Creating heatmap for tile", tile);
      heatmap = createWebGLHeatmap({canvas: tile});
    }


    for (var i = 0; i < latLngs.length; i++) {
      var latLng = latLngs[i];
      var layer_point = this._map.latLngToLayerPoint(latLng);

      var origin = this._map.getPixelOrigin();
      var tile_point_precise = layer_point.add(origin).divideBy(this.options.tileSize);
      var point_on_tile = tile_point_precise.subtract(tile_point).multiplyBy(this.options.tileSize);
      // return new L.Point(point.x |0, point.y | 0);

      var size = this.options.size;
      var intensity = this.options.intensity;
      console.log('heatmap.addPoint', point_on_tile.x, point_on_tile.y, size, intensity);
      heatmap.addPoint(point_on_tile.x, point_on_tile.y, size, intensity);
      heatmap.update();
      heatmap.display();
      window.heatmap = heatmap;
    }
    // heatmap.multiply(0.995); // fade out each frame / redraw ?

    // var g = canvas.getContext('2d');
    // g.fillStyle = 'green';
    // g.fillRect(20, 20, 20, 20);

    return this;
  },
  // tileDrawn: function (tile) {
  //   this._tileOnLoad.call(tile);
  // },

  // onAdd: function (map) {
    // call parent method (inherited from super)
    // L.TileLayer.Canvas.prototype.onAdd.call(this, map);
    // create a DOM element and put it into one of the map panes
    // this._el = L.DomUtil.create('div', 'my-custom-layer leaflet-zoom-hide');
    // map.getPanes().overlayPane.appendChild(this._el);

    // add a viewreset event listener for updating layer's position, do the latter
    // map.on('viewreset', this._reset, this);
    // this._reset();
  // },

  addLatLng: function(latLng, intensity) {
    this.latLngs.push(latLng);

    var layer_point = this.latLngToLayerPoint(latLng);
    var tile_point = this.layerPointToTilePoint(layer_point);
    var tile_id = tile_point.x + ':' + tile_point.y;
    var tile = this._tiles[tile_id];
    this._redrawTile(tile);

    // var zoom = this._map.getZoom();
    // var tile_id = 'x' + tile_point.x + 'y' + tile_point.y + 'z' + zoom;
    // console.log('addLatLng %s: %s -> %s -> %s', tile_id,
      // latLng.toString(), layer_point.toString(), tile_point.toString());
    // var tile = this.tile_cache[tile_id];
    // if (tile) {
    //   // heatmap.addPoint(x, y, size, intensity);
    //   // console.log('WebGLHeatMap.addLatLng(tile id = %s)', id);
    //   // Add a data point.
    //   //   x and y relative to the canvas in pixels
    //   //   size in pixels (radius)
    //   //   intensity between 0 and 1
    //   var x = 5;
    //   var y = 5;
    //   var size = 5;

    //   // L.DomUtil.addClass(tile.canvas, tile_id);
    //   // tile.canvas.addClass(tile_id);
    //   console.log('WebGLHeatMap.addLatLng tile.canvas', tile.canvas);
    //   var g = tile.canvas.getContext('2d');
    //   g.fillStyle = 'red';
    //   g.fillRect(0, 0, 20, 20);

    //   // this.redraw();


    //   return;

    //   if (intensity === undefined) intensity = 1;
    //   console.log('adding point %d,%d -> %d (%d)', x, y, size, intensity);
    //   // console.log('map:', tile);
    //   tile.heatmap.addPoint(x, y, size, intensity);
    //   tile.heatmap.update();
    //   tile.heatmap.display();
    //   // heatmap.multiply(0.995); // fade out each frame / redraw ?
    // }
    // else {
    //   console.error('Canvas for that tile does not yet exist: %s', tile_id);
    // }
  }
});


  // /**
  //  * Transforms coordinates to tile space
  //  */

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

