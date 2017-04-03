export default class RedisHelper {
  constructor(client, hostname, port) {
    this.client = client;
    this.hostname = hostname;
    this.port = port;
  }

  init () {
    this.client.keys(`*::host::${this.hostname}:${this.port}::*`, (err, keys) => {
      // console.log('init', keys);
      keys.forEach((key) => {
        this.client.del(key);
      });
    });
  }

  setRoomId (socketId, roomId) {
    // socketId - roomId
    const roomKey = this.getRoomKeyBySocket(socketId);
    this.client.set(roomKey, roomId);
    this.client.expireat(roomKey, expireAt());
    // roomId - socketId
    const socketKey = this.getSocketKeyByRoom(roomId);
    this.client.set(socketKey, socketId);
    this.client.expireat(socketKey, expireAt());
  }

  delRoomId (socketId, roomId) {
    this.client.del(this.getRoomKeyBySocket(socketId));
    this.client.del(this.getSocketKeyByRoom(roomId));
  }

  // socketId - roomId
  getRoomKeyBySocket(socketId) {
    return `socket::${socketId}::host::${this.hostname}:${this.port}::room`;
  }
  fetchRoomIdsBySocketId (socketId) {
    console.log('fetchRoomIdsBySocketId', socketId);
    if (!socketId) {
      return [];
    }
    return fetchValues(this.client, `socket::${socketId}::*::room`);
  }

  // roomId - socketId
  getSocketKeyByRoom(roomId) {
    return `room::${roomId}::host::${this.hostname}:${this.port}::socket`;
  }
  fetchSocketIdsByRoomId (roomId) {
    console.log('fetchSocketIdsByRoomId', roomId);
    if (!roomId) {
      return [];
    }
    return fetchValues(this.client, `room::${roomId}::*::socket`);
  }
}

function fetchValues (client, keyPattern) {
  return new Promise((resolve, reject) => {
    client.keys(keyPattern, (err, keys) => {
      const gets = keys.map((key) => {
        return promiseGet(client, key);
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

function expireAt() {
  return parseInt((+new Date)/1000) + (86400 * 7); // TODO: 7 days
}
