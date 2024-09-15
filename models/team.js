var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var teamSchema = new Schema({
	abbreviation: { type: String, required: true, unique: true },
	location: { type: String, required: true },
	name: { type: String, required: true }
});

module.exports = mongoose.model('Team', teamSchema);
