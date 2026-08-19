var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var User = require('../models/user');

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(seedAdmin);

async function seedAdmin() {
	try {
		var admin = await User.findOneAndUpdate(
			{ username: 'jpnance' },
			{
				username: 'jpnance',
				firstName: 'Patrick',
				lastName: 'Nance',
				displayName: 'Patrick',
				admin: true
			},
			{ upsert: true, new: true }
		);

		admin.makeEligibleFor(process.env.SEASON);
		await admin.save();

		console.log('Seeded admin:', admin.username);
	}
	catch (error) {
		console.error('Error seeding admin:', error);
	}
	finally {
		mongoose.disconnect();
		process.exit();
	}
}

