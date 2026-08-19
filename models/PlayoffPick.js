var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playoffPickSchema = new Schema({
	user: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	season: {
		type: Number,
		required: true
	},
	game: {
		type: Schema.Types.ObjectId,
		ref: 'Game',
		required: true
	},
	team: {
		type: String,
		ref: 'Team',
		required: true
	}
});

playoffPickSchema.index({ user: 1, game: 1 }, { unique: true });

playoffPickSchema.virtual('teamDoc', {
	ref: 'Team',
	localField: 'team',
	foreignField: 'abbreviation',
	justOne: true
});

module.exports = mongoose.model('PlayoffPick', playoffPickSchema);
