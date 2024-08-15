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
  let n = lines.length - 1;
  let matches = new Array(n);

  for (let i = 0; i < n; i++) {
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
  let n = lines.length - 1;
  let players = new Array(n);

  for (let i = 0; i < n; i++) {
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

  function addTh(textContent) {
    let th = document.createElement("th");
    tr0.appendChild(th);
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
    table.appendChild(tr);

    if (i == 0) {
      tr.style.background = "gold";
    } else if (i == 1) {
      tr.style.background = "silver";
    } else if (i == 2) {
      tr.style.background = "peru";
    }
    
    function addTd(textContent) {
      let td = document.createElement("td");
      tr.appendChild(td);
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

function loadHeadToHead(matches, players) {
  players.sort((a, b) => a.name < b.name ? -1 : (a.name > b.name ? 1 : 0));

  let headToHead = document.createElement("article");
  document.body.append(headToHead);
  headToHead.id = "head-to-head";

  let h2 = document.createElement("h2");
  headToHead.appendChild(h2);
  h2.textContent = "Head-to-head";

  let labelA = document.createElement("label");
  headToHead.appendChild(labelA);
  labelA.textContent = "Player A";

  let selectA = document.createElement("select");
  headToHead.appendChild(selectA);

  for (let i = 0; i < players.length; i++) {
    let optionA = document.createElement("option");
    selectA.appendChild(optionA);
    optionA.value = players[i].name;
    optionA.textContent = players[i].name;
  }

  let labelB = document.createElement("label");
  headToHead.appendChild(labelB);
  labelB.textContent = "Player B";

  let selectB = document.createElement("select");
  headToHead.appendChild(selectB);

  for (let i = 0; i < players.length; i++) {
    let optionB = document.createElement("option");
    selectB.appendChild(optionB);
    optionB.value = players[i].name;
    optionB.textContent = players[i].name;
  }

  function loadTable() {
    if (document.getElementById("head-to-head-table") != null) {
      headToHead.removeChild(document.getElementById("head-to-head-table"));
    }

    let table = document.createElement("table");
    headToHead.appendChild(table);
    table.id = "head-to-head-table";

    let tr0 = document.createElement("tr");
    table.appendChild(tr0);
    let tr1 = document.createElement("tr");
    table.appendChild(tr1);

    let playerA = players.find(player => player.name == selectA.value);
    let playerB = players.find(player => player.name == selectB.value);

    let playerAMatchWins = 0;
    let playerBMatchWins = 0;
    let playerAOverallGameWins = 0;
    let playerBOverallGameWins = 0;

    if (playerA != playerB) {
      for (let i = 0; i < matches.length; i++) {
        let playerAGameWins = matches[i].playerAName == playerA.name ? matches[i].playerAGameWins : (matches[i].playerBName == playerA.name ? matches[i].playerBGameWins : null);
        let playerBGameWins = matches[i].playerAName == playerB.name ? matches[i].playerAGameWins : (matches[i].playerBName == playerB.name ? matches[i].playerBGameWins : null);
        
        if (playerAGameWins != null && playerBGameWins != null) {
          let tr = document.createElement("tr");
          table.appendChild(tr);

          let td0 = document.createElement("td");
          tr.appendChild(td0);
          td0.textContent = playerAGameWins;

          let td1 = document.createElement("td");
          tr.appendChild(td1);
          td1.textContent = "–";

          let td2 = document.createElement("td");
          tr.appendChild(td2);
          td2.textContent = playerBGameWins;

          let td3 = document.createElement("td");
          tr.appendChild(td3);
          td3.textContent = matches[i].round;

          playerAOverallGameWins += playerAGameWins;
          playerBOverallGameWins += playerBGameWins;

          if (playerAGameWins > playerBGameWins) {
            playerAMatchWins++;
          } else if (playerAGameWins < playerBGameWins) {
            playerBMatchWins++;
          } 
        }
      }

      if (playerAMatchWins != 0 && playerBMatchWins != 0) {
        let td00 = document.createElement("td");
        tr0.appendChild(td00);
        td00.textContent = playerAMatchWins;

        let td01 = document.createElement("td");
        tr0.appendChild(td01);
        td01.textContent = "–";

        let td02 = document.createElement("td");
        tr0.appendChild(td02);
        td02.textContent = playerBMatchWins;

        let td03 = document.createElement("td");
        tr0.appendChild(td03);
        td03.textContent = "Match Wins";

        let td10 = document.createElement("td");
        tr1.appendChild(td10);
        td10.textContent = playerAOverallGameWins;

        let td11 = document.createElement("td");
        tr1.appendChild(td11);
        td11.textContent = "–";

        let td12 = document.createElement("td");
        tr1.appendChild(td12);
        td12.textContent = playerBOverallGameWins;

        let td13 = document.createElement("td");
        tr1.appendChild(td13);
        td13.textContent = "Game Wins";
      }
    }
  }

  loadTable();
  selectA.onchange = loadTable;
  selectB.onchange = loadTable;
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