export default class RedisHelper {
  constructor(client, hostname, port) {
    this.client = client;
    this.hostname = hostname;
    this.port = port;
    this.host = `${hostname}:${port}`;
  }

  init () {
    this.client.keys(`*::host::${this.host}::*`, (err, keys) => {
      keys.forEach((key) => {
        this.del(key);
      });
    });
  }

  keys(keyPattern) {
    return new Promise((resolve, reject) => {
      this.client.keys(keyPattern, (err, keys) => {
        if (err) {
          reject(err);
        } else {
          resolve(keys);
        }
      });
    });
  }

  set(key, val) {
    this.client.set(key, val);
    this.client.expireat(key, expireAt());
  }

  get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, val) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          console.log(val);
          resolve(val);
        }
      });
    });
  }

  fetch(keyPattern) {
    return new Promise((resolve, reject) => {
      this.client.keys(keyPattern, (err, keys) => {
        const gets = keys.map((key) => {
          return this.get(key);
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

  del(key) {
    this.client.del(key);
  }
}

function expireAt() {
  return parseInt((+new Date)/1000) + (86400 * 7); // TODO: 7 days
}
