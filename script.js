// --- NYTT: Lista över dina avatars ---
// --- Firebase Multiplayer Setup ---
// (Firebase SDK must be loaded in index.html)
// Replace with your own config in index.html!
// const db = firebase.database();
const db = window.db;
if (!db) {
  console.error("Firebase db not initialized. Make sure firebase.initializeApp runs before script.js");
}
let roomId = null;
let playerId = null;
let isHost = false;
let enemyAvatar = 'Skeleton.png';
let enemyName = 'SKELETT';
let lastShownResultTs = 0;
let presenceRef = null;
let connectedRef = null;

function setupPresence() {
  if (!roomId || !playerId) return;

  // "am I connected to Firebase?"
  connectedRef = db.ref('.info/connected');
  presenceRef = db.ref(`rooms/${roomId}/presence/${playerId}`);

  connectedRef.on('value', snap => {
    if (snap.val() === true) {
      // mark me online
      presenceRef.onDisconnect().remove();
      presenceRef.set(true);

      // update activity timestamp too (optional but nice)
      db.ref(`rooms/${roomId}`).update({
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });
    }
  });

  // When this client decides to close/leave nicely (best effort)
  window.addEventListener('beforeunload', () => {
    try { presenceRef.remove(); } catch (e) {}
  });
}

let deleteTimer = null;

function maybeDeleteRoomIfEmpty(data) {
  if (!data) return;

  const p = data.presence || {};
  const hostOnline = !!p.player1;
  const guestOnline = !!p.player2;

  // ✅ Om hosten lämnar => radera rummet (efter lite grace)
  if (!hostOnline) {
    if (!deleteTimer) {
      deleteTimer = setTimeout(() => {
        db.ref(`rooms/${roomId}`).remove();
      }, 6000); // 6 sek "grace" (så refresh inte nukar rummet)
    }
  } else {
    // host online -> avbryt eventuell pending delete
    if (deleteTimer) {
      clearTimeout(deleteTimer);
      deleteTimer = null;
    }
  }
}
function showResultMultiplayer(myResult, roundToLog) {
  let msg = "", logClass = "", logText = "";

  if (myResult === 'win') {
    msg = "DU VANN!";
    gameMessage.style.color = "#2ecc71";
    logClass = "text-win";
    logText = "VINST";
  } else if (myResult === 'lose') {
    msg = "DU FÖRLORADE!";
    gameMessage.style.color = "#e74c3c";
    logClass = "text-lose";
    logText = "FÖRLUST";
  } else {
    msg = "OAVGJORT!";
    gameMessage.style.color = "#f1c40f";
    logClass = "text-draw";
    logText = "OAVGJORT";
  }

  gameMessage.innerText = msg;
  addRoundHistory(roundToLog, logText, logClass);
}



// UI for room join/create
window.createRoom = async function() {
    roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    playerId = 'player1';
    isHost = true;
    await db.ref('rooms/' + roomId).set({
        player1: { avatar: 'Hero.png', name: 'HJÄLTE', move: null, score: 0 },
        player2: { avatar: 'Skeleton.png', name: 'SKELETT', move: null, score: 0 },
        turn: 'player1',
        round: 1,
        waiting: false,
        lastResult: null
    });
    document.getElementById('room-info').textContent = 'Rumskod: ' + roomId + ' (Du är Spelare 1)';
    const copyBtn = document.getElementById('copy-room-btn');
    copyBtn.style.display = 'inline-block';
    copyBtn.onclick = function() {
        navigator.clipboard.writeText(roomId);
        copyBtn.textContent = 'Kopierad!';
        setTimeout(() => copyBtn.textContent = 'Kopiera Rumskod', 1500);
    };
    setupPresence();
  listenRoom();
}

window.joinRoom = async function() {
    roomId = prompt('Ange rumskod:');
    playerId = 'player2';
    isHost = false;
    const snap = await db.ref('rooms/' + roomId).once('value');
    if (!snap.exists()) { alert('Rummet finns inte!'); return; }
      document.getElementById('room-info').textContent = 'Rumskod: ' + roomId + ' (Du är Spelare 2)';
  const copyBtn = document.getElementById('copy-room-btn');
  copyBtn.style.display = 'inline-block';
  copyBtn.onclick = function() {
    navigator.clipboard.writeText(roomId);
    copyBtn.textContent = 'Kopierad!';
    setTimeout(() => copyBtn.textContent = 'Kopiera Rumskod', 1500);
  };
  listenRoom();
  setupPresence();
}

function listenRoom() {
  db.ref('rooms/' + roomId).on('value', snap => {
    const data = snap.val();
    maybeDeleteRoomIfEmpty(data);
    if (!data) return;

    // Sync round from Firebase
    currentRound = data.round || 1;

    // Game over UI
    if (currentRound > maxRounds) {
      controlsDiv.classList.add('hidden');
      gameOverPanel.classList.remove('hidden');
      gameMessage.innerText = "GAME OVER";
      disableButtons();
      return;
    }

    // Update avatars/names + scores
    if (playerId === 'player1') {
      enemyAvatar = data.player2.avatar;
      enemyName = data.player2.name;
      playerScore = data.player1.score;
      enemyScore = data.player2.score;
    } else {
      enemyAvatar = data.player1.avatar;
      enemyName = data.player1.name;
      playerScore = data.player2.score;
      enemyScore = data.player1.score;
    }

    document.querySelector('.enemy-name').textContent = enemyName;
    document.querySelector('.enemy-zone .avatar').src = 'images/' + enemyAvatar;
    updateUI();

    const otherId = (playerId === 'player1') ? 'player2' : 'player1';
    const myMove = data[playerId].move;
    const enemyMove = data[otherId].move;

    // ✅ If host has posted a result, show it ONCE (both clients)
    if (data.lastResult && data.lastResult.ts && data.lastResult.ts !== lastShownResultTs) {
      lastShownResultTs = data.lastResult.ts;

      const myStoredMove = (playerId === 'player1') ? data.lastResult.p1Move : data.lastResult.p2Move;
      const enemyStoredMove = (playerId === 'player1') ? data.lastResult.p2Move : data.lastResult.p1Move;

      playerHandElem.innerText = hands[myStoredMove];
      enemyHandElem.innerText = hands[enemyStoredMove];
      playerChoiceText.innerText = myStoredMove.toUpperCase();
      enemyChoiceText.innerText = enemyStoredMove.toUpperCase();
      playerChoiceText.style.opacity = "1";
      enemyChoiceText.style.opacity = "1";

      const myResult = (playerId === 'player1') ? data.lastResult.p1Result : data.lastResult.p2Result;

      // Show win/lose/draw message + add round history
      const roundToLog = data.lastResult.round;
showResultMultiplayer(myResult, roundToLog);
updateUI(); // score/round kommer från Firebase ändå


      disableButtons();
      return; // don't overwrite message below
    }

    // Input state messages/buttons
    if (!myMove && !enemyMove) {
      gameMessage.innerText = "VÄLJ VAPEN!";
      enableButtons();
    } else if (!myMove && enemyMove) {
      gameMessage.innerText = "Din tur!";
      enableButtons();
    } else if (myMove && !enemyMove) {
      gameMessage.innerText = "Väntar på motståndare...";
      disableButtons();
    } else {
      gameMessage.innerText = "KÄMPAR...";
      disableButtons();
    }

    // Show my move immediately
    if (myMove) {
      playerHandElem.innerText = hands[myMove];
      playerChoiceText.innerText = myMove.toUpperCase();
      playerChoiceText.style.opacity = "1";
    }

    // Optional fairness: only reveal enemy when both picked
    if (myMove && enemyMove) {
      enemyHandElem.innerText = hands[enemyMove];
      enemyChoiceText.innerText = enemyMove.toUpperCase();
      enemyChoiceText.style.opacity = "1";
    } else {
      // hide enemy pick until both are ready
      enemyChoiceText.innerText = "VÄNTAR...";
      enemyChoiceText.style.opacity = "0.5";
      enemyHandElem.innerText = hands.rocknroll_enemy;
    }

    // Host resolves round when both picked
    if (data.player1.move && data.player2.move) {
      resolveMultiplayerRound(data);
    }
  });
}


function sendMove(move) {
    db.ref('rooms/' + roomId + '/' + playerId).update({ move });
}

function sendAvatar(filename, name) {
    db.ref('rooms/' + roomId + '/' + playerId).update({ avatar: filename, name });
}

function resolveMultiplayerRound(data) {
  if (!isHost) return;

  const p1 = data.player1.move;
  const p2 = data.player2.move;

  const result1 = determineWinner(p1, p2); // win/lose/draw for player1
  const result2 = determineWinner(p2, p1); // for player2

  let score1 = data.player1.score;
  let score2 = data.player2.score;
  if (result1 === 'win') score1 += 10;
  if (result2 === 'win') score2 += 10;

  // Store what happened this round (so BOTH clients can display it)
  const lastResult = {
    round: data.round,
    p1Move: p1,
    p2Move: p2,
    p1Result: result1,
    p2Result: result2,
    ts: Date.now()
  };

  // Write everything in one update (less racey)
  db.ref('rooms/' + roomId).update({
    lastResult,
    round: data.round + 1
  });

  // Delay clearing moves so UI has time to show result
  setTimeout(() => {
    db.ref('rooms/' + roomId + '/player1').update({ score: score1, move: null });
    db.ref('rooms/' + roomId + '/player2').update({ score: score2, move: null });
  }, 900);
}

// VIKTIGT: Lägg till filnamnen på alla bilder du har i 'images'-mappen här!
const avatarList = [
    'Hero.png',
    'Skeleton.png',
    'DemonTroll.png',
    'Elfsorceress.png',
    'Lizard.png',
    'Wolf.png'
];
// Spelvariabler
let playerScore = 0;
let enemyScore = 0;
let currentRound = 1;
const maxRounds = 5; 
let isAnimating = false;
let matchCount = 0;

// DOM Element
const playerHandElem = document.getElementById('player-hand');
const enemyHandElem = document.getElementById('enemy-hand');
const playerChoiceText = document.getElementById('player-choice-text');
const enemyChoiceText = document.getElementById('enemy-choice-text');
const playerScoreElem = document.getElementById('player-score');
const enemyScoreElem = document.getElementById('enemy-score');
const roundDisplay = document.getElementById('round-display');
const gameMessage = document.getElementById('game-message');
const roundList = document.getElementById('round-list');
const matchList = document.getElementById('match-list');
const controlsDiv = document.getElementById('controls');
const gameOverPanel = document.getElementById('game-over-panel');
// Nytt element för spelarens bild
const playerImg = document.getElementById('player-img');


// Symboler
const hands = {
    sten: '✊🏽',
    sax: '✌🏽',
    pase: '✋🏽',
    rocknroll_player: '🤘🏽',
    rocknroll_enemy: '🤘💀'
};

// --- NYA FUNKTIONER FÖR AVATAR-VAL ---

// Öppna modalen
function openAvatarModal() {
    const modal = document.getElementById('avatar-modal');
    const grid = document.getElementById('avatar-grid');
    grid.innerHTML = ''; // Rensa gammalt innehåll

    // Skapa tumnaglar för varje bild i listan
    avatarList.forEach(filename => {
        const img = document.createElement('img');
        img.src = `images/${filename}`;
        img.alt = filename;
        img.className = 'avatar-thumbnail';
        // När man klickar på en tumnagel...
        img.onclick = function() {
            changeAvatar(filename);
        };
        grid.appendChild(img);
    });

    modal.classList.remove('hidden');
}

// Stäng modalen
function closeAvatarModal() {
    document.getElementById('avatar-modal').classList.add('hidden');
}

// Byt spelarens bild
function changeAvatar(filename) {
    playerImg.src = `images/${filename}`;
    const playerNameElem = document.querySelector('.player-name');
    let name = filename.replace(/\.[^/.]+$/, "");
    name = name.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    playerNameElem.textContent = name;
    if (roomId && playerId) sendAvatar(filename, name);
    closeAvatarModal();
}

// Stäng modal om man klickar utanför rutan
window.onclick = function(event) {
    const modal = document.getElementById('avatar-modal');
    if (event.target == modal) {
        closeAvatarModal();
    }
}

// --- SPEL-LOGIK (Samma som förut) ---

function restartGame() {
    playerScore = 0;
    enemyScore = 0;
    currentRound = 1;
    roundList.innerHTML = "";
    updateUI();
    resetHands();
    gameMessage.innerText = "NY MATCH!";
    gameMessage.style.color = "#fff";
    controlsDiv.classList.remove('hidden');
    gameOverPanel.classList.add('hidden');
    enableButtons();
    if (roomId && playerId && isHost) {
    db.ref('rooms/' + roomId).update({ turn: 'player1', waiting: false, round: 1 });
    db.ref('rooms/' + roomId + '/player1').update({ score: 0, move: null });
    db.ref('rooms/' + roomId + '/player2').update({ score: 0, move: null });
    db.ref('rooms/' + roomId).update({ lastResult: null });
  }
}

function resetHands() {
    playerHandElem.innerText = hands.rocknroll_player;
    enemyHandElem.innerText = hands.rocknroll_enemy;
    playerChoiceText.innerText = "REDO";
    enemyChoiceText.innerText = "REDO";
    playerChoiceText.style.opacity = "0.5";
    enemyChoiceText.style.opacity = "0.5";
    playerHandElem.classList.remove('shake', 'pop');
    enemyHandElem.classList.remove('shake', 'pop');
}

function updateUI() {
    playerScoreElem.innerText = playerScore;
    enemyScoreElem.innerText = enemyScore;
    roundDisplay.innerText = `Runda ${currentRound} / ${maxRounds}`;
}

function playGame(playerChoice) {
  if (roomId && playerId) {
    const roomRef = db.ref('rooms/' + roomId);
    roomRef.once('value').then(snap => {
      const data = snap.val();
      // Only allow move if you haven't played yet this round
      if (data[playerId].move) return;
      sendMove(playerChoice);
      playerHandElem.innerText = hands[playerChoice];
      playerChoiceText.innerText = playerChoice.toUpperCase();
      playerChoiceText.style.opacity = "1";
      gameMessage.innerText = "Väntar på motståndare...";
      disableButtons();
    });
    return;
  }
    // Singleplayer fallback
    if (isAnimating) return;
    isAnimating = true;
    disableButtons();
    playerHandElem.innerText = hands.rocknroll_player;
    enemyHandElem.innerText = hands.rocknroll_enemy;
    playerChoiceText.innerText = "";
    enemyChoiceText.innerText = "";
    gameMessage.innerText = "KÄMPAR...";
    gameMessage.style.color = "#ccc";
    playerHandElem.classList.remove('pop');
    enemyHandElem.classList.remove('pop');
    playerHandElem.classList.add('shake');
    enemyHandElem.classList.add('shake');
    const choices = ['sten', 'sax', 'pase'];
    const enemyChoice = choices[Math.floor(Math.random() * choices.length)];
    setTimeout(() => {
        playerHandElem.classList.remove('shake');
        enemyHandElem.classList.remove('shake');
        playerHandElem.classList.add('pop');
        enemyHandElem.classList.add('pop');
        playerHandElem.innerText = hands[playerChoice];
        enemyHandElem.innerText = hands[enemyChoice];
        playerChoiceText.innerText = playerChoice.toUpperCase();
        enemyChoiceText.innerText = mapChoiceToSwedish(enemyChoice);
        playerChoiceText.style.opacity = "1";
        enemyChoiceText.style.opacity = "1";
        const result = determineWinner(playerChoice, enemyChoice);
        handleResult(result);
        isAnimating = false;
        if (currentRound > maxRounds) {
            endMatch();
        } else {
            enableButtons();
        }
    }, 600);
}

function mapChoiceToSwedish(choice) {
    if(choice === 'pase') return 'PÅSE';
    return choice.toUpperCase();
}

function determineWinner(p, e) {
    if (p === e) return 'draw';
    if ((p === 'sten' && e === 'sax') || (p === 'sax' && e === 'pase') || (p === 'pase' && e === 'sten')) {
        return 'win';
    } else {
        return 'lose';
    }
}

function handleResult(result) {
    let msg = "", logClass = "", logText = "";
    if (result === 'win') {
        playerScore += 10; msg = "DU VANN!"; gameMessage.style.color = "#2ecc71"; logClass = "text-win"; logText = "VINST";
    } else if (result === 'lose') {
        enemyScore += 10; msg = "SKELETT VANN!"; gameMessage.style.color = "#e74c3c"; logClass = "text-lose"; logText = "FÖRLUST";
    } else {
        msg = "OAVGJORT!"; gameMessage.style.color = "#f1c40f"; logClass = "text-draw"; logText = "OAVGJORT";
    }
    gameMessage.innerText = msg;
    addRoundHistory(currentRound, logText, logClass);
    currentRound++;
    updateUI();
}

function addRoundHistory(round, text, cssClass) {
    const li = document.createElement('li');
    li.className = "round-item";
    li.innerHTML = `<span>Runda ${round}</span> <span class="${cssClass}">${text}</span>`;
    roundList.prepend(li);
}

function endMatch() {
    let finalMsg = "", matchResult = "";
    matchCount++;
    if (playerScore > enemyScore) {
        finalMsg = "MATCHVINST! 🏆"; gameMessage.style.color = "#2ecc71"; matchResult = `<span class="text-win">VINST (${playerScore}p)</span>`;
    } else if (enemyScore > playerScore) {
        finalMsg = "MATCHFÖRLUST 💀"; gameMessage.style.color = "#e74c3c"; matchResult = `<span class="text-lose">FÖRLUST (${enemyScore}p)</span>`;
    } else {
        finalMsg = "MATCH OAVGJORD"; gameMessage.style.color = "#f1c40f"; matchResult = `<span class="text-draw">LIKA (${playerScore}p)</span>`;
    }
    roundDisplay.innerText = "GAME OVER";
    gameMessage.innerText = finalMsg;
    const li = document.createElement('li');
    li.className = "match-item";
    li.innerHTML = `Match ${matchCount}: ${matchResult}`;
    matchList.prepend(li);
    controlsDiv.classList.add('hidden');
    gameOverPanel.classList.remove('hidden');
}

function disableButtons() {
    document.querySelectorAll('.game-btn').forEach(btn => { btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed"; });
}
function enableButtons() {
    document.querySelectorAll('.game-btn').forEach(btn => { btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer"; });
}

updateUI();