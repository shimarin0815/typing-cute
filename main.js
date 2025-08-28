// ======== 設定と状態 ========
const WORDS = {
  easy: [
    "cat","dog","sun","star","milk","mint","pink","blue","book","music",
    "happy","smile","candy","lemon","peach","panda","soda","straw","light","heart"
  ],
  normal: [
    "planet","bubble","summer","cotton","island","purple","future","cursor","rhythm","galaxy",
    "memory","coffee","cookie","dragon","window","flower","simple","rocket","sprite","forest"
  ],
  hard: [
    "aesthetic","synchronize","interaction","extraordinary","responsible",
    "imagination","translucent","typography","constellation","revolution",
    "metaphorical","subscription","overwhelming","investigate","configuration"
  ]
};

const TIME_LIMIT = 60; // 秒

// DOM参照
const elWord = document.getElementById("word");
const elInput = document.getElementById("input");
const elTime  = document.getElementById("time");
const elScore = document.getElementById("score");
const elWpm   = document.getElementById("wpm");
const elAcc   = document.getElementById("acc");
const elBest  = document.getElementById("best");
const elUnderline = document.getElementById("underline");

const startBtn = document.getElementById("startBtn");
const againBtn = document.getElementById("againBtn");
const levelSel = document.getElementById("level");
const modal    = document.getElementById("modal");
const rScore   = document.getElementById("rScore");
const rWpm     = document.getElementById("rWpm");
const rAcc     = document.getElementById("rAcc");
const rBest    = document.getElementById("rBest");

// ゲーム状態
let state = {
  playing: false,
  level: "normal",
  timeLeft: TIME_LIMIT,
  score: 0,
  word: "",
  typed: "",
  correctKeystrokes: 0,
  totalKeystrokes: 0,
  completedWords: 0,
  startAt: 0,
  timerId: null
};

// ベストスコア読み込み
const BEST_KEY = "typing-cute-best";
elBest.textContent = Number(localStorage.getItem(BEST_KEY) || 0);

// ======== ユーティリティ ========
function pickWord(){
  const pool = WORDS[state.level];
  return pool[Math.floor(Math.random()*pool.length)];
}

function renderWord(){
  // typed と word を比較して色付け
  const { typed, word } = state;
  let html = "";
  let okLen = 0;
  for(let i=0;i<typed.length;i++){
    if(word[i] === typed[i]){ okLen++; }
  }
  const okPart = word.slice(0, okLen);
  const midPart = word.slice(okLen, typed.length);
  const rest = word.slice(typed.length);

  if(okPart) html += `<span class="ok">${escapeHtml(okPart)}</span>`;
  if(midPart) html += `<span class="ng">${escapeHtml(midPart)}</span>`;
  if(rest) html += escapeHtml(rest);

  elWord.innerHTML = html || "press START";

  // 下線（進捗バー的に伸びる）
  const ratio = Math.min(typed.length / word.length, 1);
  elUnderline.style.width = `${(ratio * 100).toFixed(0)}%`;
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function resetGame(){
  clearInterval(state.timerId);
  state = {
    playing:false, level: levelSel.value, timeLeft: TIME_LIMIT, score:0,
    word:"", typed:"", correctKeystrokes:0, totalKeystrokes:0, completedWords:0,
    startAt:0, timerId:null
  };
  elTime.textContent = TIME_LIMIT;
  elScore.textContent = 0;
  elWpm.textContent = 0;
  elAcc.textContent = "100%";
  elInput.value = "";
  elInput.disabled = true;
  elUnderline.style.width = "0%";
  elWord.textContent = "press START";
  startBtn.textContent = "START";
}

function startGame(){
  resetGame();
  state.playing = true;
  state.startAt = Date.now();
  state.word = pickWord();
  elInput.disabled = false;
  elInput.focus();
  startBtn.textContent = "RESTART";
  renderWord();

  // タイマー
  state.timerId = setInterval(()=>{
    state.timeLeft--;
    elTime.textContent = state.timeLeft;
    updateHud();
    if(state.timeLeft <= 0){
      finishGame();
    }
  },1000);
}

function finishGame(){
  clearInterval(state.timerId);
  state.playing = false;
  elInput.disabled = true;

  // ベスト更新
  const best = Number(localStorage.getItem(BEST_KEY) || 0);
  const newBest = Math.max(best, state.score);
  localStorage.setItem(BEST_KEY, String(newBest));
  elBest.textContent = newBest;

  // 結果
  const { wpm, acc } = calcMetrics();
  rScore.textContent = state.score;
  rWpm.textContent = wpm;
  rAcc.textContent = `${acc}%`;
  rBest.textContent = newBest;

  modal.classList.remove("hidden");
}

function calcMetrics(){
  const elapsedMin = Math.max((Date.now() - state.startAt)/1000/60, 1/60);
  const wpm = Math.round(state.completedWords / elapsedMin);
  const acc = state.totalKeystrokes === 0 ? 100 :
              Math.max(0, Math.round(state.correctKeystrokes / state.totalKeystrokes * 100));
  return { wpm, acc };
}

function updateHud(){
  const { wpm, acc } = calcMetrics();
  elScore.textContent = state.score;
  elWpm.textContent = wpm;
  elAcc.textContent = `${acc}%`;
}

// ======== 入力処理 ========
elInput.addEventListener("input", (e)=>{
  if(!state.playing) return;
  const value = e.target.value;
  const before = state.typed;
  state.typed = value;

  // 打鍵数カウント（差分分だけ増やす簡易法）
  if(value.length > before.length){
    // 追加された分だけ評価
    const added = value.slice(before.length);
    for(const ch of added){
      state.totalKeystrokes++;
      const idx = state.typed.length - 1; // いま打った位置
      if(state.word[idx] === ch){ state.correctKeystrokes++; }
    }
  }

  // 正誤表示
  renderWord();

  // 完了したら次へ
  if(state.typed === state.word){
    state.score += 10;               // 単語クリアで10点
    state.completedWords++;
    // ほんのちょっと時間ボーナス（やる気アップ）
    state.timeLeft = Math.min(TIME_LIMIT, state.timeLeft + 2);
    elTime.textContent = state.timeLeft;

    // 次の単語へ
    state.word = pickWord();
    state.typed = "";
    elInput.value = "";
    renderWord();
    updateHud();
  }

  // 明らかなミス（文字数オーバー）で軽くバイブ風演出
  if(state.typed.length > state.word.length){
    shake(elWord);
  }
});

// 小さなシェイク演出
let shaking = false;
function shake(el){
  if(shaking) return;
  shaking = true;
  const base = el.style.transform;
  el.style.transition = "transform .06s";
  el.style.transform = "translateX(-3px)";
  setTimeout(()=>{ el.style.transform = "translateX(3px)"; },60);
  setTimeout(()=>{ el.style.transform = base; shaking=false; },120);
}

// ======== ボタンなど ========
startBtn.addEventListener("click", ()=>{
  if(state.playing){
    // リスタート
    startGame();
  }else{
    startGame();
  }
});

againBtn.addEventListener("click", ()=>{
  modal.classList.add("hidden");
  startGame();
});

levelSel.addEventListener("change", ()=>{
  // 難易度だけ更新（スタンバイ中なら文字を差し替え）
  state.level = levelSel.value;
  if(!state.playing){
    elWord.textContent = `${levelSel.value.toUpperCase()} mode`;
  }
});

// ページロード時にリセット
resetGame();
