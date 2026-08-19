var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var entrySchema = new Schema({
	user: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	season: {
		type: Number,
		required: true
	},
	score: { type: Number, default: 0 },
	tiebreakers: [{ type: Number }],
	playoffPoints: { type: Number, default: 0 },
	playoffEliminated: { type: Boolean, default: false },
	playoffEliminatedRound: { type: String, enum: ['wild-card', 'divisional', 'conference', 'super-bowl'] }
});

entrySchema.index({ user: 1, season: 1 }, { unique: true });

module.exports = mongoose.model('Entry', entrySchema);
