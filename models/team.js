var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var teamSchema = new Schema({
	abbreviation: { type: String, required: true, unique: true },
	location: { type: String, required: true },
	name: { type: String, required: true },
	division: { type: String, required: true, enum: ['North', 'South', 'East', 'West'] },
	conference: { type: String, required: true, enum: ['AFC', 'NFC'] }
});

module.exports = mongoose.model('Team', teamSchema);
