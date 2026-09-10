var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var request = require('superagent');

var Game = require('../models/Game');

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

var teamAbbreviationOverrides = {
	WSH: 'WAS'
};

var gamePromises = [];

var scoringStatuses = ['STATUS_IN_PROGRESS', 'STATUS_END_PERIOD', 'STATUS_HALFTIME', 'STATUS_FINAL'];
var unsetClockStatuses = ['STATUS_HALFTIME', 'STATUS_FINAL', 'STATUS_CANCELED'];

request.get('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard').set('User-Agent', 'node-superagent/1.0').end(function(error, response) {
	if (error) {
		console.log(error);
		process.exit();
	}

	var scoreboardData = JSON.parse(response.text);

	if (scoreboardData.season.type != 2 || scoreboardData.season.year != process.env.SEASON) {
		process.exit();
		return;
	}

	var season = scoreboardData.season.year;
	var week = scoreboardData.week.number;

	scoreboardData.events.forEach(footballGame => {
		var competition = footballGame.competitions[0];

		var team0 = competition.competitors[0].team;
		var team1 = competition.competitors[1].team;

		var awayTeam = (competition.competitors[0].homeAway == 'away') ? team0 : team1;
		var homeTeam = (competition.competitors[0].homeAway == 'home') ? team0 : team1;

		if (teamAbbreviationOverrides[awayTeam.abbreviation]) {
			awayTeam.abbreviation = teamAbbreviationOverrides[awayTeam.abbreviation];
		}

		if (teamAbbreviationOverrides[homeTeam.abbreviation]) {
			homeTeam.abbreviation = teamAbbreviationOverrides[homeTeam.abbreviation];
		}

		var conditions = {
			season: season,
			week: week,
			awayTeam: awayTeam.abbreviation,
			homeTeam: homeTeam.abbreviation
		};

		var startDate = competition.startDate;

		var updates = {
			'$set': {
				kickoff: new Date(startDate),
				'status.code': competition.status.type.name
			},
			'$unset': {}
		};

		if (scoringStatuses.includes(competition.status.type.name)) {
			var score0 = parseInt(competition.competitors[0].score);
			var score1 = parseInt(competition.competitors[1].score);

			updates['$set']['awayScore'] = (awayTeam.id == team0.id) ? score0 : score1;
			updates['$set']['homeScore'] = (homeTeam.id == team0.id) ? score0 : score1;
		}
		else {
			updates['$unset']['awayScore'] = true;
			updates['$unset']['homeScore'] = true;
		}

		if (unsetClockStatuses.includes(competition.status.type.name)) {
			updates['$unset']['status.quarter'] = true;
			updates['$unset']['status.clock'] = true;
		}
		else {
			updates['$set']['status.quarter'] = competition.status.period;
			updates['$set']['status.clock'] = competition.status.displayClock;
		}

		console.log(conditions, updates);

		if (process.argv.includes('update')) {
			gamePromises.push(Game.findOneAndUpdate(conditions, updates, { returnDocument: 'after' }));
		}
	});

	Promise.all(gamePromises).then(function(games) {
		mongoose.disconnect();
	});
});
