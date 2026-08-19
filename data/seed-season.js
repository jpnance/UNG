var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var Team = require('../models/team');
var Season = require('../models/Season');

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(seedSeason);

async function seedSeason() {
	try {
		var teams = await Team.find({});

		var standings = teams.map(team => ({
			team: team.abbreviation,
			wins: 0,
			losses: 0,
			ties: 0,
			playoffProbability: 50
		}));

		var season = await Season.findOneAndUpdate(
			{ year: process.env.SEASON },
			{
				year: process.env.SEASON,
				currentWeek: 1,
				standings: standings,
				playoffTeams: [],
				playoffsStarted: false
			},
			{ upsert: true, new: true }
		);

		console.log('Seeded season:', season.year);
		console.log('Teams in standings:', season.standings.length);
	}
	catch (error) {
		console.error('Error seeding season:', error);
	}
	finally {
		mongoose.disconnect();
		process.exit();
	}
}
