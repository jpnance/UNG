var User = require('../models/user');
var Team = require('../models/team');
var Season = require('../models/Season');
var Game = require('../models/Game');
var RegularSeasonPick = require('../models/RegularSeasonPick');
var pickLock = require('../lib/pickLock');
var elimination = require('../lib/elimination');

module.exports.showAll = async function(request, response) {
	try {
		var season = await Season.findOne({ year: process.env.SEASON });
		var users = await User.find({ seasons: process.env.SEASON }).sort({ displayName: 1 });
		var teams = await Team.find({});
		var picks = await RegularSeasonPick.find({ season: process.env.SEASON });

		var teamMap = {};
		teams.forEach(t => { teamMap[t.abbreviation] = t; });

		var currentWeek = Game.cleanWeek(Game.getWeek());
		var games = await Game.find({ season: process.env.SEASON, week: { $lte: currentWeek } });

		var lockState = pickLock.buildPickLockState(games);

		var pickGrid = [];

		users.forEach(user => {
			var userPicks = picks.filter(p => p.user.toString() === user._id.toString());
			var eliminatedWeek = elimination.findEliminationWeek(userPicks, lockState);
			var isCurrentUser = request.session && request.session.user && request.session.user._id.toString() === user._id.toString();
			var row = {
				user: user,
				eliminatedWeek: eliminatedWeek,
				isEliminated: eliminatedWeek != null,
				weeks: []
			};

			for (var week = 1; week <= 18; week++) {
				var pick = userPicks.find(p => p.week === week);
				var cell = {
					week: week,
					team: null,
					locked: false,
					visible: false,
					missed: false,
					afterElimination: eliminatedWeek != null && week > eliminatedWeek
				};

				if (pick) {
					cell.team = teamMap[pick.team];
					cell.teamAbbreviation = pick.team;
					cell.locked = pickLock.isPickLocked(pick.week, pick.team, lockState);
					cell.visible = cell.locked || isCurrentUser;
				}
				else if (!pick && lockState.weeksPastDeadline.has(week)) {
					if (eliminatedWeek != null && week > eliminatedWeek) {
						cell.afterElimination = true;
						cell.visible = true;
					}
					else {
						cell.missed = true;
						cell.visible = true;
					}
				}

				row.weeks.push(cell);
			}

			pickGrid.push(row);
		});

		var teamGrid = teams
			.slice()
			.sort((a, b) => a.abbreviation.localeCompare(b.abbreviation))
			.map(team => ({
				abbreviation: team.abbreviation,
				weeks: new Array(18).fill(0),
				total: 0
			}));

		var teamIndex = {};
		teamGrid.forEach(row => { teamIndex[row.abbreviation] = row; });

		pickGrid.forEach(row => {
			row.weeks.forEach(cell => {
				if (!cell.teamAbbreviation || !cell.locked) {
					return;
				}

				var tally = teamIndex[cell.teamAbbreviation];
				if (!tally) {
					return;
				}

				tally.weeks[cell.week - 1]++;
				tally.total++;
			});
		});

		response.render('picks', {
			session: request.session,
			season: season,
			pickGrid: pickGrid,
			teamGrid: teamGrid,
			currentWeek: currentWeek
		});
	}
	catch (error) {
		console.error(error);
		response.send(error);
	}
};
