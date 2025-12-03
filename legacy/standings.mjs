import superagent from 'superagent';
import 'dotenv/config';

const disqualifiedPlayers = [];

const teams = [
  { abbreviation: 'ARI', name: 'Cardinals', pickers: [] },
  { abbreviation: 'ATL', name: 'Falcons', pickers: [] },
  { abbreviation: 'BAL', name: 'Ravens', pickers: [] },
  { abbreviation: 'BUF', name: 'Bills', pickers: [] },
  { abbreviation: 'CAR', name: 'Panthers', pickers: [] },
  { abbreviation: 'CHI', name: 'Bears', pickers: [] },
  { abbreviation: 'CIN', name: 'Bengals', pickers: [] },
  { abbreviation: 'CLE', name: 'Browns', pickers: [] },
  { abbreviation: 'DAL', name: 'Cowboys', pickers: [] },
  { abbreviation: 'DEN', name: 'Broncos', pickers: [] },
  { abbreviation: 'DET', name: 'Lions', pickers: [] },
  { abbreviation: 'GB', name: 'Packers', pickers: [] },
  { abbreviation: 'HOU', name: 'Texans', pickers: [] },
  { abbreviation: 'IND', name: 'Colts', pickers: [] },
  { abbreviation: 'JAX', name: 'Jaguars', pickers: [] },
  { abbreviation: 'KC', name: 'Chiefs', pickers: [] },
  { abbreviation: 'LV', name: 'Raiders', pickers: [] },
  { abbreviation: 'LAC', name: 'Chargers', pickers: [] },
  { abbreviation: 'LAR', name: 'Rams', pickers: [] },
  { abbreviation: 'MIA', name: 'Dolphins', pickers: [] },
  { abbreviation: 'MIN', name: 'Vikings', pickers: [] },
  { abbreviation: 'NE', name: 'Patriots', pickers: [] },
  { abbreviation: 'NO', name: 'Saints', pickers: [] },
  { abbreviation: 'NYG', name: 'Giants', pickers: [] },
  { abbreviation: 'NYJ', name: 'Jets', pickers: [] },
  { abbreviation: 'PHI', name: 'Eagles', pickers: [] },
  { abbreviation: 'PIT', name: 'Steelers', pickers: [] },
  { abbreviation: 'SF', name: '49ers', pickers: [] },
  { abbreviation: 'SEA', name: 'Seahawks', pickers: [] },
  { abbreviation: 'TB', name: 'Buccaneers', pickers: [] },
  { abbreviation: 'TEN', name: 'Titans', pickers: [] },
  { abbreviation: 'WAS', name: 'Commanders', pickers: [] }
];

function printDataAndExit(data) {
  console.log(data);
  process.exit();
}

const mostRecentTeamPlayoffOdds =
  await superagent
    .get('https://www.nytimes.com/athletic/nfl-playoff-picture/2025/')
    .then(extractForecastData)
    .then(extractMostRecentTeamPlayoffOdds);

teams.forEach(addPlayoffOddsToTeamData(mostRecentTeamPlayoffOdds));

const entries = {};

await superagent
  .get('https://sheets.googleapis.com/v4/spreadsheets/1EcuoMgiooMC4fBlqxEtn0-am1k007Pt0kt577j8h2r0/values/Picks')
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

      if (team) {
        team.pickers.push(entrant);
      }
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
  let tie = false;

  const previousPlayerScore = playerScores[i - 1];

  if (previousPlayerScore) {
    tie = sameScores(previousPlayerScore[1], score);
  }

  const rank = tie ? '' : (i + 1).toString() + '.';

  console.log(`${rank.padStart(4, ' ')} ${player}: ${score.points} point${score.points !== 1 ? 's' : ''} / ${renderTiebreakers(score.tiebreakers)}`);
});

console.table(teams.toSorted((a, b) => b.playoffOdds - a.playoffOdds).map(team => ({ ...team, playoffOdds: Math.floor(team.playoffOdds * 100), pickerCount: team.pickers.length })), ['name', 'playoffOdds', 'pickerCount']);

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
    const dataRegexp = /<script.*?id="__NEXT_DATA__".*?>(.*?)<\/script>/;

    const forecastData = JSON.parse(response.text.match(dataRegexp)[1]).props.pageProps.forecastData;

    return forecastData;
}

function extractMostRecentTeamPlayoffOdds(forecastData) {
  return forecastData.map(forecast => {
    return { abbreviation: forecast.team.alias, playoffOdds: parseFloat(forecast.make_playoffs) };
  });
}

function extractUpcomingWeek(forecastData) {
  let highestWeekValue = 0;

  forecastData.forEach(team => {
    let week = team.week;

    if (week > highestWeekValue) {
      highestWeekValue = week;
    }
  });

  return highestWeekValue;
}

function sameScores(scoreOne, scoreTwo) {
  if (!scoreOne) {
    return false;
  }
  else {
    return scoreOne.points === scoreTwo.points && renderTiebreakers(scoreOne.tiebreakers) === renderTiebreakers(scoreTwo.tiebreakers);
  }
}
