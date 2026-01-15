var apiRequest = require('superagent');

var User = require('../models/user');

module.exports.withActiveSession = function(request, callback) {
	if (request.cookies.sessionKey) {
		apiRequest
			.post(process.env.LOGIN_SERVICE_INTERNAL + '/sessions/retrieve')
			.send({ key: request.cookies.sessionKey })
			.then(response => {
				if (response.body?.user == null) {
					callback(null, null);
					return;
				}

				console.log(response.body.user);
				User.findOne({
					username: response.body.user.username
				}).then(function(user) {
					callback(null, { username: user.username, user: user });
				});
			});
	}
	else {
		callback(null, null);
	}
};
