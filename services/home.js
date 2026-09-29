var Team = require('../models/team');
var Season = require('../models/Season');
var Game = require('../models/Game');
var Entry = require('../models/entry');
var RegularSeasonPick = require('../models/RegularSeasonPick');
var pickLock = require('../lib/pickLock');
var elimination = require('../lib/elimination');

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

function wantsPickJson(request) {
	return request.xhr || request.accepts('json');
}

function respondPickError(request, response, statusCode, message) {
	if (wantsPickJson(request)) {
		return response.status(statusCode).json({ ok: false, error: message });
	}

	return response.status(statusCode).send(message);
}

function serializePickState(state) {
	return {
		currentWeek: state.currentWeek,
		picks: state.picks.map(p => ({ week: p.week, team: p.team })),
		currentWeekPick: state.currentWeekPick
			? { week: state.currentWeekPick.week, team: state.currentWeekPick.team }
			: null,
		isPickLocked: state.isPickLocked,
		isEliminated: state.isEliminated,
		eliminatedWeek: state.eliminatedWeek,
		weekDeadlinePassed: state.weekDeadlinePassed,
		lockedTeams: Array.from(state.lockedTeams)
	};
}

async function respondPickSuccess(request, response, user) {
	if (wantsPickJson(request)) {
		var state = await loadUserPickState(user);
		return response.json({ ok: true, ...serializePickState(state) });
	}

	return response.redirect('/');
}

async function loadUserPickState(user) {
	var currentWeek = Game.cleanWeek(Game.getWeek());

	var picks = await RegularSeasonPick.find({
		user: user._id,
		season: process.env.SEASON
	}).sort({ week: 1 });

	var usedTeams = picks.map(p => p.team);
	var currentWeekPick = picks.find(p => p.week == currentWeek);

	var games = await Game.find({
		season: process.env.SEASON,
		week: currentWeek
	}).sort({ kickoff: 1 });

	var gamesThroughCurrentWeek = await Game.find({
		season: process.env.SEASON,
		week: { $lte: currentWeek }
	});

	var lockedTeams = new Set();
	games.forEach(game => {
		if (game.isPastStartTime()) {
			lockedTeams.add(game.awayTeam);
			lockedTeams.add(game.homeTeam);
		}
	});

	var weekDeadlinePassed = pickLock.isWeekDeadlinePassed(games);
	var lockState = pickLock.buildPickLockState(gamesThroughCurrentWeek);
	var eliminatedWeek = elimination.findEliminationWeek(picks, lockState);
	var isEliminated = eliminatedWeek != null;

	var isPickLocked = isEliminated;
	if (!isPickLocked && currentWeekPick) {
		isPickLocked = lockedTeams.has(currentWeekPick.team) || weekDeadlinePassed;
	}
	else if (!isPickLocked && weekDeadlinePassed) {
		isPickLocked = true;
	}

	return {
		currentWeek: currentWeek,
		picks: picks,
		usedTeams: usedTeams,
		currentWeekPick: currentWeekPick,
		lockedTeams: lockedTeams,
		weekDeadlinePassed: weekDeadlinePassed,
		eliminatedWeek: eliminatedWeek,
		isEliminated: isEliminated,
		isPickLocked: isPickLocked
	};
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
			var pickState = await loadUserPickState(request.session.user);
			Object.assign(templateData, pickState);
			templateData.availableTeams = teams.filter(t => !pickState.usedTeams.includes(t.abbreviation));
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

		var seasonPicks = await RegularSeasonPick.find({
			user: user._id,
			season: process.env.SEASON
		});
		var gamesThroughWeek = await Game.find({
			season: process.env.SEASON,
			week: { $lte: week }
		});
		var lockState = pickLock.buildPickLockState(gamesThroughWeek);
		if (elimination.isEliminated(seasonPicks, lockState)) {
			return respondPickError(request, response, 403, 'You have been eliminated and cannot change picks');
		}

		var existingPick = await RegularSeasonPick.findOne({
			user: user._id,
			season: process.env.SEASON,
			week: week
		});

		if (!existingPick) {
			return respondPickSuccess(request, response, user);
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
			return respondPickError(request, response, 400, 'Cannot unpick after your team\'s game has started');
		}

		if (pickLock.isWeekDeadlinePassed(weekGames)) {
			return respondPickError(request, response, 400, 'Cannot unpick after the deadline for this week has passed');
		}

		await RegularSeasonPick.deleteOne({ _id: existingPick._id });
		return respondPickSuccess(request, response, user);
	}
	catch (error) {
		console.error(error);
		return respondPickError(request, response, 500, error.message);
	}
};

module.exports.makePick = async function(request, response) {
	try {
		var user = request.session.user;
		var teamAbbreviation = request.params.team;
		var week = Game.cleanWeek(Game.getWeek());

		var seasonPicks = await RegularSeasonPick.find({
			user: user._id,
			season: process.env.SEASON
		});
		var gamesThroughWeek = await Game.find({
			season: process.env.SEASON,
			week: { $lte: week }
		});
		var lockState = pickLock.buildPickLockState(gamesThroughWeek);
		if (elimination.isEliminated(seasonPicks, lockState)) {
			return respondPickError(request, response, 403, 'You have been eliminated and cannot make picks');
		}

		var team = await Team.findOne({ abbreviation: teamAbbreviation });
		if (!team) {
			return respondPickError(request, response, 400, 'Invalid team');
		}

		var existingPickForTeam = await RegularSeasonPick.findOne({
			user: user._id,
			season: process.env.SEASON,
			team: teamAbbreviation
		});

		if (existingPickForTeam) {
			return respondPickError(request, response, 400, 'You have already used this team');
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
			return respondPickError(request, response, 400, 'This team\'s game has already started');
		}

		var weekDeadlineGame = await Game.findOne({
			season: process.env.SEASON,
			week: week
		}).sort({ kickoff: -1 });

		if (weekDeadlineGame && weekDeadlineGame.isPastStartTime()) {
			return respondPickError(request, response, 400, 'The deadline for this week has passed');
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
				return respondPickError(request, response, 400, 'You cannot change your pick after your team\'s game has started');
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

		return respondPickSuccess(request, response, user);
	}
	catch (error) {
		console.error(error);
		return respondPickError(request, response, 500, error.message);
	}
};
