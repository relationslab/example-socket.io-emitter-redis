import os from 'os';
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
const host = os.hostname();
const port = process.argv[2];
const server = app.listen(port);
console.log(`Listening ${host}:${port}...`);
const io = require('socket.io').listen(server);

/**
 * Redis
 */
const emitter = require('socket.io-emitter')({ host: REDIS_HOST, port: REDIS_PORT });
const redis = require('redis').createClient;
const pub = redis(REDIS_PORT, REDIS_HOST);
const sub = redis(REDIS_PORT, REDIS_HOST);
const redisAdapter = require('socket.io-redis');

io.adapter(redisAdapter({ host: REDIS_HOST, port: REDIS_PORT, pubClient: pub, subClient: sub }));

const helper = new RedisHelper(redis(REDIS_PORT, REDIS_HOST), host, port);
helper.init();

/**
 * Events
 */
io.on('connection', (socket) => {
  socket.on('disconnect', async () => {
    await fetchRoomIdsBySocketId(helper, socket.id)
      .then(roomIds => {
        roomIds.forEach(roomId => {
          console.log('disconnect', 'socket', socket.id, 'room', roomId);
          delRoomId(helper, socket.id, roomId);
        })
      })
  });
  socket.on('change_room', async (req) => {
    // remove previous (old) roomId from socketId
    await fetchRoomIdsBySocketId(helper, socket.id)
      .then(oldRoomIds => {
        oldRoomIds.forEach(oldRoomId => {
          console.log('[del]', 'socket', socket.id, 'room', oldRoomId);
          delRoomId(helper, socket.id, oldRoomId);
        })
      })
    // bind new roomId to socketId
    const roomId = req.roomId;
    console.log('[add]', 'socket', socket.id, 'room', roomId);
    setRoomId(helper, socket.id, roomId);
  })
});

/**
 * Routing
 */
router.post('/message', bodyParser(), async (ctx, next) => {
  const {roomId, message} = ctx.request.body;
  console.log('/message', roomId, message);
  await fetchSocketIdsByRoomId(helper, roomId)
    .then(socketIds => {
      console.log('socketIds', socketIds);
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

function setRoomId (helper, socketId, roomId) {
  helper.set(getRoomKeyBySocket(helper, socketId), roomId);
  helper.set(getSocketKeyByRoom(helper, roomId), socketId);
}

function delRoomId (helper, socketId, roomId) {
  helper.del(getRoomKeyBySocket(helper, socketId));
  helper.del(getSocketKeyByRoom(helper, roomId));
}

// socketId - roomId
function getRoomKeyBySocket (helper, socketId) {
  return `socket::${socketId}::host::${helper.host}::room`;
}
async function fetchRoomIdsBySocketId (helper, socketId) {
  // console.log('fetchRoomIdsBySocketId', socketId);
  if (!socketId) {
    return [];
  }
  return await helper.fetch(`socket::${socketId}::*::room`);
}

// roomId - socketId
function getSocketKeyByRoom (helper, roomId) {
  return `room::${roomId}::host::${helper.host}::socket`;
}
async function fetchSocketIdsByRoomId (helper, roomId) {
  // console.log('fetchSocketIdsByRoomId', roomId);
  if (!roomId) {
    return [];
  }
  return await helper.fetch(`room::${roomId}::*::socket`);
}
