function pickLockKey(week, team) {
	return week + ':' + team;
}

function getWeekDeadlineGame(weekGames) {
	if (!weekGames || weekGames.length === 0) {
		return null;
	}

	return weekGames.reduce((latest, game) => {
		if (!game.kickoff) {
			return latest;
		}
		if (!latest || !latest.kickoff || game.kickoff > latest.kickoff) {
			return game;
		}
		return latest;
	}, null);
}

function isWeekDeadlinePassed(weekGames) {
	var lastGame = getWeekDeadlineGame(weekGames);
	return !!(lastGame && lastGame.isPastStartTime());
}

function buildPickLockState(games) {
	var lockedPicks = new Set();
	var weeksPastDeadline = new Set();
	var gamesByWeek = {};

	games.forEach(game => {
		if (!gamesByWeek[game.week]) {
			gamesByWeek[game.week] = [];
		}
		gamesByWeek[game.week].push(game);

		if (game.isPastStartTime()) {
			lockedPicks.add(pickLockKey(game.week, game.awayTeam));
			lockedPicks.add(pickLockKey(game.week, game.homeTeam));
		}
	});

	Object.keys(gamesByWeek).forEach(weekKey => {
		var week = parseInt(weekKey, 10);
		if (isWeekDeadlinePassed(gamesByWeek[week])) {
			weeksPastDeadline.add(week);
		}
	});

	return { lockedPicks, weeksPastDeadline };
}

function isPickLocked(week, team, lockState) {
	return lockState.lockedPicks.has(pickLockKey(week, team)) || lockState.weeksPastDeadline.has(week);
}

module.exports = {
	pickLockKey,
	getWeekDeadlineGame,
	isWeekDeadlinePassed,
	buildPickLockState,
	isPickLocked
};
