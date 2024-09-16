var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var pickSchema = new Schema({
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
		required: true
	},
	team: {
		type: Schema.Types.ObjectId,
		ref: 'Team',
	}
});

module.exports = mongoose.model('Pick', pickSchema);
