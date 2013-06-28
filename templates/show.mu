<div id="content">
  <h2>Socket.io test grounds</h2>
  <div>
    <textarea></textarea>
    <button>Shout</button>
  </div>
</div>

<div id="results"></div>
<ul id="authors"></ul>

<script>
var socket = io.connect('http://localhost');
var $results = $('#results');
var $authors = $('#authors');

function scrollDown() {
  document.body.scrollTop = document.height;
}

socket.on('tweet', function (tweet) {
  $authors.append('<li>' + tweet.user_screen_name + ' (' + tweet.text.length + ')</li>');
  scrollDown();
});

$('button').on('click', function(ev) {
  socket.emit('shout', $('textarea').val());
});
</script>
