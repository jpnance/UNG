var Team = require('../models/team');
var Game = require('../models/Game');

module.exports.showTeam = async function(request, response) {
	try {
		var teamAbbreviation = request.params.team.toUpperCase();
		var team = await Team.findOne({ abbreviation: teamAbbreviation });

		if (!team) {
			return response.status(404).send('Team not found');
		}

		var games = await Game.find({
			season: process.env.SEASON,
			week: { $exists: true },
			$or: [
				{ awayTeam: teamAbbreviation },
				{ homeTeam: teamAbbreviation }
			]
		}).sort({ week: 1 });

		var teams = await Team.find({});
		var teamMap = {};
		teams.forEach(t => { teamMap[t.abbreviation] = t; });

		var gamesByWeek = {};
		games.forEach(game => {
			gamesByWeek[game.week] = game;
		});

		var schedule = [];
		for (var week = 1; week <= 18; week++) {
			var game = gamesByWeek[week];

			if (!game) {
				schedule.push({
					week: week,
					isBye: true
				});
				continue;
			}

			var isHome = game.homeTeam === teamAbbreviation;
			var opponent = isHome ? game.awayTeam : game.homeTeam;
			var opponentTeam = teamMap[opponent];

			var result = null;
			var teamScore = null;
			var opponentScore = null;

			if (game.isFinal()) {
				teamScore = isHome ? game.homeScore : game.awayScore;
				opponentScore = isHome ? game.awayScore : game.homeScore;

				if (teamScore > opponentScore) {
					result = 'W';
				} else if (teamScore < opponentScore) {
					result = 'L';
				} else {
					result = 'T';
				}
			}

			schedule.push({
				week: week,
				isBye: false,
				isHome: isHome,
				opponent: opponent,
				opponentName: opponentTeam ? opponentTeam.name : opponent,
				kickoff: game.kickoff,
				result: result,
				teamScore: teamScore,
				opponentScore: opponentScore,
				isFinal: game.isFinal(),
				isPastStartTime: game.isPastStartTime()
			});
		}

		response.render('schedule', {
			session: request.session,
			team: team,
			schedule: schedule
		});
	}
	catch (error) {
		console.error(error);
		response.status(500).send(error.message);
	}
};
