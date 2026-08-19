var Entry = require('../models/entry');
var User = require('../models/user');

module.exports.loginPrompt = function(request, response) {
	var templateData = { session: request.session };

	if (request.query.error == 'invalid-email') {
		templateData.error = { message: 'Invalid email address.' };
	}
	else if (request.query.error == 'not-found') {
		templateData.error = { message: 'No user found for that email address.' };
	}
	else if (request.query.error == 'unknown') {
		templateData.error = { message: 'Unknown server error.' };
	}
	else if (request.query.success == 'email-sent') {
		templateData.success = { message: 'Check your email for your login link!' };
	}

	response.render('login', templateData);
};

module.exports.add = function(request, response) {
	response.render('users/add', { session: request.session });
};

module.exports.signUp = async function(request, response) {
	try {
		var user = new User({
			username: request.body.username,
			firstName: request.body.firstName,
			lastName: request.body.lastName,
			displayName: request.body.displayName
		});

		if (request.body.eligible == 'on') {
			user.makeEligibleFor(process.env.SEASON);
		}

		await user.save();
		response.redirect('/users');
	}
	catch (error) {
		response.send(error);
	}
};

module.exports.edit = async function(request, response) {
	try {
		var user = await User.findOne({ username: request.params.username });

		response.render('users/edit', {
			user: user,
			session: request.session
		});
	}
	catch (error) {
		response.send(error);
	}
};

module.exports.showAll = async function(request, response) {
	try {
		var users = await User.find({}).sort({ username: 1 });
		response.render('users', { users: users, session: request.session });
	}
	catch (error) {
		response.send(error);
	}
};

module.exports.update = async function(request, response) {
	try {
		var user = await User.findOne({ username: request.params.username });

		if (request.session.user.admin) {
			user.firstName = request.body.firstName;
			user.lastName = request.body.lastName;
			user.displayName = request.body.displayName;

			if (request.body.eligible == 'on') {
				user.makeEligibleFor(process.env.SEASON);
			}
			else {
				user.makeUneligibleFor(process.env.SEASON);
			}
		}

		await user.save();
		response.redirect('/users');
	}
	catch (error) {
		response.send(error);
	}
};
