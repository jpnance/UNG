var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var User = require('../models/user');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true }, seedAdmin)

function seedAdmin(...args) {
	var admin = new User({
		username: 'jpnance',
		firstName: 'Patrick',
		lastName: 'Nance',
		displayName: 'Patrick',
		admin: true
	});

	admin.makeEligibleFor(process.env.SEASON);

	admin.save(function(error) {
		if (error) {
			console.log(error);
		}
		else {
			console.log('Done!');
		}

		process.exit();
	});
}

