var times = 1e6;

var all = [];
for (var i = 0; i < times; i++) {
  all.push(L.DomUtil.create('canvas', 'leaflet-tile'));
}

var all = [];
proto = L.DomUtil.create('canvas', 'leaflet-tile');
for (var i = 0; i < times; i++) {
  all.push(proto.cloneNode(false));
}
