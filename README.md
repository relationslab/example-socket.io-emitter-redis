# Example: Notification from backend with Socket.io and Redis 

This sample is demonstrating sending events via socket, which coming from where isn't Socket.io context. e.g. database, batch, etc. To send those events to browsers via socket, it can be achieved with socket.io-emitter. Also, I combined this sample with Redis to proof scalability.

## Prerequisites

Docker for Mac/Windows, etc. I'm using docker-compose.

## Set up

### Running Redis

```$xslt
$ docker-compose up
```

If you want to stop docker, just hit Ctrl+C.

Quick redis-cli memo. 

```$xslt
$ redis-cli # connect to redis
$ > flushall # delete all
$ > keys * # check all keys
$ > get <key> # get value
```

You can install redis-cli via brew install redis.

### Install dependencies

```$xslt
$ npm install
```

### Build client's source codes

```$xslt
$ npm run build
```

## Demo

Run server with port 3000

```$xslt
$ node index.js 3000
```

Run server with port 4000

```$xslt
$ node index.js 4000
```

* Open [http://lcoalhost:3000?id=1](http://lcoalhost:3000?id=1), assuming this screen is for user 1. 
* Next, open [http://lcoalhost:4000?id=2](http://lcoalhost:4000?id=2) on different browser (tab). This is for user 2.
* To send message, open [http://lcoalhost:3000/message/to/2/Hello](http://lcoalhost:3000/message/to/2/Hello) on different browser or tab. This is for message to user 2 and message content is "Hello".
* Next, change URL to [http://lcoalhost:3000/message/to/1/Hi](http://lcoalhost:3000/message/to/1/Hi). This is for message to user 1 and message content is "Hi".

You can send message to specific users.
