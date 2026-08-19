var users = require('./services/users');
var home = require('./services/home');
var picks = require('./services/picks');
var standings = require('./services/standings');
var admin = require('./services/admin');

var { requireLogin, requireAdmin } = require('./auth/middleware');

module.exports = function(app) {
	app.get('/', home.show);

	app.get('/login', users.loginPrompt);

	app.get('/pick/:team', requireLogin, home.makePick);
	app.get('/unpick', requireLogin, home.unpick);

	app.get('/picks', picks.showAll);

	app.get('/standings', standings.show);
	app.get('/standings/:season(\\d{4})', standings.show);

	app.get('/rules', function(request, response) {
		response.render('rules', { session: request.session });
	});

	app.get('/users', requireAdmin, users.showAll);
	app.get('/users/add', requireAdmin, users.add);
	app.post('/users/add', requireAdmin, users.signUp);
	app.get('/users/edit/:username', requireAdmin, users.edit);
	app.post('/users/edit/:username', requireAdmin, users.update);

	app.get('/admin/season', requireAdmin, admin.showSeason);
	app.post('/admin/season/probabilities', requireAdmin, admin.updateProbabilities);
	app.post('/admin/season/commentary', requireAdmin, admin.updateCommentary);
	app.post('/admin/season/week', requireAdmin, admin.updateWeek);
	app.post('/admin/season/playoffs', requireAdmin, admin.setPlayoffTeams);
};
