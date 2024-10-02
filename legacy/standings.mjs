import superagent from 'superagent';
import 'dotenv/config';

const nytAssetKey = 'bb1c5f697293fe8bb92fa988e655b6389c4e1121';

const disqualifiedPlayers = [];

const teams = [
  { abbreviation: 'ARI', name: 'Cardinals' },
  { abbreviation: 'ATL', name: 'Falcons' },
  { abbreviation: 'BAL', name: 'Ravens' },
  { abbreviation: 'BUF', name: 'Bills' },
  { abbreviation: 'CAR', name: 'Panthers' },
  { abbreviation: 'CHI', name: 'Bears' },
  { abbreviation: 'CIN', name: 'Bengals' },
  { abbreviation: 'CLE', name: 'Browns' },
  { abbreviation: 'DAL', name: 'Cowboys' },
  { abbreviation: 'DEN', name: 'Broncos' },
  { abbreviation: 'DET', name: 'Lions' },
  { abbreviation: 'GB', name: 'Packers' },
  { abbreviation: 'HOU', name: 'Texans' },
  { abbreviation: 'IND', name: 'Colts' },
  { abbreviation: 'JAX', name: 'Jaguars' },
  { abbreviation: 'KC', name: 'Chiefs' },
  { abbreviation: 'LV', name: 'Raiders' },
  { abbreviation: 'LAC', name: 'Chargers' },
  { abbreviation: 'LAR', name: 'Rams' },
  { abbreviation: 'MIA', name: 'Dolphins' },
  { abbreviation: 'MIN', name: 'Vikings' },
  { abbreviation: 'NE', name: 'Patriots' },
  { abbreviation: 'NO', name: 'Saints' },
  { abbreviation: 'NYG', name: 'Giants' },
  { abbreviation: 'NYJ', name: 'Jets' },
  { abbreviation: 'PHI', name: 'Eagles' },
  { abbreviation: 'PIT', name: 'Steelers' },
  { abbreviation: 'SF', name: '49ers' },
  { abbreviation: 'SEA', name: 'Seahawks' },
  { abbreviation: 'TB', name: 'Buccaneers' },
  { abbreviation: 'TEN', name: 'Titans' },
  { abbreviation: 'WAS', name: 'Commanders' }
];

const mostRecentTeamPlayoffOdds =
  await superagent
    .get('https://www.nytimes.com/athletic/5698572')
    .then(extractForecastData)
    .then(extractMostRecentTeamPlayoffOdds);

teams.forEach(addPlayoffOddsToTeamData(mostRecentTeamPlayoffOdds));

const entries = {};

await superagent
  .get('https://sheets.googleapis.com/v4/spreadsheets/1XDANDADsH9iCcUmqP7qRkY3P5bKF86iZJgnUHN9nzFk/values/Picks')
  .query({ alt: 'json', key: process.env.GOOGLE_API_KEY })
  .then((response) => {
    response.body.values.forEach((row, i) => {
      if (i === 0) {
        return;
      }

      let [week, entrant, name] = row;

      const team = teams.find(findByName(name));

      let entry = entries[entrant] || { picks: [] };

      entries[entrant] = entry;

      entry.picks.push({
        week: parseInt(week),
        name: team?.name,
        abbreviation: team?.abbreviation,
      });
    });
  });

let playerScores =
  Object.entries(entries)
    .filter(removeDisqualifiedPlayers)
    .map(generateScoreForPlayer)
    .sort((a, b) => {
      const aScore = a[1];
      const bScore = b[1];

      if (aScore.points === bScore.points) {
        const playoffTeams = aScore.tiebreakers.length;

        for (let i = 0; i < playoffTeams; i++) {
          let aTiebreaker = aScore.tiebreakers[i].value;
          let bTiebreaker = bScore.tiebreakers[i].value;

          if (aTiebreaker !== bTiebreaker) {
            return aTiebreaker - bTiebreaker;
          }
        }

        return 0;
      }

      return bScore.points - aScore.points;
    });

playerScores.forEach(([player, score], i) => {
  console.log(`${i + 1}. ${player}: ${score.points} point${score.points !== 1 ? 's' : ''} / ${renderTiebreakers(score.tiebreakers)}`);
});

function removeDisqualifiedPlayers([player, entry]) {
  return !disqualifiedPlayers.includes(player);
}

function generateScoreForPlayer([player, entry]) {
  const score =
    entry.picks
      .map(pickToScore)
      .reduce(sum, {});

  return [player, score];
}

function pickToScore(pick) {
  if (!pick.name) {
    return {
      points: 0,
      tiebreaker: 0,
    };
  }

  const team = teams.find((team) => team.name === pick.name);

  const playoffStatus = team.override ?? Math.round(team.playoffOdds);

  return {
    abbreviation: pick.abbreviation,
    points: 1 - playoffStatus,
    tiebreaker: playoffStatus ? pick.week : 0,
  };
}

function sum(total, current) {
  total.points = total.points ?? 0;
  total.tiebreakers = total.tiebreakers ?? [];

  total.points += current.points;
  total.tiebreakers.push({
    abbreviation: current.abbreviation,
    value: current.tiebreaker ?? 0,
  });

  return total;
}

function scores(scores, current) {
  const newScores = scores.slice();

  newScores.push(current);

  return newScores;
}

function formatScore(score) {
  const integerScore = Math.round(score * 100);

  return integerScore.toString().padStart(2, '0')
}

function remove(n) {
  return (item) => item.value !== n;
}

function override(abbreviation, playoffStatus) {
  const team = teams.find((team) => team.abbreviation === abbreviation);

  team.override = playoffStatus;
}

function renderTiebreakers(tiebreakers) {
  return (
    tiebreakers
      .filter(remove(0))
      .map((tiebreaker) => {
        return `${tiebreaker.abbreviation.toUpperCase()} ${tiebreaker.value}`;
      })
      .join(', ')
  );
}

function addPlayoffOddsToTeamData(playoffOdds) {
  return team => {
    const existingTeam = playoffOdds.find(findByAbbrevation(team.abbreviation));

    team.playoffOdds = existingTeam.playoffOdds;
  }
}

function findByAbbrevation(abbreviation) {
  return item => item.abbreviation === abbreviation;
}

function findByName(name) {
  return item => item.name === name;
}

function extractForecastData(response) {
    const dataRegexp = /<script.*?id="graphics-data".*?>(.*?)<\/script>/;

    const forecastData = JSON.parse(response.text.match(dataRegexp)[1]);

    return forecastData;
}

function extractMostRecentTeamPlayoffOdds(forecastData) {
  const upcomingWeek = extractUpcomingWeek(forecastData);
  const mostRecentForecasts = forecastData[`forecast_week${upcomingWeek}`];

  return mostRecentForecasts.map(forecast => {
    return { abbreviation: forecast.team, playoffOdds: parseFloat(forecast.make_playoffs) };
  });
}

function extractUpcomingWeek(forecastData) {
  return 5;

  /*
  Object.entries(forecastData).forEach(([ key, value ]) => {
    if (key.startsWith('forecast_week')) {
      const weekForecasts = forecastData[key];

      weekForecasts
      forecasts.push(forecastData[key]);
    }
  });
  */
}
