import os from 'os';
import process from 'process';
import Koa from 'koa';
import serve from 'koa-static';
import bodyParser from 'koa-bodyparser'
import RedisHelper from './redis-helper';

const REDIS_HOST = 'localhost';
const REDIS_PORT = 6379;

const app = new Koa();
const router = require('koa-router')();

app.use(serve('./public'));
app.use(router.routes());

/**
 * Server
 */
const port = process.argv[2];
const server = app.listen(port);
console.log(`Listening ${port}...`);

/**
 * Redis
 */
const redis = require('redis').createClient;
const emitter = require('socket.io-emitter')({
  host: REDIS_HOST,
  port: REDIS_PORT
});
const redisAdapter = require('socket.io-redis')({
  host: REDIS_HOST,
  port: REDIS_PORT,
  pubClient: redis(REDIS_PORT, REDIS_HOST),
  subClient: redis(REDIS_PORT, REDIS_HOST)
});
const helper = new RedisHelper({
  client: redis(REDIS_PORT, REDIS_HOST),
  process: `${os.hostname()}.${process.pid}`
});
helper.init(`*::proc::${helper.process}::*`);

/**
 * Socket.io
 */
const io = require('socket.io').listen(server);
io.adapter(redisAdapter);

/**
 * Events
 */
io.on('connection', (socket) => {
  console.log('[SOCKET] connection', 'socket', socket.id);
  socket.on('disconnect', async () => {
    console.log('[SOCKET] disconnect', 'socket', socket.id);
    await disconnect(helper, socket.id);
  });
  socket.on('change_room', async (req) => {
    const {roomId} = req;
    console.log('[SOCKET] change_room', 'socket', socket.id);
    await disconnect(helper, socket.id);
    linkSocketAndRoom(helper, socket.id, roomId);
  })
});

/**
 * Routing
 */
router.post('/message', bodyParser(), async (ctx, next) => {
  const {token, roomId, message} = ctx.request.body;
  console.log('[POST] /message', roomId, message);
  await fetchSocketIdsByRoomId(helper, roomId)
    .then(socketIds => {
      console.log(`> sockets in the room '${roomId}'`, socketIds);
      ctx.body = `<p>Sent message to socket ids [${socketIds.join(', ')}]</p>`;
      socketIds.forEach((socketId) => {
        emitter.to(socketId).emit('push_message', `${message} - ${new Date()}`);
      });
    })
    .catch(err => {
      console.log(err);
      ctx.body = err;
    });
})

// ------------------

async function disconnect(helper, socketId) {
  console.log('> disconnect()', socketId);
  const roomIds = await fetchRoomIdsBySocketId(helper, socketId)
  console.log('> roomIds', roomIds);
  roomIds.forEach(roomId => {
    unlinkSocketAndRoom(helper, socketId, roomId);
  })
}

// socket - room
function linkSocketAndRoom (helper, socketId, roomId) {
  console.log('> linkSocketAndRoom()', socketId, roomId);
  helper.set(`socket::${socketId}::proc::${helper.process}::room`, roomId);
  // key をユニークにするため、key の中にも socketId を含ませる（room は複数の socket を持てる）
  helper.set(`room::${roomId}::socket::${socketId}::proc::${helper.process}::socket`, socketId);
}
function unlinkSocketAndRoom (helper, socketId, roomId) {
  console.log('> unlinkSocketAndRoom()', socketId, roomId);
  helper.del(`socket::${socketId}::proc::${helper.process}::room`);
  helper.del(`room::${roomId}::socket::${socketId}::proc::${helper.process}::socket`);
}

// room(s) <- socket
async function fetchRoomIdsBySocketId (helper, socketId) {
  console.log('> fetchRoomIdsBySocketId()', socketId);
  if (!socketId) {
    return [];
  }
  return await helper.fetch(`socket::${socketId}::*::room`);
}

// sockets <- room
async function fetchSocketIdsByRoomId (helper, roomId) {
  console.log('> fetchSocketIdsByRoomId()', roomId);
  if (!roomId) {
    return [];
  }
  return await helper.fetch(`room::${roomId}::*::socket`);
}
