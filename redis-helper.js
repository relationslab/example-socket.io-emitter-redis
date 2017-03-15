export default class RedisHelper {
  constructor(client, hostname, port) {
    this.client = client;
    this.hostname = hostname;
    this.port = port;
  }

  init () {
    this.client.keys(`key:*:${this.hostname}:${this.port}`, (err, keys) => {
      // console.log('init', keys);
      keys.forEach((key) => {
        this.client.del(key);
      });
    });
  }

  set (userId, socketId) {
    this.client.set(this.getKey(userId), socketId);
    this.client.expireat(this.getKey(userId), parseInt((+new Date)/1000) + 86400); // TODO: 1 day
  }

  fetchSocketIds (userId) {
    return new Promise((resolve, reject) => {
      this.client.keys(`key:${userId}:*`, (err, keys) => {
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

  del (userId) {
    this.client.del(this.getKey(userId));
  }

  getKey(userId) {
    return `key:${userId}:${this.hostname}:${this.port}`;
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
