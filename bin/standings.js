var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var request = require('superagent');

var Season = require('../models/Season');

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

var teamAbbreviationOverrides = {
	WSH: 'WAS'
};

async function fetchStandings() {
	try {
		var response = await request
			.get('https://site.web.api.espn.com/apis/v2/sports/football/nfl/standings')
			.set('User-Agent', 'node-superagent/1.0')
			.query({ level: 3, season: process.env.SEASON });

		var data = JSON.parse(response.text);
		var seasonYear = data.season.year;

		var standingsData = {};

		// Process each conference (AFC/NFC)
		data.children.forEach(conference => {
			// Process each division within the conference
			conference.children.forEach(division => {
				// Entries are pre-sorted by win%, so index = division rank
				division.standings.entries.forEach((entry, divisionRank) => {
					var abbreviation = entry.team.abbreviation;

					if (teamAbbreviationOverrides[abbreviation]) {
						abbreviation = teamAbbreviationOverrides[abbreviation];
					}

					var stats = {};
					entry.stats.forEach(stat => {
						stats[stat.name] = stat.value;
					});

					standingsData[abbreviation] = {
						wins: stats.wins || 0,
						losses: stats.losses || 0,
						ties: stats.ties || 0,
						divisionRank: divisionRank + 1,
						conferenceRank: stats.playoffSeed || null
					};

					console.log(
						abbreviation.padEnd(3),
						(stats.wins + '-' + stats.losses + (stats.ties ? '-' + stats.ties : '')).padEnd(6),
						division.name.padEnd(10),
						'Div:', divisionRank + 1,
						'Seed:', stats.playoffSeed
					);
				});
			});
		});

		if (!process.argv.includes('update')) {
			console.log('\nDry run. Pass "update" to save to database.');
			mongoose.disconnect();
			return;
		}

		var season = await Season.findOne({ year: seasonYear });

		if (!season) {
			console.log('No season found for', seasonYear, '- skipping');
			mongoose.disconnect();
			return;
		}

		var updated = 0;

		season.standings.forEach(standing => {
			var data = standingsData[standing.team];
			if (data) {
				standing.wins = data.wins;
				standing.losses = data.losses;
				standing.ties = data.ties;
				standing.divisionRank = data.divisionRank;
				standing.conferenceRank = data.conferenceRank;
				updated++;
			}
		});

		await season.save();
		console.log('\nUpdated', updated, 'teams');
		mongoose.disconnect();
	}
	catch (error) {
		console.error('Error fetching standings:', error.message);
		mongoose.disconnect();
		process.exit(1);
	}
}

fetchStandings();
