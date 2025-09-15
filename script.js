/* -------------------- USERS -------------------- */
let users = JSON.parse(localStorage.getItem('xholUsers') || "{}");
let playerName = "";
let tables = [];
let currentTable = null;

function saveUsers() {
    localStorage.setItem('xholUsers', JSON.stringify(users));
}

/* -------------------- AUTHENTIFICATION -------------------- */
document.getElementById('localRegisterBtn').onclick = () => {
    const u = document.getElementById('localUser').value.trim();
    const p = document.getElementById('localPass').value.trim();

    if (!u || !p) {
        alert("Nom et mot de passe requis");
        return;
    }

    if (users[u]) {
        alert("Utilisateur existe déjà");
        return;
    }

    users[u] = p;
    saveUsers();
    alert("Compte créé");
};

document.getElementById('localLoginBtn').onclick = () => {
    const u = document.getElementById('localUser').value.trim();
    const p = document.getElementById('localPass').value.trim();

    if (users[u] && users[u] === p) {
        playerName = u;
        loginSuccess();
    } else {
        alert("Utilisateur ou mot de passe incorrect");
    }
};

document.getElementById('googleLogin').onclick = () => {
    playerName = prompt("Entrez votre email Gmail:");
    if (playerName) loginSuccess();
};

document.getElementById('icloudLogin').onclick = () => {
    playerName = prompt("Entrez votre email iCloud:");
    if (playerName) loginSuccess();
};

function loginSuccess() {
    document.getElementById('auth').classList.add('hidden');
    document.getElementById('lobby').classList.remove('hidden');
    document.getElementById('authStatus').textContent = "Connecté : " + playerName;

    renderTables();
    updateGlobalRanking();
}

/* -------------------- LOBBY / TABLES -------------------- */
document.getElementById('createTableBtn').onclick = () => {
    const numPlayers = parseInt(document.getElementById('numPlayers').value);
    const targetScore = parseInt(document.getElementById('targetScore').value);

    const table = {
        id: Date.now(),
        maxPlayers: numPlayers,
        targetScore: targetScore,
        players: [],
        hands: [],
        deck: [],
        discardPile: [],
        scores: [],
        currentPlayer: 0
    };

    tables.push(table);
    renderTables();
};

/* Affiche les tables disponibles */
function renderTables() {
    const ul = document.getElementById('tablesList');
    ul.innerHTML = "";

    tables.forEach(table => {
        const li = document.createElement('li');
        li.textContent = Table #${table.id} (${table.players.length}/${table.maxPlayers}) - Score cible: ${table.targetScore};
        const joinBtn = document.createElement('button');
        joinBtn.textContent = "Rejoindre";
        joinBtn.onclick = () => joinTable(table.id);
        li.appendChild(joinBtn);
        ul.appendChild(li);
    });
}

/* -------------------- REJOINDRE UNE TABLE -------------------- */
function joinTable(tableId) {
    const table = tables.find(t => t.id === tableId);

    if (!table) return alert("Table introuvable");
    if (table.players.length >= table.maxPlayers) return alert("Table complète");
    if (table.players.includes(playerName)) return alert("Vous êtes déjà à cette table");

    table.players.push(playerName);
    table.scores.push(0);
    table.hands.push([]);

    if (table.players.length === table.maxPlayers) {
        startGame(table);
    }

    renderTables();
}

/* -------------------- DÉBUT DU JEU -------------------- */
function startGame(table) {
    currentTable = table;

    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('gameContainer').classList.remove('hidden');

    initializeDeck(table);
    shuffleDeck(table.deck);
    dealCards(table);
    renderHands(table);
    updateStatus(C'est au tour de ${table.players[table.currentPlayer]});
}

/* -------------------- INITIALISATION DU DECK -------------------- */
function initializeDeck(table) {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

    table.deck = [];

    // 2 paquets
    for (let p=0; p<2; p++) {
        suits.forEach(suit => {
            values.forEach(value => {
                table.deck.push({suit, value});
            });
        });
        // Ajouter 2 jokers
        table.deck.push({suit:'JOKER', value:'JOKER'});
        table.deck.push({suit:'JOKER', value:'JOKER'});
    }
}

/* -------------------- MÉLANGER LE DECK -------------------- */
function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i+1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

/* -------------------- DISTRIBUTION DES CARTES -------------------- */
function dealCards(table) {
    const numPlayers = table.players.length;

    for (let i = 0; i < numPlayers; i++) {
        const handCount = (i === 0) ? 11 : 10;
        for (let j = 0; j < handCount; j++) {
            table.hands[i].push(table.deck.pop());
        }
    }

    // Placer la première carte dans la défausse
    table.discardPile.push(table.deck.pop());
}

/* -------------------- AFFICHAGE DES MAINS -------------------- */
function renderHands(table) {
    const container = document.getElementById('playersContainer');
    container.innerHTML = "";

    table.players.forEach((player, idx) => {
        const div = document.createElement('div');
        div.classList.add('playerHand');
        div.innerHTML = <strong>${player}</strong>;

        table.hands[idx].forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.classList.add('cardFront');
            if (card.suit === 'JOKER') cardDiv.classList.add('joker');
            cardDiv.textContent = (card.suit==='JOKER')?'JOKER':${card.value}${card.suit};
            div.appendChild(cardDiv);
        });

        container.appendChild(div);
    });
}

/* -------------------- MISE À JOUR DU STATUT -------------------- */
function updateStatus(msg) {
    document.getElementById('status').textContent = msg;
}
