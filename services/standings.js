var User = require('../models/user');
var Team = require('../models/team');
var Season = require('../models/Season');
var Game = require('../models/Game');
var Entry = require('../models/entry');
var RegularSeasonPick = require('../models/RegularSeasonPick');

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

		var playoffTeams = season ? season.playoffTeams : [];
		var playoffsSet = playoffTeams.length === 14;

		var standings = users.map(user => {
			var userPicks = picks.filter(p => p.user.toString() === user._id.toString());
			var entry = entryMap[user._id.toString()];

			var score = 0;
			var projectedScore = 0;
			var tiebreakers = [];

			userPicks.forEach(pick => {
				var team = teamMap[pick.team];
				var standing = season ? season.getStanding(pick.team) : null;
				var probability = standing ? standing.playoffProbability : 50;

				if (playoffsSet) {
					if (!playoffTeams.includes(pick.team)) {
						score++;
					}
					else {
						tiebreakers.push(pick.week);
					}
				}
				else {
					projectedScore += (100 - (probability || 50)) / 100;
				}
			});

			tiebreakers.sort((a, b) => a - b);

			return {
				user: user,
				entry: entry,
				score: playoffsSet ? score : null,
				projectedScore: playoffsSet ? null : projectedScore,
				tiebreakers: tiebreakers,
				pickCount: userPicks.length
			};
		});

		if (playoffsSet) {
			standings.sort((a, b) => {
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
				if (b.projectedScore !== a.projectedScore) return b.projectedScore - a.projectedScore;
				return a.user.displayName.localeCompare(b.user.displayName);
			});
		}

		var rank = 1;
		standings.forEach((standing, index) => {
			if (index > 0) {
				var prev = standings[index - 1];
				if (playoffsSet) {
					if (standing.score === prev.score && JSON.stringify(standing.tiebreakers) === JSON.stringify(prev.tiebreakers)) {
						standing.rank = prev.rank;
					}
					else {
						standing.rank = index + 1;
					}
				}
				else {
					if (Math.abs(standing.projectedScore - prev.projectedScore) < 0.001) {
						standing.rank = prev.rank;
					}
					else {
						standing.rank = index + 1;
					}
				}
			}
			else {
				standing.rank = 1;
			}
		});

		var currentWeek = Game.cleanWeek(Game.getWeek());
		var commentary = null;
		if (season && season.weeklyCommentary) {
			commentary = season.weeklyCommentary.get(String(currentWeek));
			if (commentary) {
				commentary = renderCommentary(commentary, season, teamMap);
			}
		}

		response.render('standings', {
			session: request.session,
			season: season,
			seasonYear: seasonYear,
			standings: standings,
			playoffsSet: playoffsSet,
			commentary: commentary,
			teamMap: teamMap
		});
	}
	catch (error) {
		console.error(error);
		response.send(error);
	}
};

function renderCommentary(text, season, teamMap) {
	return text.replace(/@([A-Z]{2,3})/g, function(match, abbrev) {
		var team = teamMap[abbrev];
		if (!team) return match;

		var standing = season.getStanding(abbrev);
		var probability = standing ? standing.playoffProbability : null;

		if (probability !== null) {
			return team.name + ' (' + probability + '%)';
		}
		return team.name;
	});
}
