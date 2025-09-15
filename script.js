/* ---------------- USERS ---------------- */
let users = JSON.parse(localStorage.getItem('xholUsers')||"{}");
let playerName="";

function saveUsers(){ 
    localStorage.setItem('xholUsers', JSON.stringify(users)); 
}

document.getElementById('localRegisterBtn').onclick = ()=>{
    const u = document.getElementById('localUser').value.trim();
    const p = document.getElementById('localPass').value.trim();
    if(!u||!p){ alert("Nom et mot de passe requis"); return; }
    if(users[u]){ alert("Utilisateur existe déjà"); return; }
    users[u] = p; 
    saveUsers(); 
    alert("Compte créé"); 
};

document.getElementById('localLoginBtn').onclick = ()=>{
    const u = document.getElementById('localUser').value.trim();
    const p = document.getElementById('localPass').value.trim();
    if(users[u] && users[u] === p){ 
        playerName = u; 
        loginSuccess(); 
    } else alert("Utilisateur ou mot de passe incorrect");
};

document.getElementById('googleLogin').onclick = ()=>{ 
    playerName = prompt("Entrez votre email Gmail:"); 
    if(playerName) loginSuccess(); 
};
document.getElementById('icloudLogin').onclick = ()=>{ 
    playerName = prompt("Entrez votre email iCloud:"); 
    if(playerName) loginSuccess(); 
};

function loginSuccess(){
    document.getElementById('auth').classList.add('hidden');
    document.getElementById('lobby').classList.remove('hidden');
    document.getElementById('authStatus').textContent="Connecté : "+playerName;
}

/* ---------------- LOBBY & TABLES ---------------- */
let tables=[]; 
let currentTable=null;

document.getElementById('createTableBtn').onclick = ()=>{
    const numPlayers = parseInt(document.getElementById('numPlayers').value);
    const targetScore = parseInt(document.getElementById('targetScore').value);
    const tableId = "table"+tables.length;
    const table = {
        id:tableId,
        maxPlayers:numPlayers,
        targetScore:targetScore,
        players:[],
        hands:[],
        deck:[],
        discardPile:[],
        scores:[],
        currentPlayer:0,
        turnTimer:null,
        TURN_TIME_LIMIT:60000
    };
    tables.push(table);
    renderTables();
};

function renderTables(){
    const ul = document.getElementById('tablesList'); 
    ul.innerHTML="";
    tables.forEach(t=>{
        const li=document.createElement('li');
        li.textContent=Table ${t.id} - ${t.players.length}/${t.maxPlayers} joueurs - Score cible: ${t.targetScore};
        const btn=document.createElement('button'); 
        btn.textContent="Rejoindre";
        btn.onclick = ()=>joinTable(t.id);
        li.appendChild(btn); 
        ul.appendChild(li);
    });
}

function joinTable(id){
    const table = tables.find(t=>t.id===id);
    if(!table) return alert("Table introuvable");
    if(table.players.length>=table.maxPlayers) return alert("Table complète");
    table.players.push(playerName); 
    table.scores.push(0);
    currentTable = table;
    startGame(table);
    alert("Vous avez rejoint la table "+table.id);
}

/* ---------------- GAME LOGIC ---------------- */
function startGame(table){
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('gameContainer').classList.remove('hidden');
    table.deck = createDeck();
    table.hands = Array(table.maxPlayers).fill(0).map(()=>[]);
    distributeCards(table);
    renderHands(table);
    updateStatus("Tour de "+table.players[table.currentPlayer]);
    startTurnTimer(table);
}

/* ----- Deck Creation ----- */
function createDeck(){
    const d=[]; 
    const symbols=['♠','♥','♦','♣']; 
    const values=[2,3,4,5,6,7,8,9,10,'J','Q','K','A'];
    for(let p=0;p<2;p++){ 
        for(let s of symbols){ 
            for(let v of values)d.push({symbol:s,value:v});
        } 
        d.push({symbol:'JOKER',value:'JOKER'}); 
        d.push({symbol:'JOKER',value:'JOKER'});
    }
    return d.sort(()=>Math.random()-0.5);
}

/* ----- Distribution ----- */
function distributeCards(table){
    for(let i=0;i<table.maxPlayers;i++){
        for(let j=0;j<10;j++){ table.hands[i].push(table.deck.pop()); }
    }
    table.hands[0].push(table.deck.pop()); // distributeur 11 cartes
    table.discardPile.push(table.hands[0].pop());
}

/* ----- Render Hands ----- */
function renderHands(table){
    const container=document.getElementById('playersContainer'); container.innerHTML="";
    table.hands.forEach((hand,p)=>{
        if(!hand) return;
        const div=document.createElement('div'); div.className='playerHand';
        const name=document.createElement('div'); name.textContent=table.players[p]; name.style.color='#FF3B30';
        div.appendChild(name);
        hand.forEach((c,idx)=>{
            const cd=document.createElement('div');
            cd.className=c.symbol==='JOKER'?'cardFront joker':'cardFront';
            cd.textContent=c.value+c.symbol;
            if(p===table.currentPlayer){ cd.onclick=()=>discardCard(table,idx);}
            div.appendChild(cd);
        });
        container.appendChild(div);
    });
    renderDiscard(table);
}

/* ----- Discard ----- */
function renderDiscard(table){
    const d=document.getElementById('discardPile');
    if(table.discardPile.length===0){ d.textContent="Défausse"; return; }
    const last=table.discardPile[table.discardPile.length-1]; d.textContent=last.value+last.symbol;
}

/* ----- Controls ----- */
document.getElementById('drawDeck').onclick = ()=>{
    const table = currentTable; if(!table) return;
    const card = table.deck.pop(); if(!card) return alert("Deck vide");
    table.hands[table.currentPlayer].push(card); 
    renderHands(table);
    checkXhol(table);
};

document.getElementById('takeDiscard').onclick = ()=>{
    const table = currentTable; if(!table) return;
    if(table.discardPile.length===0) return alert("Défausse vide");
    const card = table.discardPile.pop(); table.hands[table.currentPlayer].push(card);
    renderHands(table);
    checkXhol(table);
};

/* ----- Discard Card & Next Turn ----- */
function discardCard(table,idx){
    clearTimeout(table.turnTimer);
    const card = table.hands[table.currentPlayer].splice(idx,1)[0];
    table.discardPile.push(card);
    renderHands(table);
    checkXhol(table);
    nextTurn(table);
}

function nextTurn(table){
    // Passer au joueur suivant
    table.currentPlayer = (table.currentPlayer + 1) % table.maxPlayers;

    // Vérifier si le joueur est encore actif (pas banni)
    while(!table.hands[table.currentPlayer]){
        table.currentPlayer = (table.currentPlayer + 1) % table.maxPlayers;
    }

    // Mettre à jour le statut
    updateStatus("Tour de " + table.players[table.currentPlayer]);

    // Redémarrer le timer du tour
    startTurnTimer(table);
}

/* ----- Timer de tour ----- */
function startTurnTimer(table){
    // Annuler ancien timer
    clearTimeout(table.turnTimer);

    // Lancer nouveau timer
    table.turnTimer = setTimeout(()=>{
        banPlayer(table, table.currentPlayer);
    }, table.TURN_TIME_LIMIT);
}

/* ----- Bannissement automatique ----- */
function banPlayer(table, playerIndex){
    alert(table.players[playerIndex] + " n'a pas joué à temps et est banni !");
    
    // Supprimer la main du joueur (inactif)
    table.hands[playerIndex] = null;

    // Ajouter une pénalité automatique au score
    table.scores[playerIndex] += 100; // gros malus pour inactivité

    // Passer au tour suivant
    nextTurn(table);
}

/* ----- Mettre à jour le statut affiché ----- */
function updateStatus(msg){
    document.getElementById('status').textContent = msg;
}

/* ----- Vérification Xhol et calcul automatique des points ----- */
function checkXhol(table){
    const hand = table.hands[table.currentPlayer];
    if(!hand || hand.length === 0) return;

    // Détection des combinaisons valides
    const pointsNotLinked = calculatePoints(hand);

    // Si toutes les cartes sont reliées (pointsNotLinked = 0)
    if(pointsNotLinked === 0){
        alert("Xhol effectué ! Aucun point perdu !");
    } else {
        alert("Cartes non reliées : " + pointsNotLinked + " points pour les adversaires !");
    }

    // Mettre à jour le classement de la table
    renderScoreBoard(table);
}

/* ----- Calcul des points (Xhol) ----- */
function calculatePoints(hand){
    if(!hand || hand.length === 0) return 0;

    const remaining = [...hand];
    let pointsNotLinked = 0;

    // Fonction pour vérifier set (minimum 3 cartes du même nombre)
    function isValidSet(cards){
        if(cards.length < 3) return false;
        const values = cards.map(c=>c.value==='JOKER'?null:c.value);
        const firstVal = values.find(v=>v!==null);
        return values.every(v=>v===firstVal || v===null);
    }

    // Fonction pour vérifier suite (minimum 3 cartes consécutives du même symbole)
    function isValidSequence(cards){
        if(cards.length < 3) return false;
        const symbol = cards.find(c=>c.symbol!=='JOKER').symbol;
        let numbers = cards.map(c=>{
            if(c.value==='JOKER') return null;
            if(c.value==='A') return 1;
            if(c.value==='J') return 11;
            if(c.value==='Q') return 12;
            if(c.value==='K') return 13;
            return c.value;
        });
        numbers.sort((a,b)=>a-b);
        for(let i=1;i<numbers.length;i++){
            if(numbers[i] !== null && numbers[i-1] !== null){
                if(numbers[i] - numbers[i-1] !== 1) return false;
            }
        }
        return true;
    }

    // Vérifier et retirer les combinaisons valides
    let found = true;
    while(remaining.length >= 3 && found){
        found = false;
        for(let size=3; size<=remaining.length; size++){
            const combo = remaining.slice(0,size);
            if(isValidSet(combo) || isValidSequence(combo)){
                combo.forEach(c=>{
                    const index = remaining.indexOf(c);
                    if(index > -1) remaining.splice(index,1);
                });
                found = true;
                break;
            }
        }
    }

    // Calculer les points des cartes non reliées
    remaining.forEach(c=>{
        if(c.value==='JOKER') return;
        if(c.value==='A') pointsNotLinked += 10;
        else if(c.value==='J'||c.value==='Q'||c.value==='K') pointsNotLinked += 10;
        else pointsNotLinked += c.value;
    });

    return pointsNotLinked;
}

/* ----- Affichage du score de la table ----- */
function renderScoreBoard(table){
    const sb = document.getElementById('scoreBoard');
    const ul = document.getElementById('scoreList');
    sb.classList.remove('hidden');
    ul.innerHTML = "";
    table.players.forEach((p,i)=>{
        const li = document.createElement('li');
        li.textContent = p + " : " + table.scores[i] + " pts";
        ul.appendChild(li);
    });
}

/* ----- Bouton Déclarer Xhol ----- */
document.getElementById('declareXhol').onclick = ()=>{
    const table = currentTable;
    if(!table) return;

    const hand = table.hands[table.currentPlayer];
    if(!hand || hand.length === 0) return;

    const points = calculatePoints(hand);

    if(points === 0){
        alert("Xhol réussi ! Aucun point perdu !");
        // Le joueur marque -10 points (selon règles) ou selon variante
        table.scores[table.currentPlayer] -= 10;
        renderScoreBoard(table);
        // Fin de manche, redistribuer si nécessaire
        endRound(table);
    } else {
        alert("Xhol impossible : certaines cartes ne peuvent pas être reliées !");
    }
};

/* ----- Fin de manche et redistribution ----- */
function endRound(table){
    // Vérifier si un joueur a atteint la cible
    for(let i=0;i<table.scores.length;i++){
        if(table.scores[i] >= table.targetScore){
            alert(table.players[i] + " a atteint " + table.targetScore + " points et perd la partie !");
            resetTable(table);
            return;
        }
    }

    // Redistribuer pour nouvelle manche
    table.deck = createDeck();
    table.hands = Array(table.maxPlayers).fill(0).map(()=>[]);
    table.discardPile = [];
    distributeCards(table);
    renderHands(table);
    updateStatus("Tour de " + table.players[table.currentPlayer]);
    startTurnTimer(table);
}

/* ----- Réinitialiser table après fin de partie ----- */
function resetTable(table){
    table.hands = [];
    table.deck = [];
    table.discardPile = [];
    table.scores = Array(table.maxPlayers).fill(0);
    currentTable = null;
    document.getElementById('gameContainer').classList.add('hidden');
    document.getElementById('lobby').classList.remove('hidden');
    renderTables();
    alert("Nouvelle partie disponible !");
}

/* ----- Bonus : Fonction pour mélanger un tableau ----- */
function shuffle(array) {
    for(let i = array.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/* ----------------- Classement global ----------------- */
function updateGlobalRanking(){
    const ul = document.getElementById('globalRanking');
    ul.innerHTML = "";
    // Trier tous les utilisateurs par score total (simulé ici avec 0 pour démo)
    const sortedUsers = Object.keys(users).sort((a,b)=>{
        return 0; // Pour l'instant, on n'a pas de score global stocké
    });
    sortedUsers.forEach(u=>{
        const li = document.createElement('li');
        li.textContent = u + " : 0 pts"; // À remplacer par score réel
        ul.appendChild(li);
    });
}

/* ----------------- Rafraîchissement automatique du lobby ----------------- */
setInterval(()=>{
    renderTables();
    updateGlobalRanking();
},5000);

/* ----------------- Sélection de la table ----------------- */
function selectTable(tableId){
    const table = tables.find(t=>t.id===tableId);
    if(table){
        if(table.players.length < table.maxPlayers){
            table.players.push(playerName);
            table.scores.push(0);
            currentTable = table;
            startGame(table);
        } else alert("Table complète !");
    } else alert("Table introuvable !");
}

/* ----------------- Gestion du Xhol automatique ----------------- */
function autoXholCheck(){
    if(!currentTable) return;
    const hand = currentTable.hands[currentTable.currentPlayer];
    if(!hand) return;
    const points = calculatePoints(hand);
    if(points===0){
        alert(currentTable.players[currentTable.currentPlayer] + " peut faire Xhol automatiquement !");
        table.scores[currentTable.currentPlayer] -= 10;
        renderScoreBoard(currentTable);
        endRound(currentTable);
    }
}

/* ----------------- Détection de fin de partie ----------------- */
function checkEndGame(table){
    for(let i=0;i<table.scores.length;i++){
        if(table.scores[i] >= table.targetScore){
            alert(table.players[i] + " a atteint " + table.targetScore + " points. Partie terminée !");
            resetTable(table);
            return true;
        }
    }
    return false;
}

/* ----------------- Gestion responsive et animations ----------------- */
window.addEventListener('resize', ()=>{
    renderHands(currentTable);
});

/* ----------------- Pioche et défausse ----------------- */
document.getElementById('drawDeck').onclick = ()=>{
    const table = currentTable;
    if(!table) return;
    if(!table.deck.length) return alert("Deck vide !");
    const card = table.deck.pop();
    table.hands[table.currentPlayer].push(card);
    renderHands(table);
    autoXholCheck();
};

document.getElementById('takeDiscard').onclick = ()=>{
    const table = currentTable;
    if(!table) return;
    if(!table.discardPile.length) return alert("Défausse vide !");
    const card = table.discardPile.pop();
    table.hands[table.currentPlayer].push(card);
    renderHands(table);
    autoXholCheck();
};

/* ----------------- Défausse d'une carte ----------------- */
function discardCard(table, cardIndex){
    clearTimeout(table.turnTimer);
    const card = table.hands[table.currentPlayer].splice(cardIndex,1)[0];
    table.discardPile.push(card);
    renderHands(table);
    nextTurn(table);
}

/* ----------------- Gestion automatique du tour ----------------- */
function nextTurn(table){
    table.currentPlayer = (table.currentPlayer + 1) % table.maxPlayers;

    // Skip les joueurs bannis (hands=null)
    while(!table.hands[table.currentPlayer]){
        table.currentPlayer = (table.currentPlayer + 1) % table.maxPlayers;
    }

    updateStatus("Tour de " + table.players[table.currentPlayer]);
    startTurnTimer(table);
}

/* ----------------- Timer du tour ----------------- */
function startTurnTimer(table){
    clearTimeout(table.turnTimer);
    table.turnTimer = setTimeout(()=>{
        banPlayer(table, table.currentPlayer);
    }, table.TURN_TIME_LIMIT);
}

/* ----------------- Bannissement ----------------- */
function banPlayer(table, index){
    alert(table.players[index] + " n'a pas joué à temps et est banni !");
    table.hands[index] = null; // supprime la main
    table.scores[index] += 100; // pénalité
    nextTurn(table);
}

/* ----------------- Mise à jour du statut ----------------- */
function updateStatus(msg){
    document.getElementById('status').textContent = msg;
}

/* ----------------- ScoreBoard ----------------- */
function renderScoreBoard(table){
    const sb = document.getElementById('scoreBoard');
    const ul = document.getElementById('scoreList');
    sb.classList.remove('hidden');
    ul.innerHTML = "";
    table.players.forEach((p,i)=>{
        const li = document.createElement('li');
        li.textContent = p + " : " + table.scores[i] + " pts";
        ul.appendChild(li);
    });
}

/* ----------------- Détection automatique Xhol ----------------- */
function autoXholCheck(){
    if(!currentTable) return;
    const hand = currentTable.hands[currentTable.currentPlayer];
    if(!hand) return;
    const points = calculatePoints(hand);
    if(points===0){
        alert(currentTable.players[currentTable.currentPlayer] + " peut faire Xhol !");
        currentTable.scores[currentTable.currentPlayer] -= 10;
        renderScoreBoard(currentTable);
        endRound(currentTable);
    }
}

/* ----------------- Fin de manche ----------------- */
function endRound(table){
    if(checkEndGame(table)) return;
    table.deck = createDeck();
    table.hands = Array(table.maxPlayers).fill(0).map(()=>[]);
    table.discardPile = [];
    distributeCards(table);
    renderHands(table);
    updateStatus("Tour de " + table.players[table.currentPlayer]);
    startTurnTimer(table);
}

/* ----------------- Fin de partie ----------------- */
function checkEndGame(table){
    for(let i=0;i<table.scores.length;i++){
        if(table.scores[i]>=table.targetScore){
            alert(table.players[i] + " a atteint " + table.targetScore + " points et perd la partie !");
            resetTable(table);
            return true;
        }
    }
    return false;
}

function resetTable(table){
    table.hands=[];
    table.deck=[];
    table.discardPile=[];
    table.scores=Array(table.maxPlayers).fill(0);
    currentTable=null;
    document.getElementById('gameContainer').classList.add('hidden');
    document.getElementById('lobby').classList.remove('hidden');
    renderTables();
    alert("Nouvelle partie disponible !");
}

// Réinitialiser le timer si un tour était en cours
    if(table.turnTimer) {
        clearTimeout(table.turnTimer);
        table.turnTimer = null;
    }

    // Réinitialiser l'affichage des cartes et mains
    const playersContainer = document.getElementById('playersContainer');
    playersContainer.innerHTML = "";

    // Réinitialiser la défausse et le deck visuel
    document.getElementById('deck').textContent = "Deck";
    document.getElementById('cutCard').classList.add('hidden');
    document.getElementById('discardPile').textContent = "Défausse";

    // Mettre à jour le classement global après reset
    updateGlobalRanking();

    // Réafficher le lobby pour permettre aux joueurs de créer ou rejoindre de nouvelles tables
    document.getElementById('lobby').classList.remove('hidden');
}

// Rafraîchir régulièrement le lobby et le classement
setInterval(() => {
    if (!currentTable) {  // Si aucun jeu en cours
        renderTables();   // Mettre à jour les tables disponibles
        updateGlobalRanking(); // Mettre à jour le classement global
    }
}, 5000); // toutes les 5 secondes

// Gestion des clics sur les tables existantes pour rejoindre
document.getElementById('tablesList').addEventListener('click', (e) => {
    if(e.target.tagName === 'BUTTON'){ 
        const tableId = e.target.parentElement.textContent.split(' ')[1]; // récupération de l'id
        selectTable(tableId); // fonction pour rejoindre la table
    }
});

// Affichage d’un message de bienvenue et rappel des règles
updateStatus("Bienvenue dans le lobby, " + playerName + ". Créez ou rejoignez une table pour jouer.");

/* ----------------- Création de nouvelle table ----------------- */
document.getElementById('createTableBtn').onclick = () => {
    const numPlayers = parseInt(document.getElementById('numPlayers').value);
    const targetScore = parseInt(document.getElementById('targetScore').value);

    if(numPlayers < 2 || numPlayers > 6){
        alert("Le nombre de joueurs doit être entre 2 et 6.");
        return;
    }

    const tableId = "table" + tables.length;
    const newTable = {
        id: tableId,
        maxPlayers: numPlayers,
        targetScore: targetScore,
        players: [],
        hands: [],
        deck: [],
        discardPile: [],
        scores: [],
        currentPlayer: 0,
        turnTimer: null,
        TURN_TIME_LIMIT: 60000
    };

    tables.push(newTable);
    renderTables();
    alert("Table " + tableId + " créée ! Vous pouvez la rejoindre.");
};

/* ----------------- Rejoindre une table ----------------- */
function selectTable(tableId){
    const table = tables.find(t => t.id === tableId);
    if(!table){
        alert("Table introuvable !");
        return;
    }

    if(table.players.includes(playerName)){
        alert("Vous êtes déjà dans cette table !");
        return;
    }

    if(table.players.length >= table.maxPlayers){
        alert("Table complète !");
        return;
    }

    table.players.push(playerName);
    table.scores.push(0);
    currentTable = table;

    // Commencer le jeu si minimum 2 joueurs sont présents
    if(table.players.length >= 2){
        startGame(table);
    } else {
        alert("Vous avez rejoint la table. En attente d'autres joueurs...");
    }
}
