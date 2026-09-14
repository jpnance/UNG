var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var commentarySchema = new Schema({
	body: { type: String, default: '' }
});

commentarySchema.statics.getDraft = async function() {
	var draft = await this.findOne();

	if (!draft) {
		draft = await this.create({ body: '' });
	}

	return draft;
};

module.exports = mongoose.model('Commentary', commentarySchema);
