function parseClincherCode(entry) {
	var clincherStat = entry.stats && entry.stats.find(stat => stat.name === 'clincher');
	var displayValue = clincherStat && clincherStat.displayValue;

	if (!displayValue || displayValue === '0') {
		return null;
	}

	return displayValue;
}

module.exports = {
	parseClincherCode
};
