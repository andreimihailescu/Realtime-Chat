var http = require('http');
var url = require('url');
var fs = require('fs');

var mongo = require('mongodb').MongoClient;
var client = require('socket.io').listen(8082).sockets;

http.createServer(function(req, res) {
	var q = url.parse(req.url, true);
	var filename = "." + q.pathname;

	fs.readFile(filename, function(err, data) {
		if (err) {
			res.writeHead(404, {
				'Content-Type': 'text/html'
			});
			return res.end("404 Not Found");
		}
		res.writeHead(200, {
			'Content-Type': 'text/html'
		});
		res.write(data);
		return res.end();
	});
}).listen(8081);

mongo.connect('mongodb://localhost/chat', function(err, db) {
	if (err) throw err;

	client.on('connection', function(socket) {

		var col = db.collection('messages');
		var sendStatus = function(s) {
			socket.emit('status', s);
		};

		//Emit all messages
		col.find().limit(500).sort({_id: 1}).toArray(function(err, res){
			if(err) throw err;
			socket.emit('output', res);
		});

		//Wait for input
		socket.on('input', function(data) {
			var name = data.name;
			var message = data.message;
			whitespacePattern = /^\s*$/;

			if (whitespacePattern.test(name) || whitespacePattern.test(message)) {
				sendStatus('Name and message is required.');
			} else {
				col.insert({
					name: name,
					message: message
				}, function() {

					// Emit latest message to All clients
					client.emit('output', [data]);

					sendStatus({
						message: "Message sent",
						clear: true
					});
				});
			}

		});
	});
});