"use strict"; /*jslint indent: 2, browser: true, devel: true */ /*globals L */

function drawLabeledRectangle(g, size, text) {
  g.strokeStyle = 'magenta';
  g.fillStyle = 'yellow';
  g.strokeRect(0, 0, size, size);

  g.font = '12px Arial';
  g.fillRect(0, 0, 5, 5);
  g.fillRect(0, size - 5, 5, 5);
  g.fillRect(size - 5, 0, 5, 5);
  g.fillRect(size - 5, size - 5, 5, 5);

  g.fillStyle = 'orange';
  g.fillRect(size / 2 - 5, size / 2 - 5, 10, 10);
  g.strokeStyle = 'black';
  g.strokeText(text, size / 2 - 30, size / 2 - 10);

  // drawPoint(g, 0, 0);
}

function drawPoint(g, x, y) {
  g.beginPath();
  g.fillStyle = '#FF0000';
  g.arc(x, y, 4, 0, Math.PI * 2);
  g.closePath();
  g.fill();
  g.restore();
}

L.LabelControl = L.Control.extend({
  options: {
    position: 'topright'
  },
  onAdd: function (map) {
    this._container = L.DomUtil.create('div', 'leaflet-control-label');
    L.DomEvent.disableClickPropagation(this._container);
    return this._container;
  },
  setText: function(text) {
    this._container.innerHTML = text;
  }
});

var DebugLayer = L.TileLayer.Canvas.extend({
  initialize: function(options) {
    this.latLng = new L.LabelControl({position: 'topright'});
    this.layer_point = new L.LabelControl({position: 'topright'});
    this.misc = new L.LabelControl({position: 'topright'});
  },
  onAdd: function (map) {
    // call parent method (inherited from super)
    L.TileLayer.Canvas.prototype.onAdd.call(this, map);

    map.addControl(this.latLng);
    map.addControl(this.layer_point);
    map.addControl(this.misc);

    map.on('mousemove', this.mouseMove.bind(this));
  },
  drawTile: function(canvas, tile_point, zoom) {
    var g = canvas.getContext('2d');
    // console.log('drawTile canvas:', canvas);
    var id = 'x' + tile_point.x + 'y' + tile_point.y + 'z' + zoom;
    // console.log('Drawing labeled rectangle', id);
    drawLabeledRectangle(g, this.options.tileSize, id);
  },
  mouseMove: function(ev) {
    // console.log('debug layer mouseMove', ev);
    this.latLng.setText(ev.latlng.toString());
    this.layer_point.setText(ev.layerPoint.toString());
  }
});
