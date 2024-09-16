var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.Types.ObjectId;

var Pick = require('./pick');

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
	picks: [{
		type: Schema.Types.ObjectId,
		ref: 'Pick',
		default: []
	}]
});

entrySchema.statics.initialize = function(user, season) {
	var weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

	return new Promise(function(fulfill, reject) {
		var pickPromises = weeks.map(function(week) {
			var conditions = {
				user: new ObjectId(user._id),
				season: season,
				week: week
			};

			var pick = {
				user: new ObjectId(user._id),
				season: season,
				week: week
			};

			return Pick.findOneAndUpdate(conditions, pick, { upsert: true, useFindAndModify: false });
		});

		Promise.allSettled(pickPromises).then(function(picks) {
			//console.log(picks);
			fulfill(null);
		});
	});
};

module.exports = mongoose.model('Entry', entrySchema);
