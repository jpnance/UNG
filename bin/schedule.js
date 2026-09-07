var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var request = require('superagent');

var Game = require('../models/Game');

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

var teamAbbreviationOverrides = {
	WSH: 'WAS'
};

var weekPromises = [];
var gamePromises = [];

for (var week = 1; week <= 18; week++) {
	weekPromises.push(
		request
			.get('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard')
			.set('User-Agent', 'node-superagent/1.0')
			.query({ dates: process.env.SEASON, seasontype: 2, week: week })
			.then(function(response) {
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
						}
					};

					console.log(conditions, updates);

					if (process.argv.includes('update')) {
						gamePromises.push(Game.findOneAndUpdate(conditions, updates, { returnDocument: 'after', upsert: true }));
					}
				});
			})
			.catch(function(error) {
				if (error) {
					console.log(error);
					process.exit();
				}
			})
	);
}

Promise.all(weekPromises).then(function() {
	Promise.all(gamePromises).then(function(games) {
		mongoose.disconnect();
	});
});
