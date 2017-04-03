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
const server = app.listen(process.argv[2]);
console.log(`Listening ${process.argv[2]}...`);
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

const helper = new RedisHelper(redis(REDIS_PORT, REDIS_HOST), os.hostname(), process.argv[2]);
helper.init();

/**
 * Events
 */
io.on('connection', (socket) => {
  socket.on('change_room', async (req) => {
    await helper.fetchRoomIds(socket.id)
    .then(oldRoomIds => {
      oldRoomIds.forEach(oldRoomId => {
        console.log('[del]', 'socket', socket.id, 'room', oldRoomId);
        helper.del(oldRoomId, socket.id);
      })
    })

    const roomId = req.roomId;
    console.log('[add]', 'socket', socket.id, 'room', roomId);
    helper.set(roomId, socket.id);
  })
  socket.on('disconnect', () => {
    console.log('disconnect', socket.id, socket.roomId);
    helper.del(socket.roomId, socket.id);
  });
});

/**
 * Routing
 */
router.post('/message', bodyParser(), async (ctx, next) => {
  const {roomId, message} = ctx.request.body;
  console.log('/message', roomId, message);
  await helper.fetchSocketIds(roomId)
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
