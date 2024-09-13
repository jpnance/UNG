import superagent from 'superagent';
import 'dotenv/config';

const nytAssetKey = 'bb1c5f697293fe8bb92fa988e655b6389c4e1121';

const disqualifiedPlayers = [];

const teams = [
  { abbreviation: 'ari', name: 'Cardinals' },
  { abbreviation: 'atl', name: 'Falcons' },
  { abbreviation: 'bal', name: 'Ravens' },
  { abbreviation: 'buf', name: 'Bills' },
  { abbreviation: 'car', name: 'Panthers' },
  { abbreviation: 'chi', name: 'Bears' },
  { abbreviation: 'cin', name: 'Bengals' },
  { abbreviation: 'cle', name: 'Browns' },
  { abbreviation: 'dal', name: 'Cowboys' },
  { abbreviation: 'den', name: 'Broncos' },
  { abbreviation: 'det', name: 'Lions' },
  { abbreviation: 'gb', name: 'Packers' },
  { abbreviation: 'hou', name: 'Texans' },
  { abbreviation: 'ind', name: 'Colts' },
  { abbreviation: 'jax', name: 'Jaguars' },
  { abbreviation: 'kc', name: 'Chiefs' },
  { abbreviation: 'lv', name: 'Raiders' },
  { abbreviation: 'lac', name: 'Chargers' },
  { abbreviation: 'lar', name: 'Rams' },
  { abbreviation: 'mia', name: 'Dolphins' },
  { abbreviation: 'min', name: 'Vikings' },
  { abbreviation: 'ne', name: 'Patriots' },
  { abbreviation: 'no', name: 'Saints' },
  { abbreviation: 'nyg', name: 'Giants' },
  { abbreviation: 'nyj', name: 'Jets' },
  { abbreviation: 'phi', name: 'Eagles' },
  { abbreviation: 'pit', name: 'Steelers' },
  { abbreviation: 'sf', name: '49ers' },
  { abbreviation: 'sea', name: 'Seahawks' },
  { abbreviation: 'tb', name: 'Buccaneers' },
  { abbreviation: 'ten', name: 'Titans' },
  { abbreviation: 'wsh', name: 'Commanders' }
];

const entries = {};

await superagent
  .get('https://sheets.googleapis.com/v4/spreadsheets/1r8sdJByKZI3KBQm0h7sRznzY_lbosDz6sLWmA2l8taY/values/Props')
  .query({ alt: 'json', key: process.env.GOOGLE_API_KEY })
  .then((response) => {
    response.body.values.forEach((row, i) => {
      if (i === 0) {
        return;
      }

      let [week, entrant, name] = row;

      const team = teams.find((team) => team.name === name);

      let entry = entries[entrant] || { picks: [] };

      entries[entrant] = entry;

      entry.picks.push({
        week: parseInt(week),
        name: team?.name,
        abbreviation: team?.abbreviation,
      });
    });
  });

for (const team of teams) {
  const teamAbbreviation = team.abbreviation;

  await superagent
      .get(`https://static01.nytimes.com/newsgraphics/2023-09-20-nfl-playoff-simulator/${nytAssetKey}/_assets/odds/${teamAbbreviation}.json`)
      .then((response) => {
        team.nytOdds = response.body.overall;
      });
}

override('ari', 0);
override('atl', 0);
override('bal', 1);
override('buf', 1);
override('car', 0);
override('chi', 0);
override('cin', 0);
override('cle', 1);
override('dal', 1);
override('den', 0);
override('det', 1);
override('gb', 1);
override('hou', 1);
override('ind', 0);
override('jax', 0);
override('kc', 1);
override('lv', 0);
override('lac', 0);
override('lar', 1);
override('mia', 1);
override('min', 0);
override('ne', 0);
override('no', 0);
override('nyg', 0);
override('nyj', 0);
override('phi', 1);
override('pit', 1);
override('sf', 1);
override('sea', 0);
override('tb', 1);
override('ten', 0);
override('wsh', 0);

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
  console.log(`${i + 1}. ${player}: ${score.points} points / ${renderTiebreakers(score.tiebreakers)}`);
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

  const playoffStatus = team.override ?? Math.round(team.nytOdds);

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
