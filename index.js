async function loadAll() {
  let matches = await loadMatches();
  let players = await loadPlayers(matches);
  loadOverview(players);
  loadHeadToHead(matches, players);
  closeAll();
}

async function loadMatches() {
  let response = await fetch("matches.csv");
  let text = await response.text();
  let lines = text.split("\r\n");
  let matches = new Array(lines.length - 1);

  for (let i = 0; i < matches.length; i++) {
    let values = lines[i].split(",");
    matches[i] = new Match(values[0], Number(values[1]), values[3], Number(values[2]), values[4]);
  }

  return matches;
}

class Match {
  constructor(playerAName, playerAGameWins, playerBName, playerBGameWins, round) {
    this.playerAName = playerAName;
    this.playerAGameWins = playerAGameWins;
    this.playerBName = playerBName;
    this.playerBGameWins = playerBGameWins;
    this.round = round;
  }
}

async function loadPlayers(matches) {
  let response = await fetch("players.csv");
  let text = await response.text();
  let lines = text.split("\r\n");
  let players = new Array(lines.length - 1);

  for (let i = 0; i < players.length; i++) {
    let values = lines[i].split(",");
    players[i] = new Player(Number(values[1]), values[0]);
  }

  loadMatchesOntoPlayers(matches, players);
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
  let getOpponent = player => player == playerA ? playerB : playerA;
  let k = player => 250 / ((player.matchWins + player.matchLosses + 96) ** 0.4);
  let e = player => 1 / (1 + 10 ** ((getOpponent(player).elo - player.elo) / 400));
  let s = player => !playerAWon && !playerBWon ? 0.5 : (player == playerA ? playerAWon : playerBWon);
  playerA.elo += k(playerA) * (s(playerA) - e(playerA));
  playerA.peakElo = Math.max(playerA.elo, playerA.peakElo);
  playerB.elo += k(playerB) * (s(playerB) - e(playerB));
  playerB.peakElo = Math.max(playerB.elo, playerB.peakElo);
}

function loadOverview(players) {
  players.sort((a, b) => b.elo - a.elo);

  let overview = document.createElement("article");
  document.body.append(overview);
  overview.id = "overview";

  let h2 = document.createElement("h2");
  overview.appendChild(h2);
  h2.textContent = "Overview";

  let table = document.createElement("table");
  overview.appendChild(table);
  
  let tr0 = document.createElement("tr");
  table.appendChild(tr0);

  addTh(tr0, "Rank");
  addTh(tr0, "Duelist");
  addTh(tr0, "ELO");
  addTh(tr0, "Peak ELO");
  addTh(tr0, "# Match Wins");
  addTh(tr0, "# Match Losses");
  addTh(tr0, "# Match Ties");
  addTh(tr0, "% Match Wins");
  addTh(tr0, "% Match Losses");
  addTh(tr0, "% Match Ties");
  addTh(tr0, "# Game Wins");
  addTh(tr0, "# Game Losses");
  addTh(tr0, "% Game Wins");
  addTh(tr0, "% Game Losses");

  for (let i = 0; i < players.length; i++) {
    let tr = document.createElement("tr");
    table.appendChild(tr);

    if (i == 0) {
      tr.style.background = "gold";
    } else if (i == 1) {
      tr.style.background = "silver";
    } else if (i == 2) {
      tr.style.background = "peru";
    }

    addTd(tr, i + 1);
    addTd(tr, players[i].name);
    addTd(tr, Math.round(players[i].elo));
    addTd(tr, Math.round(players[i].peakElo));
    addTd(tr, players[i].matchWins);
    addTd(tr, players[i].matchLosses);
    addTd(tr, players[i].matchTies);
    addTd(tr, Math.round(100 * players[i].matchWins / players[i].matches));
    addTd(tr, Math.round(100 * players[i].matchLosses / players[i].matches));
    addTd(tr, Math.round(100 * players[i].matchTies / players[i].matches));
    addTd(tr, players[i].gameWins);
    addTd(tr, players[i].gameLosses);
    addTd(tr, Math.round(100 * players[i].gameWins / players[i].games));
    addTd(tr, Math.round(100 * players[i].gameLosses / players[i].games));
  }
}

function addTh(tr, textContent) {
  let th = document.createElement("th");
  tr.appendChild(th);
  th.textContent = textContent;
}

function addTd(tr, textContent) {
  let td = document.createElement("td");
  tr.appendChild(td);
  td.textContent = textContent;
}

function loadHeadToHead(matches, players) {
  players.sort((a, b) => a.name < b.name ? -1 : (a.name > b.name ? 1 : 0));

  let headToHead = document.createElement("article");
  document.body.append(headToHead);
  headToHead.id = "head-to-head";

  let h2 = document.createElement("h2");
  headToHead.appendChild(h2);
  h2.textContent = "Head-to-head";

  loadHeadToHeadSelects(players);

  loadHeadToHeadTable(matches, players);
  selectA.onchange = () => loadHeadToHeadTable(matches, players);
  selectB.onchange = () => loadHeadToHeadTable(matches, players);
}

function loadHeadToHeadSelects(players) {
  let headToHead = document.getElementById("head-to-head");

  let labelA = document.createElement("label");
  headToHead.appendChild(labelA);
  labelA.textContent = "Player A";
  labelA.htmlFor = "head-to-head-select-a";

  let selectA = document.createElement("select");
  headToHead.appendChild(selectA);
  selectA.id = "head-to-head-select-a";

  for (let i = 0; i < players.length; i++) {
    let optionA = document.createElement("option");
    selectA.appendChild(optionA);
    optionA.value = players[i].name;
    optionA.textContent = players[i].name;
  }

  let labelB = document.createElement("label");
  headToHead.appendChild(labelB);
  labelB.textContent = "Player B";
  labelA.htmlFor = "head-to-head-select-b";

  let selectB = document.createElement("select");
  headToHead.appendChild(selectB);
  selectB.id = "head-to-head-select-b";

  for (let i = 0; i < players.length; i++) {
    let optionB = document.createElement("option");
    selectB.appendChild(optionB);
    optionB.value = players[i].name;
    optionB.textContent = players[i].name;
  }
}

function loadHeadToHeadTable(matches, players) {
  let headToHead = document.getElementById("head-to-head");
  let table = document.getElementById("head-to-head-table");

  if (table != null) {
    headToHead.removeChild(table);
  }

  table = document.createElement("table");
  headToHead.appendChild(table);
  table.id = "head-to-head-table";

  let tr0 = document.createElement("tr");
  table.appendChild(tr0);
  
  let tr1 = document.createElement("tr");
  table.appendChild(tr1);

  let selectA = document.getElementById("head-to-head-select-a");
  let playerA = players.find(player => player.name == selectA.value);
  let playerAMatchWins = 0;
  let playerAGameWins = 0;

  let selectB = document.getElementById("head-to-head-select-b");
  let playerB = players.find(player => player.name == selectB.value);
  let playerBMatchWins = 0;
  let playerBGameWins = 0;

  if (playerA != playerB) {
    for (let i = 0; i < matches.length; i++) {
      let deltaPlayerAGameWins = matches[i].playerAName == playerA.name ? matches[i].playerAGameWins : (matches[i].playerBName == playerA.name ? matches[i].playerBGameWins : null);
      let deltaPlayerBGameWins = matches[i].playerAName == playerB.name ? matches[i].playerAGameWins : (matches[i].playerBName == playerB.name ? matches[i].playerBGameWins : null);
      
      let playerAWon = deltaPlayerAGameWins > deltaPlayerBGameWins;
      let playerBWon = deltaPlayerBGameWins > deltaPlayerAGameWins;

      if (deltaPlayerAGameWins != null && deltaPlayerBGameWins != null) {
        let tr = document.createElement("tr");
        table.appendChild(tr);

        addTd(tr, deltaPlayerAGameWins);
        addTd(tr, "–");
        addTd(tr, deltaPlayerBGameWins);
        addTd(tr, matches[i].round);

        playerAGameWins += deltaPlayerAGameWins;
        playerBGameWins += deltaPlayerBGameWins;

        if (playerAWon) {
          playerAMatchWins++;
        } else if (playerBWon) {
          playerBMatchWins++;
        }
      }
    }

    if (playerAMatchWins != 0 || playerBMatchWins != 0) {
      addTd(tr0, playerAMatchWins);
      addTd(tr0, "–");
      addTd(tr0, playerBMatchWins);
      addTd(tr0, "# Match Wins");

      addTd(tr1, playerAGameWins);
      addTd(tr1, "–");
      addTd(tr1, playerBGameWins);
      addTd(tr1, "# Game Wins");
    }
  }
}

function closeAll() {
  document.getElementById("overview").style.display = "none";
  document.getElementById("head-to-head").style.display = "none";
}

function openOverview() {
  closeAll();
  document.getElementById("overview").style.display = "";
}

function openHeadToHead() {
  closeAll();
  document.getElementById("head-to-head").style.display = "";
}