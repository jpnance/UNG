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

