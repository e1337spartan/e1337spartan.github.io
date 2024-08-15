async function loadAll() {
  let matches = await loadMatches();
  let players = await loadPlayers(matches);
  loadTable(players);
}

async function loadMatches() {
  let response = await fetch("matches.csv");
  let text = await response.text();
  let lines = text.split("\r\n");
  let n = lines.length - 1;
  let matches = new Array(n);

  for (let i = 0; i < n; i++) {
    let values = lines[i].split(",");
    matches[i] = new Match(values[0], Number(values[1]), values[3], Number(values[2]));
  }

  return matches;
}

class Match {
  constructor(playerAName, playerAGameWins, playerBName, playerBGameWins) {
    this.playerAName = playerAName;
    this.playerAGameWins = playerAGameWins;
    this.playerBName = playerBName;
    this.playerBGameWins = playerBGameWins;
  }
}

async function loadPlayers(matches) {
  let response = await fetch("players.csv");
  let text = await response.text();
  let lines = text.split("\r\n");
  let n = lines.length - 1;
  let players = new Array(n);

  for (let i = 0; i < n; i++) {
    let values = lines[i].split(",");
    players[i] = new Player(Number(values[1]), values[0]);
  }

  loadMatchesOntoPlayers(matches, players);
  players.sort((a, b) => b.elo - a.elo);
  return players;
}

class Player {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.elo = 1000;
    this.peakElo = 1000;
    this.matchWins = 0;
    this.matchLosses = 0;
    this.matchTies = 0;
    this.matches = 0;
    this.gameWins = 0;
    this.gameLosses = 0;
    this.games = 0;
  }
}

function loadMatchesOntoPlayers(matches, players) {
  for (let i = 0; i < matches.length; i++) {
    console.log(matches[i].playerAName, matches[i].playerBName);
    let playerA = players.find(player => player.name == matches[i].playerAName);
    let deltaPlayerAGameWins = matches[i].playerAGameWins;
    let playerB = players.find(player => player.name == matches[i].playerBName);
    let deltaPlayerBGameWins = matches[i].playerBGameWins;
    let playerAWon = deltaPlayerAGameWins > deltaPlayerBGameWins;
    let playerBWon = deltaPlayerBGameWins > deltaPlayerAGameWins;
    updateGames(playerA, deltaPlayerAGameWins, playerB, deltaPlayerBGameWins);
    updateMatches(playerA, playerAWon, playerB, playerBWon);
    updateElos(playerA, playerAWon, playerB, playerBWon);
  }
}

function updateGames(playerA, deltaPlayerAGameWins, playerB, deltaPlayerBGameWins) {
  playerA.gameWins += deltaPlayerAGameWins;
  playerA.gameLosses += deltaPlayerBGameWins;
  playerA.games += deltaPlayerAGameWins + deltaPlayerBGameWins;
  playerB.gameWins += deltaPlayerBGameWins;
  playerB.gameLosses += deltaPlayerAGameWins;
  playerB.games += deltaPlayerAGameWins + deltaPlayerBGameWins;
}

function updateMatches(playerA, playerAWon, playerB, playerBWon) {
  if (playerAWon) {
    playerA.matchWins++;
    playerB.matchLosses++;
  } else if (playerBWon) {
    playerA.matchLosses++;
    playerB.matchWins++;
  } else {
    playerA.matchTies++;
    playerB.matchTies++;
  }

  playerA.matches++;
  playerB.matches++;
}

function updateElos(playerA, playerAWon, playerB, playerBWon) {
  function k(player) {
    return 250 / ((player.matchWins + player.matchLosses + 96) ** 0.4);
  }

  function e(player) {
    let opponent = player == playerA ? playerB : playerA;
    return 1 / (1 + 10 ** ((opponent.elo - player.elo) / 400));
  }

  function s(player) {
    if (!playerAWon && !playerBWon) {
      return 0.5;
    }

    return player == playerA ? playerAWon : playerBWon;
  }

  playerA.elo += k(playerA) * (s(playerA) - e(playerA));
  playerA.peakElo = Math.max(playerA.elo, playerA.peakElo);
  playerB.elo += k(playerB) * (s(playerB) - e(playerB));
  playerB.peakElo = Math.max(playerB.elo, playerB.peakElo);
}

function loadTable(players) {
  let table = document.createElement("table");
  document.body.append(table);
  
  let tr0 = document.createElement("tr");
  table.append(tr0);

  function addTh(textContent) {
    let th = document.createElement("th");
    tr0.append(th);
    th.textContent = textContent;
  }

  addTh("Rank");
  addTh("Duelist");
  addTh("ELO");
  addTh("Peak ELO");
  addTh("# Match Wins");
  addTh("# Match Losses");
  addTh("# Match Ties");
  addTh("% Match Wins");
  addTh("% Match Losses");
  addTh("% Match Ties");
  addTh("# Game Wins");
  addTh("# Game Losses");
  addTh("% Game Wins");
  addTh("% Game Losses");

  for (let i = 0; i < players.length; i++) {
    let tr = document.createElement("tr");
    table.append(tr);
    
    function addTd(textContent) {
      let td = document.createElement("td");
      tr.append(td);
      td.textContent = textContent;
    }

    addTd(i + 1);
    addTd(players[i].name);
    addTd(Math.round(players[i].elo));
    addTd(Math.round(players[i].peakElo));
    addTd(players[i].matchWins);
    addTd(players[i].matchLosses);
    addTd(players[i].matchTies);
    addTd(Math.round(100 * players[i].matchWins / players[i].matches));
    addTd(Math.round(100 * players[i].matchLosses / players[i].matches));
    addTd(Math.round(100 * players[i].matchTies / players[i].matches));
    addTd(players[i].gameWins);
    addTd(players[i].gameLosses);
    addTd(Math.round(100 * players[i].gameWins / players[i].games));
    addTd(Math.round(100 * players[i].gameLosses / players[i].games));
  }
}
