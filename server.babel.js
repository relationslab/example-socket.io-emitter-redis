import os from 'os';
import Koa from 'koa';
import serve from 'koa-static';
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
app.listen(process.argv[2]);
console.log(`Listening ${process.argv[2]}...`);

/**
 * Redis
 */
const emitter = require('socket.io-emitter')({ host: REDIS_HOST, port: REDIS_PORT });
const redis = require('redis').createClient;
const helper = new RedisHelper(redis(REDIS_PORT, REDIS_HOST), os.hostname(), process.argv[2]);

/**
 * Routing
 */
router.get('/message/to/:id/:message', async (ctx, next) => {
  await helper.fetchSocketIds(ctx.params.id)
    .then(socketIds => {
      console.log('socketIds', socketIds);
      ctx.body = `<p>Sent message to socket ids [${socketIds.join(', ')}]</p>`;
      socketIds.forEach((socketId) => {
        emitter.to(socketId).emit('push_message', `${ctx.params.message} - ${new Date()}`);
      });
    })
    .catch(err => {
      console.log(err);
      ctx.body = err;
    });
});
