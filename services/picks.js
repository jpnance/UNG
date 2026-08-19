var User = require('../models/user');
var Team = require('../models/team');
var Season = require('../models/Season');
var Game = require('../models/Game');
var RegularSeasonPick = require('../models/RegularSeasonPick');

module.exports.showAll = async function(request, response) {
	try {
		var season = await Season.findOne({ year: process.env.SEASON });
		var users = await User.find({ seasons: process.env.SEASON }).sort({ displayName: 1 });
		var teams = await Team.find({});
		var picks = await RegularSeasonPick.find({ season: process.env.SEASON });

		var teamMap = {};
		teams.forEach(t => { teamMap[t.abbreviation] = t; });

		var games = await Game.find({ season: process.env.SEASON, week: { $lte: season ? season.currentWeek : 1 } });

		var lockedTeams = new Set();
		games.forEach(game => {
			if (game.isPastStartTime()) {
				lockedTeams.add(game.awayTeam);
				lockedTeams.add(game.homeTeam);
			}
		});

		var pickGrid = [];

		users.forEach(user => {
			var userPicks = picks.filter(p => p.user.toString() === user._id.toString());
			var row = {
				user: user,
				weeks: []
			};

			for (var week = 1; week <= 18; week++) {
				var pick = userPicks.find(p => p.week === week);
				var cell = {
					week: week,
					team: null,
					locked: false,
					visible: false
				};

				if (pick) {
					cell.team = teamMap[pick.team];
					cell.teamAbbreviation = pick.team;
					cell.locked = lockedTeams.has(pick.team);
					cell.visible = cell.locked || (request.session && request.session.user && request.session.user._id.toString() === user._id.toString());
				}

				row.weeks.push(cell);
			}

			pickGrid.push(row);
		});

		response.render('picks', {
			session: request.session,
			season: season,
			pickGrid: pickGrid,
			currentWeek: season ? season.currentWeek : 1
		});
	}
	catch (error) {
		console.error(error);
		response.send(error);
	}
};
