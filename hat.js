//Load HTTP module
const http = require("http");
const hostname = '127.0.0.1';
const port = 3000;
var queue = 'hello';
//var amqp = require('amqplib/callback_api');
var amqpconnection = require('amqplib').connect('amqps://blutynvx:p8WJQ3zycShyrUnBWhGL8QRD-30HEvmZ@roedeer.rmq.cloudamqp.com/blutynvx');

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
	  hostname: 'localhost',
	  port: 5555,
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
	amqpSend(data);
	res.statusCode = 200;
	res.end();
  })
})

//listen for request on port 3000, and as a callback function have the port listened on logged
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});