export default class RedisHelper {
  constructor(client, hostname, port) {
    this.client = client;
    this.hostname = hostname;
    this.port = port;
  }

  init () {
    this.client.keys(`key::*::${this.hostname}:${this.port}::*`, (err, keys) => {
      // console.log('init', keys);
      keys.forEach((key) => {
        this.client.del(key);
      });
    });
  }

  set (roomId, socketId) {
    const key = this.getKey(roomId, socketId);
    this.client.set(key, socketId);
    this.client.expireat(key, parseInt((+new Date)/1000) + (86400 * 7)); // TODO: 7 days
  }

  fetchSocketIds (roomId) {
    return new Promise((resolve, reject) => {
      this.client.keys(`key::${roomId}::*`, (err, keys) => {
        console.log('fetchSocketIds', keys);
        const gets = keys.map((key) => {
          return promiseGet(this.client, key);
        });
        return Promise.all(gets)
          .then(values => {
            resolve(values);
          })
          .catch(err => {
            reject(err);
          });
      });
    });
  }

  del (roomId, socketId = '*') {
    this.client.del(this.getKey(roomId, socketId));
  }

  getKey(roomId, socketId) {
    return `key::${roomId}::${this.hostname}:${this.port}::${socketId}`;
  }
}

function promiseGet(client, key) {
  return new Promise((resolve, reject) => {
    client.get(key, (err, data) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(data);
      }
    });
  });
}
