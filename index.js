var dotenv = require('dotenv').config();

var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var app = express();

app.use(express.static(__dirname + '/public'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

var router = express.Router();

app.use(router);

app.set('view engine', 'pug');

require('./routes')(app);

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });

process.env.PORT = process.env.PORT || 3333;

if (process.env.NODE_ENV == 'dev') {
	var fs = require('fs');
	var https = require('https');

	var options = {
		key: fs.readFileSync('./ssl/untitled-key.pem'),
		cert: fs.readFileSync('./ssl/untitled.pem'),
		requestCert: false
	};

	var server = https.createServer(options, app);

	server.listen(process.env.PORT, function() { console.log('https, listening on port ' + process.env.PORT) });
}
else {
	app.listen(process.env.PORT, function() { console.log('http, listening on port ' + process.env.PORT) });
}

process.on('SIGTERM', () => {
	console.log('SIGTERM received, shutting down...');
	server.close(() => {
		mongoose.connection.close(false).then(() => {
			console.log('Closed out remaining connections');
			process.exit(0);
		});
	});
});
