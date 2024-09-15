var Session = require('../lib/session');

var User = require('../models/user');

module.exports.add = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		if (session && session.user.admin) {
			response.render('users/add', { session: session });
		}
		else {
			response.redirect('/');
		}
	});
};

module.exports.edit = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		if (session && (request.params.username == session.user.username || session.user.admin)) {
			User.findOne({ username: request.params.username }).exec(function(error, user) {
				var responseData = {
					user: user,
					session: session
				};

				if (error) {
					response.send(error);
				}

				response.render('users/edit', responseData);
			});
		}
		else {
			response.redirect('/');
		}
	});
};

module.exports.showAll = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		if (session && session.user.admin) {
			User.find({}).sort({ username: 1 }).then(function(users) {
				response.render('users', { users: users, session: session });
			});
		}
		else {
			response.redirect('/');
		}
	});
};

module.exports.update = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		if (!session || (session.user.username != request.params.username && !session.user.admin)) {
			response.redirect('/');
			return;
		}

		var data = [
			User.findOne({ username: request.params.username })
		];

		Promise.all(data).then(function(values) {
			var user = values[0];

			if (session.user.admin) {
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

			user.save(function(error) {
				if (error) {
					response.send(error);
				}
				else {
					response.redirect('/users');
				}
			});
		});
	});
};
