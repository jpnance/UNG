var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var regularSeasonPickSchema = new Schema({
	user: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	season: {
		type: Number,
		required: true
	},
	week: {
		type: Number,
		required: true,
		min: 1,
		max: 18
	},
	team: {
		type: String,
		ref: 'Team',
		required: true
	}
});

regularSeasonPickSchema.index({ user: 1, season: 1, week: 1 }, { unique: true });
regularSeasonPickSchema.index({ user: 1, season: 1, team: 1 }, { unique: true });

regularSeasonPickSchema.virtual('teamDoc', {
	ref: 'Team',
	localField: 'team',
	foreignField: 'abbreviation',
	justOne: true
});

module.exports = mongoose.model('RegularSeasonPick', regularSeasonPickSchema);
