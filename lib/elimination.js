function findEliminationWeek(userPicks, lockState) {
	if (!lockState || !lockState.weeksPastDeadline) {
		return null;
	}

	var pickedWeeks = new Set(userPicks.map(pick => pick.week));
	var weeksPastDeadline = Array.from(lockState.weeksPastDeadline).sort((a, b) => a - b);

	for (var i = 0; i < weeksPastDeadline.length; i++) {
		var week = weeksPastDeadline[i];
		if (!pickedWeeks.has(week)) {
			return week;
		}
	}

	return null;
}

function isEliminated(userPicks, lockState) {
	return findEliminationWeek(userPicks, lockState) != null;
}

module.exports = {
	findEliminationWeek,
	isEliminated
};
