<div class="control map-container" style="width: 800px;">
  <div id="map" style="width: 100%; height: 400px;"></div>
</div>

<div class="control" style="width: 200px;">
  <h3>Map control</h3>
  <label>Listening: <input type="checkbox" id="listening" checked="checked" /></label>
</div>

<div class="control" style="width: 200px;">
  <h3>Counts</h3>
  <ul id="counts"></ul>
</div>

<div class="control" style="width: 200px;">
  <h3>Filter</h3>
  <form class="filter">
    <input type="text" />
    <select>
      <option value="track">track</option>
      <option value="locations">locations</option>
    </select>
    <button type="submit">Change filter</button>
  </form>
  <div id="status">status...</div>
</div>

<div class="control" style="width: 200px;">
  <h3>Geocoder</h3>
  <form class="geocoder">
    <input type="text" />
    <button type="submit">Look up</button>
  </form>
  <div id="geocoder_result"></div>
</div>


<div style="clear: both; padding: 10px;">
  <hr style="margin: 0" />
</div>

<div class="control" style="width: 240px;">
  <h3>Chatbox</h3>
  <form class="chat">
    <input type="text" />
    <button type="submit">Send</button>
  </form>
  <h3>Log:</h3>
  <div id="chat_output" style="min-height: 100px;"></div>
</div>

<div class="control" style="width: 240px;">
  <h3>Tweet viewer</h3>
  <div id="tweet_viewer"></div>
</div>

<div class="control" style="width: 240px;">
  <h3>Tweet stream</h3>
  <div id="tweet_stream"></div>
</div>


<link href="http://{{hostname}}:{{static_port}}/static/lib/leaflet.css" rel="stylesheet" type="text/css" />
<script src="http://{{hostname}}:{{static_port}}/static/lib/leaflet.js"></script>
<script src="http://{{hostname}}:{{static_port}}/static/leaflet-debug.js"></script>
<!-- <script src="http://{{hostname}}:{{static_port}}/static/QuadTree.js"></script> -->
<!-- <script src="http://{{hostname}}:{{static_port}}/static/heatmap.js"></script> -->
<!-- <script src="http://{{hostname}}:{{static_port}}/static/heatmap-leaflet.js"></script> -->
<!-- <script src="http://{{hostname}}:{{static_port}}/static/webgl-heatmap.js"></script> -->
<!-- <script src="http://{{hostname}}:{{static_port}}/static/webgl-heatmap-leaflet.js"></script> -->

<!-- temporarily for geocoding -->
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCY5L1jgFP2dMeWEAlsw_t29TRgy7adDLc&sensor=true"></script>

<script>
L.Icon.Default.imagePath = 'http://{{hostname}}:{{static_port}}/static/lib/img';
var DEBUG = false;
var COUNTS = {
  tweets: 0,
  tweets_with_coordinates: 0
};
var current_bounds = null;

var tweets = [];

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

// function addLatLng(latLng, tweet) {
  // this._bounds = new L.LatLngBounds(latLngs);

  // this._quad = new QuadTree(this._boundsToQuery(this._bounds), false, 6, 6);
  // heatmap_layer._quad.insert({
  //   x: latLng.lon,
  //   y: latLng.lat,
  //   value: 1
  // });
  // heatmap_layer.redraw();

  // heatmap_layer.addLatLng(latLng);
// }

function Tweet(attributes) {
  _.extend(this, attributes);

  // this.coordinates is in standard GeoJSON: 'longitude,latitude'
  var geojson_point = this.coordinates.split(',').map(parseFloat);
  // console.log(geojson_point);
  // geojson_point is an array of floats: [longitude, latitude]
  // new
  this.latLng = geojson_point.reverse(); // L.latLng(geojson_point.reverse())
  // scrollDown();
}
Tweet.prototype.render = function(map) {
  var marker = new L.Marker(this.latLng, {
    title: this.text
  }).addTo(map);
  marker.on('click', this.view, this);

  var html = '';

  var m = this.created_at.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  // new Date(year, month, day [hour, minute, second, millisecond]);
  if (m) {
    var epoch = Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5], m[6], 0);
    var date = new Date(epoch);
    html += '<b>' + date.toString().split(' ').slice(0, 5).join(' ') + '</b>';
  }
  html += '<p>' + this.text + '</p>';
  $('#tweet_stream').html(html);
};
Tweet.prototype.view = function() {
  var self = this;
  var html = '';
  _.each(['created_at', 'place_str', 'user_screen_name', 'text'], function(prop) {
    html += '<li><b>' + prop + '</b>: ' + self[prop] + '</li>';
  });
  $('#tweet_viewer').html('<ul>' + html + '</ul>');
};
Tweet.prototype.onclick = function() {
  // var json_string = '';
  var self = this;
};




function onTweet(attributes) {
  // var item = tweet.user_screen_name + ' (' + tweet.text.length + ')';
  COUNTS.tweets++;
  if (attributes.coordinates) {
    COUNTS.tweets_with_coordinates++;
    var tweet = new Tweet(attributes);
    tweet.render(map);
  }
  // else console.log('Tweet does not have coordinates', tweet);

  var $counts = $('#counts').empty();
  _.each(COUNTS, function(value, key) {
    $counts.append('<li>' + key + ': ' + COUNTS[key] + '</li>');
  });
}

function connect_socketio() {
  var socket = io.connect('http://{{hostname}}');
  socket.on('tweet', onTweet);
  $('#listening').on('click', function() {
    console.log('#listening click', this.checked);
    if (this.value) {
      socket.removeListener('tweet', onTweet);
    }
    else {
      socket.on('tweet', onTweet);
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

  $('form.filter').on('submit', function(ev) {
    ev.preventDefault();
    var form = {stall_warnings: true};

    var type = $('form.filter option:selected').val();
    form[type] = $('form.filter input').val();

    console.log('filter', form);
    socket.emit('filter', form);
  });
  socket.on('filter', function (form) {
    var select_value = form.locations ? 'locations' : 'track';
    $('form.filter option[value="' + select_value + '"]').prop('selected', true);
    $('form.filter input').val(form[select_value]);
    var $status = $('#status').html('Filter updated').css({opacity: 1});
    setTimeout(function() {
      $status.animate({opacity: 0.01}, 1000);
    }, 1000);
  });

  window.socket = socket;
}

function randomly_add_points() {
  function addPoint() {
    var lng_range = current_bounds.getEast() - current_bounds.getWest();
    var lat_range = current_bounds.getNorth() - current_bounds.getSouth();
    var lng = Math.random() * lng_range + current_bounds.getWest();
    var lat = Math.random() * lat_range + current_bounds.getSouth();
    addLatLng(new L.LatLng(lat, lng));
  }

  $('#listening').on('click', function() {
    console.log('#listening click', this.checked);
    if (this.checked) {
      window.random_point_interval = setInterval(addPoint, 500);
    }
    else {
      clearInterval(window.random_point_interval);
    }
  });
  window.random_point_interval = setInterval(addPoint, 500);
}

function addCloudmade(map) {
  var host = '{s}.tile.cloudmade.com';
  var api_key = 'd4fc77ea4a63471cab2423e66626cbb6'; // API key from Leaflet demos
  var style_id = '997'; // Uh, "Fresh"?
  var size = '256';

  return new L.TileLayer('http://' + [host, api_key, style_id, size, '{z}', '{x}', '{y}'].join('/') + '.png', {
    attribution: 'OpenStreetMap & CloudMade',
    maxZoom: 18
  }).addTo(map);
}

function addHeatmap(map) {
  return new WebGLHeatMap().addTo(map);
}

function addDebug(map) {
  return new DebugLayer().addTo(map);
}


$(function() {
  // globals for debugging ease
  var map = window.map = L.map('map');
  heatmap_layer = null;
  addCloudmade(map);
  if (DEBUG) {
    var debug_layer = window.debug_layer = addDebug(map);
    if (heatmap_layer) {
      map.on('mousemove', function(ev) {
        // var layer_point = this._map.latLngToLayerPoint(ev.latlng);
        var tile_point = heatmap_layer.layerPointToTilePoint(ev.layerPoint);
        debug_layer.misc.setText(tile_point.toString());
      });
    }
  }

  // hard-set bounds to USA
  var usa_bounds = new L.LatLngBounds([24, -126], [49, -65]);
  map.fitBounds(usa_bounds, {padding: L.Point(10, 10)});
  // will give us zoom = 4, I think, for the USA

  map.locate();
  map.on('locationfound', function(loc) {
    var ne = loc.bounds.getNorthEast();
    var nw = loc.bounds.getNorthWest();
    var radius = ne.distanceTo(nw) / 2; // rough, is there a better way?
    // draw circle
    L.circle(loc.bounds.getCenter(), radius).addTo(map);
    // and show it, as usual
  });

  // var overlayMaps = {'Heatmap': heatmapLayer };
  // var controls = L.control.layers(null, overlayMaps, {collapsed: false});
  // controls.addTo(map);
  connect_socketio();
});

$(document).keyup(function(e) {
  if (e.which == 27) { // ESC pressed
    $('#listening').trigger('click');
  }
});

var geocoder = new google.maps.Geocoder();
$('form.geocoder').on('submit', function(ev) {
  ev.preventDefault();
  var query = $('form.geocoder input').val();
  geocoder.geocode({address: query}, function(results, status) {
    var message = '';
    if (status == google.maps.GeocoderStatus.OK && results.length) {
      var result = results[0];
      // console.log('Search found', result);

      // geometry will be a box, if it's given, otherwise just a point (for addresses)
      if (result.geometry.bounds) {
        // window.bounds = result.geometry.bounds;
        // console.log('locations=' + locations);
        // twitter wants: sw.lon,sw.lat,ne.lon,ne.lat
        var bounds = result.geometry.bounds;
        var ne = bounds.getNorthEast();
        var sw = bounds.getSouthWest();

        var locations = [sw.lng(), sw.lat(), ne.lng(), ne.lat()].map(function (degrees) {
          return degrees.toFixed(3);
        }).join(',')
        var form = {locations: locations, stall_warnings: true};
        socket.emit('filter', form);

        var leaflet_filter_bounds = new L.LatLngBounds([sw.lat(), sw.lng()], [ne.lat(), ne.lng()]);
        map.fitBounds(leaflet_filter_bounds, {padding: L.Point(10, 10)});

        message += 'Using location: ' + result.formatted_address;
      }
      else {
        message += 'Cannot use single point as bounds: ' + result.geometry.location.toString();
      }
    }
    else {
      message += 'Geocoder failed. ' + status.toString();
    }
    $('#geocoder_result').html(message);
  });
});


</script>
