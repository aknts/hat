//Preload object count function
function ObjectLength( object ) {
    var length = 0;
    for( var key in object ) {
        if( object.hasOwnProperty(key) ) {
            ++length;
        }
    }
    return length;
};

//Load HTTP module
const http = require("http");
//const config = JSON.parse(Buffer.from(require('./config.js'), 'base64').toString());
//var config = require('./config.json');
/*
var mode = config.appsettings.mode;
var amqphost = config.appsettings.amqphost;
var queue = config.appsettings.amqpqueue;
var httplistenport = config.appsettings.httplistenport;
var httplistenaddress = config.appsettings.httplistenaddress;
var httpsendport = config.appsettings.httpsendport;
var httpsendaddress = config.appsettings.httpsendaddress;
*/
var mode = process.env.mode;
var amqphost = process.env.amqphost;
var queue = process.env.amqpqueue;
var httplistenport = process.env.httplistenport;
var httplistenaddress = process.env.httplistenaddress;
var httpsendport = process.env.httpsendport;
var httpsendaddress = process.env.httpsendaddress;

//console.log(config);
console.log(mode);
console.log(amqphost);
console.log(queue);
console.log(httplistenport);
console.log(httplistenaddress);
console.log(httpsendport);
console.log(httpsendaddress);

var amqpconnection = require('amqplib').connect(amqphost);

function amqpSend(payload) {
	// Publisher
	amqpconnection.then(function(conn) {
	  return conn.createChannel();
	}).then(function(ch) {
	  return ch.assertQueue(queue,{durable: false}).then(function(ok) {
		return ch.sendToQueue(queue, Buffer.from(payload));
	  });
	}).catch(console.warn);
}

// HTTP Request
function httpSend (body) {
	const options = {
	  hostname: httpsendaddress,
	  port: httpsendport,
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
		'Content-Length': body.length
	  }
	}

	const req = http.request(options, res => {
	  console.log(`statusCode: ${res.statusCode}`)

	  res.on('body', d => {
		process.stdout.write(d)
	  })
	})

	req.on('error', error => {
	  console.error(error)
	})

	req.write(body)
	req.end()
}

amqpconnection.then(function(conn) {
  return conn.createChannel();
}).then(function(ch) {
  return ch.assertQueue(queue,{durable: false}).then(function(ok) {
    return ch.consume(queue, function(msg) {
      if (msg !== null) {
        console.log(msg.content.toString());
        ch.ack(msg);
		httpSend(msg.content.toString());
      }
    });
  });
}).catch(console.warn);


//Create HTTP server and listen on port 3000 for requests
const server = http.createServer((req, res) => {
  let data = '';
  req.on('data', chunk => {
    data += chunk;
  })
  req.on('end', () => {
    console.log(JSON.parse(data));
	if (mode == "0"){
		amqpSend(data);
	}
	if (mode == "1") {
		httpSend(data.toString());
	}
	res.statusCode = 200;
	res.end();
  })
})

//listen for request on port 3000, and as a callback function have the port listened on logged
server.listen(httplistenport, httplistenaddress, () => {
  console.log(`Server running at http://${httplistenaddress}:${httplistenport}/`);
});