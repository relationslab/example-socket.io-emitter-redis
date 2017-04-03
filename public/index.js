// extraHeaders doesn't work currently in browser
// https://github.com/socketio/socket.io-client/issues/976

import $ from 'jquery';
import qs from 'qs';
const query = window.location.search.replace('?', '');
const params = qs.parse(query);
const pathname = window.location.pathname;

const server = `//${window.location.hostname}:${window.location.port}`;
console.log('connecting to', server);

const socket = require('socket.io-client')(server, {
  // query: `token=${params.roomId}`
  query: `token=${pathname}`
});

// In case using <script src="//localhost:3000/socket.io/socket.io.js"></script>
// const socket = io(server, {
//   query: `token=${params.roomId}`
// });

socket.on('push_message', (message) => {
  console.log('on push_message', message);
  $('.chat').append(`<li>${message}</li>`);
});

$(document).ready(() => {

  const $title = $('.title');
  const $chat = $('.chat');
  const $message = $('#inputMessage');
  const $button = $('#postMessage');
  const $roomId = $('input[name=roomId]');

  const changeRoom = () => {
    const roomId = $roomId.filter(':checked').val();
    $title.text(`This page is for room ${roomId}`);
    $chat.empty();
    console.log('change room:', roomId);
    socket.json.emit('change_room', {
      'roomId': roomId
    })
  }

  const postMessage = () => {
    const roomId = $roomId.filter(':checked').val();
    const message = $message.val();
    console.log('send message', roomId, message);
    $.ajax({
      url: '/message',
      type: 'POST',
      data: {
        roomId: roomId,
        message: message
      },
      success: () => {
        console.log('success');
        $message.val('');
      }
    });
  }

  $button.on('click', postMessage);
  $roomId.on('click', changeRoom);

  changeRoom();
});
