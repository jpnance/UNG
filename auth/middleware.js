const apiRequest = require('superagent');
const User = require('../models/user');

async function attachSession(req, res, next) {
	req.session = null;

	if (!req.cookies.sessionKey) {
		return next();
	}

	try {
		const request = apiRequest
			.post(process.env.LOGIN_SERVICE_INTERNAL + '/sessions/retrieve')
			.send({ key: req.cookies.sessionKey });

		if (process.env.NODE_ENV === 'dev') {
			request.disableTLSCerts();
		}

		const response = await request;

		if (response.body?.user) {
			const user = await User.findOne({ username: response.body.user.username });

			if (user) {
				req.session = { username: user.username, user: user };
			}
		}
	} catch (err) {
		console.error('Auth service error:', err.message);
	}

	next();
}

function requireLogin(req, res, next) {
	if (!req.session) {
		return res.redirect('/login');
	}
	next();
}

function requireAdmin(req, res, next) {
	if (!req.session || !req.session.user || !req.session.user.admin) {
		return res.redirect('/');
	}
	next();
}

module.exports = {
	attachSession,
	requireLogin,
	requireAdmin
};
