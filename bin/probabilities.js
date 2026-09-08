var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var request = require('superagent');

var Season = require('../models/Season');

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

var teamAbbreviationOverrides = {
	WSH: 'WAS'
};

async function fetchProbabilities() {
	try {
		var response = await request
			.get('https://site.web.api.espn.com/apis/fitt/v3/sports/football/nfl/powerindex')
			.set('User-Agent', 'node-superagent/1.0')
			.query({ region: 'us', lang: 'en' });

		var data = JSON.parse(response.text);
		var seasonYear = data.currentSeason?.year;

		var probabilities = {};

		data.teams.forEach(entry => {
			var abbreviation = entry.team.abbreviation;

			if (teamAbbreviationOverrides[abbreviation]) {
				abbreviation = teamAbbreviationOverrides[abbreviation];
			}

			var projections = entry.categories.find(c => c.name === 'projections');
			var playoffProbability = projections ? projections.values[5] : null;

			if (playoffProbability !== null) {
				probabilities[abbreviation] = Math.round(playoffProbability * 10) / 10;
			}

			console.log(abbreviation, playoffProbability !== null ? playoffProbability.toFixed(1) + '%' : 'N/A');
		});

		if (process.argv.includes('--dry-run')) {
			console.log('\nDry run. Omit --dry-run to save to database.');
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
			if (probabilities[standing.team] !== undefined) {
				standing.playoffProbability = probabilities[standing.team];
				updated++;
			}
		});

		await season.save();
		console.log('\nUpdated', updated, 'teams');
		mongoose.disconnect();
	}
	catch (error) {
		console.error('Error fetching probabilities:', error.message);
		mongoose.disconnect();
		process.exit(1);
	}
}

fetchProbabilities();
