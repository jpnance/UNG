var CLINCHED_CODES = { x: true, y: true, z: true, '*': true };

function hasClinchedPlayoffSpot(clincherCode) {
	return clincherCode != null && CLINCHED_CODES[clincherCode] === true;
}

function formatPlayoffProbability(probability, clincherCode) {
	if (probability == null) {
		return null;
	}

	var rounded = Math.round(probability * 10) / 10;

	if (clincherCode === 'e') {
		return rounded.toFixed(1) + '%';
	}

	if (hasClinchedPlayoffSpot(clincherCode)) {
		return rounded.toFixed(1) + '%';
	}

	if (rounded <= 0) {
		return '<0.1%';
	}

	if (rounded >= 100) {
		return '>99.9%';
	}

	return rounded.toFixed(1) + '%';
}

module.exports = {
	hasClinchedPlayoffSpot,
	formatPlayoffProbability
};
