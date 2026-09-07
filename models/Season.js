var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var standingSchema = new Schema({
	team: { type: String, ref: 'Team', required: true },
	wins: { type: Number, default: 0 },
	losses: { type: Number, default: 0 },
	ties: { type: Number, default: 0 },
	divisionRank: { type: Number },
	conferenceRank: { type: Number },
	playoffProbability: { type: Number, min: 0, max: 100 }
}, { _id: false });

var seasonSchema = new Schema({
	year: { type: Number, required: true, unique: true },
	standings: [standingSchema],
	playoffTeams: [{ type: String, ref: 'Team' }],
	weeklyCommentary: { type: Map, of: String },
	playoffsStarted: { type: Boolean, default: false }
});

seasonSchema.methods.isPlayoffTeam = function(teamAbbreviation) {
	return this.playoffTeams.includes(teamAbbreviation);
};

seasonSchema.methods.getStanding = function(teamAbbreviation) {
	return this.standings.find(s => s.team === teamAbbreviation);
};

seasonSchema.methods.getPlayoffProbability = function(teamAbbreviation) {
	var standing = this.getStanding(teamAbbreviation);
	return standing ? standing.playoffProbability : null;
};

module.exports = mongoose.model('Season', seasonSchema);
