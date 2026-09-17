var Team = require('../models/team');
var Season = require('../models/Season');
var Game = require('../models/Game');
var Entry = require('../models/entry');
var RegularSeasonPick = require('../models/RegularSeasonPick');
var pickLock = require('../lib/pickLock');

var LIVE_STATUSES = ['STATUS_IN_PROGRESS', 'STATUS_END_PERIOD', 'STATUS_HALFTIME'];

function formatKickoff(kickoff) {
	if (!kickoff) {
		return '';
	}

	var parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/New_York',
		weekday: 'short',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	}).formatToParts(new Date(kickoff));

	var weekday = parts.find(p => p.type === 'weekday').value;
	var hour = parts.find(p => p.type === 'hour').value;
	var minute = parts.find(p => p.type === 'minute').value;
	var period = parts.find(p => p.type === 'dayPeriod').value.toLowerCase().replace(/\./g, '');
	var time = minute === '00' ? hour + period : hour + ':' + minute + period;

	return weekday + ' ' + time + ' ET';
}

function matchupForTeam(game, teamAbbreviation) {
	var isHome = game.homeTeam === teamAbbreviation;
	var opponent = isHome ? game.awayTeam : game.homeTeam;
	var teamScore = isHome ? game.homeScore : game.awayScore;
	var opponentScore = isHome ? game.awayScore : game.homeScore;
	var hasScores = teamScore != null && opponentScore != null;
	var statusCode = game.status && game.status.code;
	var matchup = {
		location: isHome ? 'vs' : '@',
		opponent: opponent,
		detail: formatKickoff(game.kickoff),
		resultClass: ''
	};

	if (game.isFinal() && hasScores) {
		if (teamScore > opponentScore) {
			matchup.detail = 'W ' + teamScore + '-' + opponentScore;
			matchup.resultClass = 'text-success';
		}
		else if (teamScore < opponentScore) {
			matchup.detail = 'L ' + teamScore + '-' + opponentScore;
			matchup.resultClass = 'text-danger';
		}
		else {
			matchup.detail = 'T ' + teamScore + '-' + opponentScore;
		}
	}
	else if ((LIVE_STATUSES.includes(statusCode) || game.isPastStartTime()) && hasScores) {
		matchup.detail = teamScore + '-' + opponentScore;
	}

	return matchup;
}

module.exports.show = async function(request, response) {
	try {
		var season = await Season.findOne({ year: process.env.SEASON });
		var teams = await Team.find({}).sort({ name: 1 });

		var standingsMap = {};
		if (season && season.standings) {
			season.standings.forEach(s => { standingsMap[s.team] = s; });
		}

		var conferences = ['AFC', 'NFC'];
		var divisions = ['East', 'North', 'South', 'West'];

		var teamsByDivision = {};
		conferences.forEach(conf => {
			teamsByDivision[conf] = {};
			divisions.forEach(div => {
				teamsByDivision[conf][div] = teams
					.filter(t => t.conference === conf && t.division === div)
					.sort((a, b) => {
						var aRank = (standingsMap[a.abbreviation] && standingsMap[a.abbreviation].divisionRank) || 99;
						var bRank = (standingsMap[b.abbreviation] && standingsMap[b.abbreviation].divisionRank) || 99;
						return aRank - bRank;
					});
			});
		});

		var currentWeek = Game.cleanWeek(Game.getWeek());

		var games = await Game.find({
			season: process.env.SEASON,
			week: currentWeek
		}).sort({ kickoff: 1 });

		var matchupsByTeam = {};
		games.forEach(game => {
			matchupsByTeam[game.awayTeam] = matchupForTeam(game, game.awayTeam);
			matchupsByTeam[game.homeTeam] = matchupForTeam(game, game.homeTeam);
		});

		var templateData = {
			session: request.session,
			season: season,
			teams: teams,
			teamsByDivision: teamsByDivision,
			conferences: conferences,
			divisions: divisions,
			standingsMap: standingsMap,
			currentWeek: currentWeek,
			picks: [],
			usedTeams: [],
			availableTeams: [],
			currentWeekPick: null,
			games: games,
			matchupsByTeam: matchupsByTeam
		};

		if (request.session && request.session.user) {
			var user = request.session.user;

			var picks = await RegularSeasonPick.find({
				user: user._id,
				season: process.env.SEASON
			}).sort({ week: 1 });

			templateData.picks = picks;

			var usedTeams = picks.map(p => p.team);
			templateData.usedTeams = usedTeams;

			templateData.availableTeams = teams.filter(t => !usedTeams.includes(t.abbreviation));

			var currentWeekPick = picks.find(p => p.week == templateData.currentWeek);
			templateData.currentWeekPick = currentWeekPick;

			var lockedTeams = new Set();
			games.forEach(game => {
				if (game.isPastStartTime()) {
					lockedTeams.add(game.awayTeam);
					lockedTeams.add(game.homeTeam);
				}
			});
			templateData.lockedTeams = lockedTeams;

			var weekDeadlinePassed = pickLock.isWeekDeadlinePassed(games);
			templateData.weekDeadlinePassed = weekDeadlinePassed;

			var isPickLocked = false;
			if (currentWeekPick) {
				isPickLocked = lockedTeams.has(currentWeekPick.team) || weekDeadlinePassed;
			}
			templateData.isPickLocked = isPickLocked;
		}

		response.render('home', templateData);
	}
	catch (error) {
		console.error(error);
		response.send(error);
	}
};

module.exports.unpick = async function(request, response) {
	try {
		var user = request.session.user;
		var week = Game.cleanWeek(Game.getWeek());

		var existingPick = await RegularSeasonPick.findOne({
			user: user._id,
			season: process.env.SEASON,
			week: week
		});

		if (!existingPick) {
			return response.redirect('/');
		}

		var teamGame = await Game.findOne({
			season: process.env.SEASON,
			week: week,
			$or: [
				{ awayTeam: existingPick.team },
				{ homeTeam: existingPick.team }
			]
		});

		var weekGames = await Game.find({
			season: process.env.SEASON,
			week: week
		});

		if (teamGame && teamGame.isPastStartTime()) {
			return response.status(400).send('Cannot unpick after your team\'s game has started');
		}

		if (pickLock.isWeekDeadlinePassed(weekGames)) {
			return response.status(400).send('Cannot unpick after the deadline for this week has passed');
		}

		await RegularSeasonPick.deleteOne({ _id: existingPick._id });
		response.redirect('/');
	}
	catch (error) {
		console.error(error);
		response.status(500).send(error.message);
	}
};

module.exports.makePick = async function(request, response) {
	try {
		var user = request.session.user;
		var teamAbbreviation = request.params.team;
		var week = Game.cleanWeek(Game.getWeek());

		var team = await Team.findOne({ abbreviation: teamAbbreviation });
		if (!team) {
			return response.status(400).send('Invalid team');
		}

		var existingPickForTeam = await RegularSeasonPick.findOne({
			user: user._id,
			season: process.env.SEASON,
			team: teamAbbreviation
		});

		if (existingPickForTeam) {
			return response.status(400).send('You have already used this team');
		}

		var teamGame = await Game.findOne({
			season: process.env.SEASON,
			week: week,
			$or: [
				{ awayTeam: teamAbbreviation },
				{ homeTeam: teamAbbreviation }
			]
		});

		if (teamGame && teamGame.isPastStartTime()) {
			return response.status(400).send('This team\'s game has already started');
		}

		var weekDeadlineGame = await Game.findOne({
			season: process.env.SEASON,
			week: week
		}).sort({ kickoff: -1 });

		if (weekDeadlineGame && weekDeadlineGame.isPastStartTime()) {
			return response.status(400).send('The deadline for this week has passed');
		}

		var existingPickForWeek = await RegularSeasonPick.findOne({
			user: user._id,
			season: process.env.SEASON,
			week: week
		});

		if (existingPickForWeek) {
			var existingTeamGame = await Game.findOne({
				season: process.env.SEASON,
				week: week,
				$or: [
					{ awayTeam: existingPickForWeek.team },
					{ homeTeam: existingPickForWeek.team }
				]
			});

			if (existingTeamGame && existingTeamGame.isPastStartTime()) {
				return response.status(400).send('You cannot change your pick after your team\'s game has started');
			}

			existingPickForWeek.team = teamAbbreviation;
			await existingPickForWeek.save();
		}
		else {
			var pick = new RegularSeasonPick({
				user: user._id,
				season: process.env.SEASON,
				week: week,
				team: teamAbbreviation
			});

			await pick.save();
		}

		response.redirect('/');
	}
	catch (error) {
		console.error(error);
		response.status(500).send(error.message);
	}
};
