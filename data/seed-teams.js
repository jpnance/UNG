var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var Team = require('../models/team');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true }, seedTeams)

function seedTeams() {
	var teams = [
		{ abbreviation: 'ARI', location: 'Arizona', name: 'Cardinals' },
		{ abbreviation: 'ATL', location: 'Atlanta', name: 'Falcons' },
		{ abbreviation: 'BAL', location: 'Baltimore', name: 'Ravens' },
		{ abbreviation: 'BUF', location: 'Buffalo', name: 'Bills' },
		{ abbreviation: 'CAR', location: 'Carolina', name: 'Panthers' },
		{ abbreviation: 'CHI', location: 'Chicago', name: 'Bears' },
		{ abbreviation: 'CIN', location: 'Cincinnati', name: 'Bengals' },
		{ abbreviation: 'CLE', location: 'Cleveland', name: 'Browns' },
		{ abbreviation: 'DAL', location: 'Dallas', name: 'Cowboys' },
		{ abbreviation: 'DEN', location: 'Denver', name: 'Broncos' },
		{ abbreviation: 'DET', location: 'Detroit', name: 'Lions' },
		{ abbreviation: 'GB', location: 'Green Bay', name: 'Packers' },
		{ abbreviation: 'HOU', location: 'Houston', name: 'Texans' },
		{ abbreviation: 'IND', location: 'Indianapolis', name: 'Colts' },
		{ abbreviation: 'JAX', location: 'Jacksonville', name: 'Jaguars' },
		{ abbreviation: 'KC', location: 'Kansas City', name: 'Chiefs' },
		{ abbreviation: 'LV', location: 'Las Vegas', name: 'Raiders' },
		{ abbreviation: 'LAC', location: 'Los Angeles', name: 'Chargers' },
		{ abbreviation: 'LAR', location: 'Los Angeles', name: 'Rams' },
		{ abbreviation: 'MIA', location: 'Miami', name: 'Dolphins' },
		{ abbreviation: 'MIN', location: 'Minnesota', name: 'Vikings' },
		{ abbreviation: 'NE', location: 'New England', name: 'Patriots' },
		{ abbreviation: 'NO', location: 'New Orleans', name: 'Saints' },
		{ abbreviation: 'NYG', location: 'New York', name: 'Giants' },
		{ abbreviation: 'NYJ', location: 'New York', name: 'Jets' },
		{ abbreviation: 'PHI', location: 'Philadelphia', name: 'Eagles' },
		{ abbreviation: 'PIT', location: 'Pittsburgh', name: 'Steelers' },
		{ abbreviation: 'SF', location: 'San Francisco', name: '49ers' },
		{ abbreviation: 'SEA', location: 'Seattle', name: 'Seahawks' },
		{ abbreviation: 'TB', location: 'Tampa Bay', name: 'Buccaneers' },
		{ abbreviation: 'TEN', location: 'Tennessee', name: 'Titans' },
		{ abbreviation: 'WAS', location: 'Washington', name: 'Commanders' }
	];

	var teamPromises = teams.map(upsertTeam);

	Promise.allSettled(teamPromises).then(disconnectAndExit);
}

function upsertTeam(team) {
	var conditions = {
		abbreviation: team.abbreviation
	};

	return Team.findOneAndUpdate(conditions, team, { upsert: true, useFindAndModify: false });
}

function disconnectAndExit() {
	mongoose.disconnect();
	process.exit();
}
