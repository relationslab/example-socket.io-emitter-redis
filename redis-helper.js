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

  del (roomId, socketId = '*') {
    this.client.del(this.getKey(roomId, socketId));
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

  fetchRoomIds (socketId) {
    console.log('fetchRoomIds', socketId);
    if (!socketId) {
      return [];
    }
    return new Promise((resolve, reject) => {
      this.client.keys(`key::*::${socketId}`, (err, keys) => {
        if (err) {
          resolve([]);
        } else {
          console.log('fetchRoomIds keys', keys);
          const roomIds = keys.map((key) => {
            const tokens = key.split('::');
            return tokens[1];
          })
          resolve(roomIds);
        }
      });
    });
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
