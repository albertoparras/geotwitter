<div>
  <h2>Mapping</h2>
  <div id="map" style="width: 800px; height: 400px;"></div>
</div>

<div>
  <h3 id="tweet_count">Tweet count</h3>
</div>

<div>
  <h2>Chatbox</h2>
  <input type="text" id="chat_input" />
  <button id="chat_submit">Shout</button>
  <div id="chat_output"></div>
</div>

<link href="/static/lib/leaflet.css" rel="stylesheet" type="text/css" />
<script src="/static/lib/leaflet.min.js"></script>
<script>
var tweet_count = 0;
function update_tweet_count() {
  $('#tweet_count').html('Received ' + tweet_count + ' tweets.');
}

var tweets = [];
var current_bounds = null;
var map = L.map('map', {
  center: [41.8, -87.6],
  zoom: 10
});

var host = '{s}.tile.cloudmade.com';
var api_key = 'd4fc77ea4a63471cab2423e66626cbb6'; // API key from Leaflet demos
var style_id = '997'; // Uh, "Fresh"?
var size = '256';
L.tileLayer('http://' + [host, api_key, style_id, size, '{z}', '{x}', '{y}'].join('/') + '.png', {
  attribution: 'OpenStreetMap & CloudMade',
  maxZoom: 18
}).addTo(map);


var socket = io.connect('http://localhost');
socket.on('tweet', function (tweet) {
  // var item = tweet.user_screen_name + ' (' + tweet.text.length + ')';
  // scrollDown();
  tweet_count++;
  update_tweet_count();

  if (tweet.coordinates) {
    var coord_pair = tweet.coordinates.split(',');
    // coord_pair is in standard GeoJSON: 'longitude,latitude'
    var latlng = new L.LatLng(parseInt(coord_pair[1], 10), parseInt(coord_pair[0], 10));
    var marker = L.marker(latlng).addTo(map);
    if (current_bounds) {
      current_bounds.extend(latlng);
      map.fitBounds(current_bounds);
    }
  }
  else {
    // console.log('Tweet does not have coordinates', tweet);
  }
});

$('button').on('click', function(ev) {
  socket.emit('shout', $('textarea').val());
});


map.locate();
L.Icon.Default.imagePath = '/static/lib/img';
map.on('locationfound', function(loc) {
  var ne = loc.bounds.getNorthEast();
  var nw = loc.bounds.getNorthWest();
  var radius = ne.distanceTo(nw) / 2;
  L.circle(loc.bounds.getCenter(), radius).addTo(map);
  map.fitBounds(loc.bounds, {padding: L.Point(10, 10)});

  current_bounds = loc.bounds;
});

</script>
