var Session = require('./lib/session');

var login = require('./services/login');
var users = require('./services/users');

module.exports = function(app) {
	app.get('/', function(request, response) {
		Session.withActiveSession(request, function(error, session) {
			var templateData = {
				session: session,
				users: []
			};

			response.render('users', templateData);
		});
	});

	app.get('/users', users.showAll);
	app.get('/users/add', users.add);
	app.get('/users/edit/:username', users.edit);

	app.get('/login', login.loginPrompt);
};
