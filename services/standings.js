var User = require('../models/user');
var Team = require('../models/team');
var Season = require('../models/Season');
var Game = require('../models/Game');
var Entry = require('../models/entry');
var RegularSeasonPick = require('../models/RegularSeasonPick');
var pickLock = require('../lib/pickLock');
var elimination = require('../lib/elimination');

module.exports.show = async function(request, response) {
	try {
		var seasonYear = request.params.season || process.env.SEASON;
		var season = await Season.findOne({ year: seasonYear });
		var users = await User.find({ seasons: seasonYear }).sort({ displayName: 1 });
		var teams = await Team.find({});
		var picks = await RegularSeasonPick.find({ season: seasonYear });
		var entries = await Entry.find({ season: seasonYear });

		var teamMap = {};
		teams.forEach(t => { teamMap[t.abbreviation] = t; });

		var entryMap = {};
		entries.forEach(e => { entryMap[e.user.toString()] = e; });

		var currentWeek = Game.cleanWeek(Game.getWeek());
		var games = await Game.find({ season: seasonYear, week: { $lte: currentWeek } });

		var lockState = pickLock.buildPickLockState(games);

		var playoffTeams = season ? season.playoffTeams : [];
		var playoffsSet = playoffTeams.length === 14;

		var standings = users.map(user => {
			var userPicks = picks.filter(p => p.user.toString() === user._id.toString());
			var entry = entryMap[user._id.toString()];

			var score = 0;
			var projectedScore = 0;
			var tiebreakers = [];
			var projectedPickCount = 0;

			userPicks.forEach(pick => {
				var team = teamMap[pick.team];
				var standing = season ? season.getStanding(pick.team) : null;
				var weekFullyStarted = lockState.weeksPastDeadline.has(pick.week);

				if (playoffsSet) {
					if (!playoffTeams.includes(pick.team)) {
						score++;
					}
					else {
						tiebreakers.push(pick.week);
					}
				}
				else if (weekFullyStarted && standing != null && standing.playoffProbability != null) {
					var likelyInPlayoffs = Math.round(standing.playoffProbability / 100);
					var pickValue = 1 - likelyInPlayoffs;
					projectedScore += pickValue;
					projectedPickCount++;
				}
			});

			tiebreakers.sort((a, b) => a - b);

			var eliminatedWeek = elimination.findEliminationWeek(userPicks, lockState);

			return {
				user: user,
				entry: entry,
				score: playoffsSet ? score : null,
				projectedScore: projectedScore,
				visibleProjectedScore: playoffsSet ? null : projectedScore,
				tiebreakers: tiebreakers,
				pickCount: projectedPickCount,
				eliminatedWeek: eliminatedWeek,
				isEliminated: eliminatedWeek != null
			};
		});

		if (playoffsSet) {
			standings.sort((a, b) => {
				if (a.isEliminated !== b.isEliminated) {
					return a.isEliminated ? 1 : -1;
				}
				if (a.isEliminated && b.isEliminated) {
					if (a.eliminatedWeek !== b.eliminatedWeek) {
						return a.eliminatedWeek - b.eliminatedWeek;
					}
					return a.user.displayName.localeCompare(b.user.displayName);
				}
				if (b.score !== a.score) return b.score - a.score;

				for (var i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
					var aTie = a.tiebreakers[i] || 0;
					var bTie = b.tiebreakers[i] || 0;
					if (bTie !== aTie) return bTie - aTie;
				}

				return a.user.displayName.localeCompare(b.user.displayName);
			});
		}
		else {
			standings.sort((a, b) => {
				if (a.isEliminated !== b.isEliminated) {
					return a.isEliminated ? 1 : -1;
				}
				if (a.isEliminated && b.isEliminated) {
					if (a.eliminatedWeek !== b.eliminatedWeek) {
						return a.eliminatedWeek - b.eliminatedWeek;
					}
					return a.user.displayName.localeCompare(b.user.displayName);
				}
				if (b.visibleProjectedScore !== a.visibleProjectedScore) return b.visibleProjectedScore - a.visibleProjectedScore;
				return a.user.displayName.localeCompare(b.user.displayName);
			});
		}

		standings.forEach((standing, index) => {
			if (standing.isEliminated) {
				standing.rank = null;
				return;
			}

			if (index === 0) {
				standing.rank = 1;
				return;
			}

			var prev = null;
			for (var i = index - 1; i >= 0; i--) {
				if (!standings[i].isEliminated) {
					prev = standings[i];
					break;
				}
			}

			if (!prev) {
				standing.rank = 1;
				return;
			}

			if (playoffsSet) {
				if (standing.score === prev.score && JSON.stringify(standing.tiebreakers) === JSON.stringify(prev.tiebreakers)) {
					standing.rank = prev.rank;
				}
				else {
					standing.rank = index + 1;
				}
			}
			else {
				if (standing.visibleProjectedScore === prev.visibleProjectedScore) {
					standing.rank = prev.rank;
				}
				else {
					standing.rank = index + 1;
				}
			}
		});

		var lastDisplayedRank = null;
		standings.forEach(standing => {
			if (standing.isEliminated) {
				standing.showRank = false;
				return;
			}

			standing.showRank = standing.rank !== lastDisplayedRank;
			if (standing.showRank) {
				lastDisplayedRank = standing.rank;
			}
		});

		response.render('standings', {
			session: request.session,
			season: season,
			seasonYear: seasonYear,
			standings: standings,
			playoffsSet: playoffsSet,
			teamMap: teamMap
		});
	}
	catch (error) {
		console.error(error);
		response.send(error);
	}
};
