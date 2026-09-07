var Team = require('../models/team');
var Season = require('../models/Season');
var Game = require('../models/Game');

module.exports.showSeason = async function(request, response) {
	try {
		var season = await Season.findOne({ year: process.env.SEASON });
		var teams = await Team.find({}).sort({ conference: 1, division: 1, name: 1 });

		if (!season) {
			return response.render('admin/season', {
				session: request.session,
				season: null,
				teams: teams,
				error: 'No season found. Run npm run seed-season first.'
			});
		}

		var standingsMap = {};
		if (season.standings) {
			season.standings.forEach(s => { standingsMap[s.team] = s; });
		}

		var currentWeek = Game.cleanWeek(Game.getWeek());

		response.render('admin/season', {
			session: request.session,
			season: season,
			teams: teams,
			standingsMap: standingsMap,
			currentWeek: currentWeek
		});
	}
	catch (error) {
		console.error(error);
		response.send(error);
	}
};

module.exports.updateProbabilities = async function(request, response) {
	try {
		var season = await Season.findOne({ year: process.env.SEASON });

		if (!season) {
			return response.status(400).send('No season found');
		}

		var teams = await Team.find({});

		teams.forEach(team => {
			var probability = parseFloat(request.body['prob_' + team.abbreviation]);
			if (!isNaN(probability)) {
				var standing = season.standings.find(s => s.team === team.abbreviation);
				if (standing) {
					standing.playoffProbability = probability;
				}
			}
		});

		await season.save();
		response.redirect('/admin/season');
	}
	catch (error) {
		console.error(error);
		response.status(500).send(error.message);
	}
};

module.exports.updateCommentary = async function(request, response) {
	try {
		var season = await Season.findOne({ year: process.env.SEASON });

		if (!season) {
			return response.status(400).send('No season found');
		}

		var week = request.body.week || Game.cleanWeek(Game.getWeek());
		var commentary = request.body.commentary;

		if (!season.weeklyCommentary) {
			season.weeklyCommentary = new Map();
		}

		season.weeklyCommentary.set(String(week), commentary);
		await season.save();

		response.redirect('/admin/season');
	}
	catch (error) {
		console.error(error);
		response.status(500).send(error.message);
	}
};

module.exports.setPlayoffTeams = async function(request, response) {
	try {
		var season = await Season.findOne({ year: process.env.SEASON });

		if (!season) {
			return response.status(400).send('No season found');
		}

		var playoffTeams = [];
		var teams = await Team.find({});

		teams.forEach(team => {
			if (request.body['playoff_' + team.abbreviation] === 'on') {
				playoffTeams.push(team.abbreviation);
			}
		});

		season.playoffTeams = playoffTeams;
		await season.save();

		response.redirect('/admin/season');
	}
	catch (error) {
		console.error(error);
		response.status(500).send(error.message);
	}
};
