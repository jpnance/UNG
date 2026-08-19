var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var gameSchema = new Schema({
	season: { type: Number, required: true },
	week: { type: Number },
	round: { type: String, enum: ['wild-card', 'divisional', 'conference', 'super-bowl'] },
	awayTeam: { type: String, ref: 'Team', required: true },
	homeTeam: { type: String, ref: 'Team', required: true },
	kickoff: { type: Date },
	awayScore: { type: Number },
	homeScore: { type: Number },
	status: {
		code: { type: String, default: 'scheduled' },
		quarter: { type: Number },
		clock: { type: String }
	}
});

gameSchema.virtual('awayTeamDoc', {
	ref: 'Team',
	localField: 'awayTeam',
	foreignField: 'abbreviation',
	justOne: true
});

gameSchema.virtual('homeTeamDoc', {
	ref: 'Team',
	localField: 'homeTeam',
	foreignField: 'abbreviation',
	justOne: true
});

gameSchema.methods.isPlayoffGame = function() {
	return this.round != null;
};

gameSchema.methods.hasStartTime = function() {
	return this.kickoff != null;
};

gameSchema.methods.isPastStartTime = function() {
	return this.kickoff && Date.now() >= this.kickoff;
};

gameSchema.methods.isFinal = function() {
	return this.status.code === 'final';
};

gameSchema.methods.getLoser = function() {
	if (!this.isFinal() || this.awayScore == null || this.homeScore == null) {
		return null;
	}
	if (this.awayScore < this.homeScore) {
		return this.awayTeam;
	}
	if (this.homeScore < this.awayScore) {
		return this.homeTeam;
	}
	return null;
};

gameSchema.methods.getWinner = function() {
	if (!this.isFinal() || this.awayScore == null || this.homeScore == null) {
		return null;
	}
	if (this.awayScore > this.homeScore) {
		return this.awayTeam;
	}
	if (this.homeScore > this.awayScore) {
		return this.homeTeam;
	}
	return null;
};

gameSchema.statics.kickoffSort = function(a, b) {
	if (a.kickoff < b.kickoff) return -1;
	if (a.kickoff > b.kickoff) return 1;
	return 0;
};

module.exports = mongoose.model('Game', gameSchema);
