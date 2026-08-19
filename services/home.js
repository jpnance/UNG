var Team = require('../models/team');
var Season = require('../models/Season');
var Game = require('../models/Game');
var Entry = require('../models/entry');
var RegularSeasonPick = require('../models/RegularSeasonPick');

module.exports.show = async function(request, response) {
	try {
		var season = await Season.findOne({ year: process.env.SEASON });
		var teams = await Team.find({}).sort({ name: 1 });

		var templateData = {
			session: request.session,
			season: season,
			teams: teams,
			currentWeek: season ? season.currentWeek : 1,
			picks: [],
			usedTeams: [],
			availableTeams: [],
			currentWeekPick: null,
			games: []
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

			var games = await Game.find({
				season: process.env.SEASON,
				week: templateData.currentWeek
			}).sort({ kickoff: 1 });

			templateData.games = games;
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
		var season = await Season.findOne({ year: process.env.SEASON });
		var week = season ? season.currentWeek : 1;

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

		if (teamGame && teamGame.isPastStartTime()) {
			return response.status(400).send('Cannot unpick after your team\'s game has started');
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
		var season = await Season.findOne({ year: process.env.SEASON });
		var week = season ? season.currentWeek : 1;

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
