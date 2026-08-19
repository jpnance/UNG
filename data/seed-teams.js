var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var Team = require('../models/team');

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(seedTeams);

async function seedTeams() {
	var teams = [
		// AFC East
		{ abbreviation: 'BUF', location: 'Buffalo', name: 'Bills', division: 'East', conference: 'AFC' },
		{ abbreviation: 'MIA', location: 'Miami', name: 'Dolphins', division: 'East', conference: 'AFC' },
		{ abbreviation: 'NE', location: 'New England', name: 'Patriots', division: 'East', conference: 'AFC' },
		{ abbreviation: 'NYJ', location: 'New York', name: 'Jets', division: 'East', conference: 'AFC' },
		// AFC North
		{ abbreviation: 'BAL', location: 'Baltimore', name: 'Ravens', division: 'North', conference: 'AFC' },
		{ abbreviation: 'CIN', location: 'Cincinnati', name: 'Bengals', division: 'North', conference: 'AFC' },
		{ abbreviation: 'CLE', location: 'Cleveland', name: 'Browns', division: 'North', conference: 'AFC' },
		{ abbreviation: 'PIT', location: 'Pittsburgh', name: 'Steelers', division: 'North', conference: 'AFC' },
		// AFC South
		{ abbreviation: 'HOU', location: 'Houston', name: 'Texans', division: 'South', conference: 'AFC' },
		{ abbreviation: 'IND', location: 'Indianapolis', name: 'Colts', division: 'South', conference: 'AFC' },
		{ abbreviation: 'JAX', location: 'Jacksonville', name: 'Jaguars', division: 'South', conference: 'AFC' },
		{ abbreviation: 'TEN', location: 'Tennessee', name: 'Titans', division: 'South', conference: 'AFC' },
		// AFC West
		{ abbreviation: 'DEN', location: 'Denver', name: 'Broncos', division: 'West', conference: 'AFC' },
		{ abbreviation: 'KC', location: 'Kansas City', name: 'Chiefs', division: 'West', conference: 'AFC' },
		{ abbreviation: 'LV', location: 'Las Vegas', name: 'Raiders', division: 'West', conference: 'AFC' },
		{ abbreviation: 'LAC', location: 'Los Angeles', name: 'Chargers', division: 'West', conference: 'AFC' },
		// NFC East
		{ abbreviation: 'DAL', location: 'Dallas', name: 'Cowboys', division: 'East', conference: 'NFC' },
		{ abbreviation: 'NYG', location: 'New York', name: 'Giants', division: 'East', conference: 'NFC' },
		{ abbreviation: 'PHI', location: 'Philadelphia', name: 'Eagles', division: 'East', conference: 'NFC' },
		{ abbreviation: 'WAS', location: 'Washington', name: 'Commanders', division: 'East', conference: 'NFC' },
		// NFC North
		{ abbreviation: 'CHI', location: 'Chicago', name: 'Bears', division: 'North', conference: 'NFC' },
		{ abbreviation: 'DET', location: 'Detroit', name: 'Lions', division: 'North', conference: 'NFC' },
		{ abbreviation: 'GB', location: 'Green Bay', name: 'Packers', division: 'North', conference: 'NFC' },
		{ abbreviation: 'MIN', location: 'Minnesota', name: 'Vikings', division: 'North', conference: 'NFC' },
		// NFC South
		{ abbreviation: 'ATL', location: 'Atlanta', name: 'Falcons', division: 'South', conference: 'NFC' },
		{ abbreviation: 'CAR', location: 'Carolina', name: 'Panthers', division: 'South', conference: 'NFC' },
		{ abbreviation: 'NO', location: 'New Orleans', name: 'Saints', division: 'South', conference: 'NFC' },
		{ abbreviation: 'TB', location: 'Tampa Bay', name: 'Buccaneers', division: 'South', conference: 'NFC' },
		// NFC West
		{ abbreviation: 'ARI', location: 'Arizona', name: 'Cardinals', division: 'West', conference: 'NFC' },
		{ abbreviation: 'LAR', location: 'Los Angeles', name: 'Rams', division: 'West', conference: 'NFC' },
		{ abbreviation: 'SF', location: 'San Francisco', name: '49ers', division: 'West', conference: 'NFC' },
		{ abbreviation: 'SEA', location: 'Seattle', name: 'Seahawks', division: 'West', conference: 'NFC' }
	];

	try {
		var teamPromises = teams.map(team => 
			Team.findOneAndUpdate(
				{ abbreviation: team.abbreviation },
				team,
				{ upsert: true, new: true }
			)
		);

		await Promise.all(teamPromises);
		console.log('Seeded', teams.length, 'teams');
	}
	catch (error) {
		console.error('Error seeding teams:', error);
	}
	finally {
		mongoose.disconnect();
		process.exit();
	}
}
