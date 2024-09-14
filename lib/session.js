var apiRequest = require('superagent');

var User = require('../models/user');

module.exports.withActiveSession = function(request, callback) {
	if (request.cookies.sessionKey) {
		apiRequest
			.post(process.env.LOGIN_SERVICE_INTERNAL + '/sessions/retrieve')
			.send({ key: request.cookies.sessionKey })
			.then(response => {
				User.findOne({
					username: response.body.user.username
				}).then(function(user) {
					callback(null, { username: user.username, user: user });
				});
			})
			.catch(error => {
				callback(error, null);
			});
	}
	else {
		callback(null, null);
	}
};
