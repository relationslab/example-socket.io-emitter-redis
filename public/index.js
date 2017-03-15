// extraHeaders doesn't work currently in browser
// https://github.com/socketio/socket.io-client/issues/976

import $ from 'jquery';
import qs from 'qs';
const query = window.location.search.replace('?', '');
const params = qs.parse(query);

const server = `//${window.location.hostname}:${window.location.port }`;
console.log('connecting to', server);

const socket = require('socket.io-client')(server, {
  query: `token=${params.id}`
});

// In case using <script src="//localhost:3000/socket.io/socket.io.js"></script>
// const socket = io(server, {
//   query: `token=${params.id}`
// });

socket.on('push_message', (message) => {
  console.log('on push_message', message);
  $('.message').append(`<li>${message}</li>`);
});

$(document).ready(() => {
  $('.title').text(`This page is for user ${params.id}`);
});
