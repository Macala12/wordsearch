"use strict";

const API_BASE_URL = 'https://octagames.ng';
const urlParams = new URLSearchParams(window.location.search);
const userid = urlParams.get("userid");
const id = urlParams.get("id");
const key = urlParams.get("key");

/* ================= WORD LIST ================= */
const WORD_DICTIONARY = [
  "PLAY","GAME","WORD","GRID","SCORE","FAST","TIME","DRAG","FIND","MATCH",
  "CLASH","LEVEL","BRAIN","LOGIC","SKILL","POWER","ROUND","CLICK","TAP",
  "BONUS","SPEED","THINK","FOCUS","REACT","GOAL","COIN",

  "PUZZLE","PLAYER","TARGET","WINNER","LOSING","GUESS","SEARCH","SELECT",
  "SOLVER","CHOOSE","ACTION","RANDOM","MEMORY","RESULT","REWARD","BATTLE",
  "STRIKE","DEFEND","ATTACK","MASTER","LEADER","RIDDLE","VISION","TACTIC",
  "REFLEX","HUNTER","MATRIX","PATTERN","MISSION","OBJECT","CONTROL","POINTS",

  "COMBO","CHAIN","STREAK","ENERGY","CHANCE","BLAZE","SWIFT","SMART","SHARP",
  "THRILL","VICTORY","FAILURE","BALANCE","CONNECT","COLLECT","ADVANCE",
  "TRIGGER","CAPTURE","COMPETE","SUCCESS","MINDSET","ENDLESS","ACCURATE",

  "PUZZLED","SOLVING","FOCUSED","THINKER","BRAINY","TACTICS","RESPOND",
  "REACTOR","ENGAGE","ACHIEVE","DOMINATE","SURVIVE","UPGRADE","EXPERT"
];

const difficulty = Math.random()<0.6?"MEDIUM":"HARD";
const wordChosen = new Audio('../assets/music.mp3');
const music = new Audio('../assets/choose.mp3');
let score;
let oppScore;
let username;
let oppUsername;
let userImg;
let oppImg;
let wagerOctacoin;

/* Fill up to 200 words */
while (WORD_DICTIONARY.length < 200) {
  const w = WORD_DICTIONARY[Math.floor(Math.random() * WORD_DICTIONARY.length)];
  WORD_DICTIONARY.push(w);
}

/* ================= GAME CLASS ================= */
PreloadGame().then(initialize => { 
    if (!initialize.payload.status) {
        window.location.href = `${API_BASE_URL}/404`;
        return;        
    }

    score = initialize.payload.payload.score;
    oppScore = initialize.payload.payload.oppScore;
    oppUsername = initialize.payload.payload.oppUsername;
    username = initialize.payload.payload.username;
    wagerOctacoin = initialize.payload.payload.wagerOctacoin;
    userImg = `<img src="https://api.dicebear.com/9.x/big-smile/svg?seed=${username}&radius=50&backgroundType=gradientLinear&randomizeIds=true&skinColor=643d19,8c5a2b,a47539,c99c62&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf" width="70px">`;
    oppImg = `<img src="https://api.dicebear.com/9.x/big-smile/svg?seed=${oppUsername}&radius=50&backgroundType=gradientLinear&randomizeIds=true&skinColor=643d19,8c5a2b,a47539,c99c62&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf" width="70px" >`;

    document.querySelector('.player').innerHTML = username;
    document.querySelector('.opponent').innerHTML = oppUsername;

    document.querySelector('.player-img').innerHTML = userImg;
    document.querySelector('.opp-img').innerHTML = oppImg;

    document.querySelector('.reward_ui').innerHTML = 'N'+initialize.payload.payload.reward;
    document.querySelector('.octacoin').innerHTML = 
    `
        <img src="./assets/logo.png" width="20px" alt="coin">
        ${initialize.payload.payload.wagerOctacoin}
    `;
    document.querySelector('.value_balance').innerHTML =     `
        <img src="./assets/dollars.png" width="20px" alt="coin">
        ${initialize.payload.payload.reward}
    `;
});

document.getElementById("playBtn").addEventListener("click", () => {
  document.getElementById("homeScreen").style.display = "none";
  document.querySelector('main').style.display = 'block';
  music.play()
  music.volume = 0.5;
});

class OctaWordGame {
  constructor() {
    this.size = 10;
    this.board = [];
    this.wordsOnBoard = []; 
    this.usedCells = new Set();

    this.userScore = score || 0;
    this.cpuScore = oppScore || 0;
    this.phase = "USER";
    this.timeLeft = difficulty === "MEDIUM" ? 90 : 60;

    this.userWords = [];
    this.cpuWords = [];

    this.dragPath = [];
    this.timer = null;

    this.loadState() || this.startNewGame();
    this.render();
    this.enableDrag();
    this.startUserTimer();
  }

  startNewGame() {
    this.board = Array(this.size*this.size).fill("");
    this.wordsOnBoard = [];
    this.usedCells.clear();
    this.userScore = 0;
    this.cpuScore = 0;
    this.userWords = [];
    this.cpuWords = [];
    this.phase = "USER";
    this.timeLeft = 90;

    this.placeWordsOnBoard();
    this.fillEmptyCells();
    sessionStorage.clear();
  }

  placeWordsOnBoard() {
    const wordsSet = new Set();
    while(wordsSet.size < 20 && wordsSet.size < WORD_DICTIONARY.length){
      const w = WORD_DICTIONARY[Math.floor(Math.random()*WORD_DICTIONARY.length)].toUpperCase();
      wordsSet.add(w);
    }
    const wordsToPlace = Array.from(wordsSet);

    for (let word of wordsToPlace) {
      let placed = false;
      for (let attempt=0; attempt<50; attempt++) {
        const dir = this.randomDirection();
        const start = Math.floor(Math.random() * this.size * this.size);
        const path = this.getWordPath(start, dir, word.length);
        if(path && !path.some(idx => this.board[idx] && this.board[idx] !== word[path.indexOf(idx)])){
          for (let i=0;i<word.length;i++) this.board[path[i]] = word[i];
          this.wordsOnBoard.push({word,path});
          placed=true;
          break;
        }
      }
    }
  }

  fillEmptyCells(){
    for(let i=0;i<this.board.length;i++){
      if(!this.board[i]) this.board[i] = String.fromCharCode(65 + Math.floor(Math.random()*26));
    }
  }

  getWordPath(start, dir, length){
    const path=[];
    let x=start%this.size, y=Math.floor(start/this.size);
    for(let i=0;i<length;i++){
      if(x<0 || x>=this.size || y<0 || y>=this.size) return null;
      path.push(y*this.size + x);
      x += dir[0]; y += dir[1];
    }
    return path;
  }

  randomDirection(){
    const dirs = [[1,0],[0,1],[1,1],[1,-1],[-1,0],[0,-1],[-1,-1],[-1,1]];
    return dirs[Math.floor(Math.random()*dirs.length)];
  }

  render(){
    const boardEl=$("#wordboard").empty();
    this.board.forEach((letter,i)=>{
      $("<div>").addClass("cell").attr("data-index",i).text(letter).appendTo(boardEl);
    });

    const listEl=$("#wordlist").empty();
    this.wordsOnBoard.forEach(w=>{
      $("<span>").addClass("wordItem").attr("data-word",w.word).text(w.word).appendTo(listEl);
    });

    this.updateUI();
    $("#instructions").text("🧑 Drag to form words!");
  }

  updateUI(){
    $("#timer").text(this.timeLeft);
    $("#userScore").text(this.userScore);
    $("#cpuScore").text(this.cpuScore);
  }

  enableDrag(){
    const getIndex = el => parseInt(el.dataset.index);
    const start = el=>{
      if(this.phase!=="USER") return;
      this.dragPath=[getIndex(el)];
      $(el).addClass("selecting");
    };
    const move = el=>{
      if(!this.dragPath.length) return;
      const idx = getIndex(el);
      const last = this.dragPath[this.dragPath.length-1];
      if(this.isAdjacent(last,idx) && !this.dragPath.includes(idx)){
        this.dragPath.push(idx);
        $(el).addClass("selecting");
      }
    };
    const end = ()=>{
      if(this.dragPath.length>=3) this.submitUserWord();
      $(".cell").removeClass("selecting");
      this.dragPath=[];
    };

    $(document)
      .on("mousedown",".cell",e=>start(e.target))
      .on("mouseenter",".cell",e=>move(e.target))
      .on("mouseup",end)
      .on("touchstart",".cell",e=>start(e.target))
      .on("touchmove",e=>{
        const touch = document.elementFromPoint(e.touches[0].clientX,e.touches[0].clientY);
        if(touch && touch.classList.contains("cell")) move(touch);
      })
      .on("touchend",end);
  }

  submitUserWord(){
    const pathStr = this.dragPath.join(",");
    let wordObj = this.wordsOnBoard.find(w=>w.path.join(",")===pathStr);
    let word = this.dragPath.map(i=>this.board[i]).join("");
    if(!WORD_DICTIONARY.includes(word)) return;
    if(this.userWords.includes(word)) return;

    this.markWord(this.dragPath,"user");
    this.userWords.push(word);
    this.userScore += word.length<=5?5:10;

    wordChosen.play();
    wordChosen.volume = 0.5;

    setTimeout(() => {
        wordChosen.pause();
        wordChosen.currentTime = 0;
    }, 1000);

    $(`.wordItem[data-word='${word}']`).addClass("found-user");

    UpdateGameData(this.userScore, 0, this.cpuScore, 0).then(initialize => { 
        if (!initialize.payload.status) {
            alert(initialize.payload.message);
        }
    });

    this.saveState();
    this.updateUI();
  }

  markWord(path,owner){
    path.forEach(i=>{
      $(`.cell[data-index=${i}]`).addClass(owner).removeClass("selecting");
      this.usedCells.add(i);
    });
  }

  isAdjacent(a,b){
    const ax=a%this.size, ay=Math.floor(a/this.size);
    const bx=b%this.size, by=Math.floor(b/this.size);
    return Math.abs(ax-bx)<=1 && Math.abs(ay-by)<=1;
  }

  startUserTimer(){
    this.timer=setInterval(()=>{
      this.timeLeft--;
      this.updateUI();
      this.saveState();
      if(this.timeLeft<=0){
        clearInterval(this.timer);
        this.startCpuTurn();
      }
    },1000);
  }

  startCpuTurn(){
    this.phase="CPU";
    $(".cell").removeClass("user");
    const delay = difficulty==="MEDIUM"?1200:600;
    let time = difficulty === "MEDIUM" ? 7 : 10;

    const cpuLoop = setInterval(()=>{
      $("#instructions").text(`Opponent is playing... ${time}s`);
      if(time--<=0){
        clearInterval(cpuLoop);
        this.phase="END";
        $("#instructions").text("🏁 Game Over!");
        this.saveState();

        // SweetAlert winner
        let message = "";
        if(this.userScore > this.cpuScore){
          message = `You won! 🏆\nYour score: ${this.userScore}\ ${oppUsername}  score: ${this.cpuScore}`;
        } else if(this.userScore < this.cpuScore){
          message = `${oppUsername} won! 🤖\nYour score: ${this.userScore}\ ${oppUsername}  score: ${this.cpuScore}`;
        } else {
          message = `It's a tie! 🤝\nYour score: ${this.userScore}\ ${oppUsername} score: ${this.cpuScore}`;
        }

        gameOver(this.userScore, this.cpuScore).then(initialize => {
            if (!initialize.payload.status) {
                alert(initialize.payload.message);
            } else{
                sessionStorage.removeItem("octaWordGame");
            }
        });

        music.pause();

        Swal.fire({
        title: 'Game Over!',
        text: message,
        icon: 'info',
        confirmButtonText: `Play Again (${wagerOctacoin} coin)`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            // Change button text to Initializing...
            Swal.getConfirmButton().innerHTML = 'Initializing...';

            try {
            await playAgain(); // call your async function
            } catch (err) {
            Swal.showValidationMessage('Failed to start new game');
            }
        }
        });

        return;
      }

      const found = this.cpuFindWord(difficulty);
      if(found){
        this.markWord(found.path,"cpu");
        this.cpuWords.push(found.word);
        this.cpuScore += found.word.length<=5?5:10;
        $(`.wordItem[data-word='${found.word}']`).addClass("found-cpu");
        this.updateUI();
      }
    },delay);
  }

  cpuFindWord(level){
    const candidates = this.wordsOnBoard.filter(w=>{
      return !this.cpuWords.includes(w.word);
    });
    if(candidates.length===0) return null;
    if(level==="MEDIUM"){
      const shortWords = candidates.filter(w=>w.word.length<=5);
      return shortWords[Math.floor(Math.random()*shortWords.length)] || candidates[0];
    } else {
      // Hard: pick word overlapping used cells
      const scored = candidates.map(w=>{
        const overlap = w.path.filter(i=>this.usedCells.has(i)).length;
        return {w,overlap};
      });
      scored.sort((a,b)=>b.overlap-a.overlap);
      return scored[0].w;
    }
  }

  saveState(){
    sessionStorage.setItem("octaWordGame",JSON.stringify({
      board:this.board,
      wordsOnBoard:this.wordsOnBoard,
      usedCells:Array.from(this.usedCells),
      userScore:this.userScore,
      cpuScore:this.cpuScore,
      phase:this.phase,
      timeLeft:this.timeLeft,
      userWords:this.userWords,
      cpuWords:this.cpuWords
    }));
  }

  loadState(){
    const saved = sessionStorage.getItem("octaWordGame");
    if(!saved) return false;
    const s=JSON.parse(saved);
    Object.assign(this,s);
    this.usedCells=new Set(s.usedCells);
    return true;
  }
}

async function PreloadGame() {
    const response = await fetch(`${API_BASE_URL}/initialize_game?id=${id}&userid=${userid}&key=${key}`, {
        method: "GET"
    });
    const result = await response.json();
    
    return { payload: result };
}

async function UpdateGameData(score, moves, oppScore, oppMoves) {
    const response = await fetch(`${API_BASE_URL}/update_game?userid=${userid}&id=${id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            score: score,
            moves: moves,
            oppScore: oppScore,
            oppMoves: oppMoves
        })
    });
    const result = await response.json();

    return { payload: result };
}

async function gameOver(userscore, oppscore) {
    const response = await fetch(`${API_BASE_URL}/end_game`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userid: userid,
            id: id,
            userScore: userscore,
            oppScore: oppscore
        })
    });
    const result = await response.json();

    return { payload: result };
}

async function playAgain() {
    const response = await fetch(`${API_BASE_URL}/new_game`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userid: userid,
            id: id,
            key: key
        })
    });
    const result = await response.json();

    if (result.status) {
        sessionStorage.removeItem("octaWordGame");
        window.location.href = `${result.url}/?userid=${result.payload.userid}&id=${result.payload.gameid}&key=${result.payload.gameKey}`   
    }
}

/* ================= INIT ================= */
$(document).ready(()=>{
  let game = new OctaWordGame();
});
