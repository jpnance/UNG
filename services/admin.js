var Team = require('../models/team');
var Season = require('../models/Season');
var Commentary = require('../models/Commentary');

function commentaryLookup(teams, standingsMap) {
	var lookup = {};

	teams.forEach(team => {
		var standing = standingsMap[team.abbreviation];
		var entry = {
			name: team.name,
			probability: standing && standing.playoffProbability != null ? standing.playoffProbability : null
		};

		lookup[team.abbreviation.toLowerCase()] = entry;
		lookup[team.name.toLowerCase()] = entry;
	});

	return lookup;
}

module.exports.showCommentary = async function(request, response) {
	try {
		var season = await Season.findOne({ year: process.env.SEASON });
		var teams = await Team.find({});
		var draft = await Commentary.getDraft();

		var standingsMap = {};
		if (season && season.standings) {
			season.standings.forEach(s => { standingsMap[s.team] = s; });
		}

		response.render('admin/commentary', {
			session: request.session,
			commentary: draft.body,
			commentaryTeams: commentaryLookup(teams, standingsMap)
		});
	}
	catch (error) {
		console.error(error);
		response.send(error);
	}
};

module.exports.updateCommentary = async function(request, response) {
	try {
		var draft = await Commentary.getDraft();
		draft.body = request.body.commentary || '';
		await draft.save();

		if (request.xhr) {
			return response.json({ ok: true });
		}

		response.redirect('/admin/commentary');
	}
	catch (error) {
		console.error(error);
		response.status(500).send(error.message);
	}
};

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

		response.render('admin/season', {
			session: request.session,
			season: season,
			teams: teams
		});
	}
	catch (error) {
		console.error(error);
		response.send(error);
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
