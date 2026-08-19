const apiRequest = require('superagent');
const User = require('../models/user');

async function attachSession(req, res, next) {
	req.session = null;

	if (!req.cookies.sessionKey) {
		console.log('Auth: No sessionKey cookie');
		return next();
	}

	try {
		console.log('Auth: Found sessionKey, validating...');
		const request = apiRequest
			.post(process.env.LOGIN_SERVICE_INTERNAL + '/sessions/retrieve')
			.send({ key: req.cookies.sessionKey });

		if (process.env.NODE_ENV === 'dev') {
			request.disableTLSCerts();
		}

		const response = await request;

		if (response.body?.user) {
			console.log('Auth: Login service returned user:', response.body.user.username);
			const user = await User.findOne({ username: response.body.user.username });

			if (user) {
				console.log('Auth: Found user in DB:', user.username);
				req.session = { username: user.username, user: user };
			} else {
				console.log('Auth: User not found in UNG database');
			}
		} else {
			console.log('Auth: Login service returned no user');
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
