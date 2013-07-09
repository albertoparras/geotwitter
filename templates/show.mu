<div>
  <h2>Mapping</h2>
  <div id="map" style="width: 800px; height: 400px;"></div>
</div>

<div>
  <h3 id="tweet_count">Tweet count</h3>
</div>

<div>
  <h2>Chatbox</h2>
  <form class="chat">
    <input type="text" />
    <button type="submit">Send</button>
  </form>
  <div id="chat_output"></div>
</div>

<link href="{{staticRoot}}/static/lib/leaflet.css" rel="stylesheet" type="text/css" />
<script src="{{staticRoot}}/static/lib/leaflet.js"></script>

<script src="{{staticRoot}}/static/QuadTree.js"></script>
<!-- <script src="{{staticRoot}}/static/heatmap.js"></script> -->
<!-- <script src="{{staticRoot}}/static/heatmap-leaflet.js"></script> -->
<!-- <script src="{{staticRoot}}/static/webgl-heatmap.js"></script> -->
<!-- <script src="{{staticRoot}}/static/webgl-heatmap-leaflet.js"></script> -->

<script>
L.Icon.Default.imagePath = '{{staticRoot}}/static/lib/img';
var tweet_count = 0;
function update_tweet_count() {
  $('#tweet_count').html('Received ' + tweet_count + ' tweets.');
}

function make_cloudmade() {
  var host = '{s}.tile.cloudmade.com';
  var api_key = 'd4fc77ea4a63471cab2423e66626cbb6'; // API key from Leaflet demos
  var style_id = '997'; // Uh, "Fresh"?
  var size = '256';
  return L.tileLayer('http://' + [host, api_key, style_id, size, '{z}', '{x}', '{y}'].join('/') + '.png', {
    attribution: 'OpenStreetMap & CloudMade',
    maxZoom: 18
  });
}

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

var cloudmade_layer = make_cloudmade();
// var heatmap_layer = Wied_heatmap();
// var heatmap_layer = new L.TileLayer.WebGLHeatMap();
var current_bounds = null;

var tweets = [];
var map = L.map('map', {
  center: [41.8, -87.6],
  zoom: 10,
  // layers: [cloudmade_layer, heatmap_layer]
  layers: [cloudmade_layer]
});

// var overlayMaps = {'Heatmap': heatmapLayer };
// var controls = L.control.layers(null, overlayMaps, {collapsed: false});
// controls.addTo(map);

function expandBounds(latLng) {
  if (!current_bounds) {
    var southWest = new L.LatLng(latLng.lat - 1, latLng.lng - 1);
    var northEast = new L.LatLng(latLng.lat + 1, latLng.lng + 1)
    current_bounds = new L.LatLngBounds(southWest, northEast);
  }
  else {
    current_bounds.extend(latLng);
  }
  map.fitBounds(current_bounds, {padding: L.Point(10, 10)});
}

function addLatLng(latLng) {
  // console.log("adding data", {lat: lat, lon: lon, value: 1});
  // heatmap_layer.addData([{lat: lat, lon: lon, value: 1}]);
  // var quad = heatmap_layer._quad;
  // var self = this;
  // heatmap_layer._maxValue = 0;
  // this._bounds = new L.LatLngBounds(latLngs);

  // this._quad = new QuadTree(this._boundsToQuery(this._bounds), false, 6, 6);
  // heatmap_layer._quad.insert({
  //   x: latLng.lon,
  //   y: latLng.lat,
  //   value: 1
  // });
  // heatmap_layer.redraw();

}

var socket = io.connect('http://localhost');
socket.on('tweet', function (tweet) {
  // var item = tweet.user_screen_name + ' (' + tweet.text.length + ')';
  // scrollDown();
  tweet_count++;
  update_tweet_count();

  if (tweet.coordinates) {
    var coord_pair = tweet.coordinates.split(',');
    // coord_pair is in standard GeoJSON: 'longitude,latitude'
    var lon = parseFloat(coord_pair[0]);
    var lat = parseFloat(coord_pair[1]);
    var latLng = new L.LatLng(lat, lon);
    // console.log('data', {x: lon, y: lat, value: 1});

    var marker = L.marker(latLng, {title: tweet.text}).addTo(map);
    expandBounds(latLng);
    // addLatLng(new L.LatLng(lat, lon));
    // if (!heatmap_layer._quad) {
      // heatmap_layer.setData([{lon: lon, lat: lat, value: 1}]);
    // }
  }
  else {
    // console.log('Tweet does not have coordinates', tweet);
  }
});

$('form.chat').on('submit', function(ev) {
  ev.preventDefault();
  var message = $('form.chat input').val();
  console.log('Sending message', message);
  socket.emit('chat', message);
});
socket.on('chat', function (text) {
  $('#chat_output').append('<p>' + text + '</p>');
});

$(function() {
  // console.log('Page loaded, locating user...');
  map.locate();
  map.on('locationfound', function(loc) {
    var ne = loc.bounds.getNorthEast();
    var nw = loc.bounds.getNorthWest();
    var radius = ne.distanceTo(nw) / 2; // rough, is there a better way?
    // draw circle
    L.circle(loc.bounds.getCenter(), radius).addTo(map);
    // and show it, as usual
    expandBounds(loc.latlng);
  });
});

</script>
