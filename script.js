const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const CORRECT_PIN = "0106";
const START_DATE = new Date(2025, 5, 1, 0, 0, 0);
let pin = "";

const lockScreen = $("#lockScreen");
const app = $("#app");
const audio = $("#audio");
const miniPlayer = $("#miniPlayer");
const playerToggle = $("#playerToggle");
const musicFab = $("#musicFab");
const progress = $("#trackProgress");
const toast = $("#toast");

function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function updatePin(){
  $$("#pinDisplay span").forEach((dot, i) => dot.classList.toggle("filled", i < pin.length));
  $("#pinError").textContent = "";
}

function submitPin(){
  if(pin.length !== 4){
    $("#pinError").textContent = "Completa los 4 números ♡";
    return;
  }
  if(pin === CORRECT_PIN){
    lockScreen.animate(
      [{opacity:1, transform:"scale(1)"},{opacity:0, transform:"scale(1.035)"}],
      {duration:650,easing:"ease",fill:"forwards"}
    ).onfinish = () => {
      lockScreen.style.display = "none";
      app.classList.remove("app-hidden");
      setTimeout(() => miniPlayer.classList.add("show"), 900);
      revealObserver();
      tryPlayAudio();
    };
  }else{
    $("#pinError").textContent = "Esa no es nuestra fecha ♡";
    pin = "";
    updatePin();
    $(".lock-wrap").animate(
      [{transform:"translateX(0)"},{transform:"translateX(-8px)"},{transform:"translateX(8px)"},{transform:"translateX(0)"}],
      {duration:360}
    );
  }
}

$$("[data-key]").forEach(btn => btn.addEventListener("click", () => {
  if(pin.length < 4){
    pin += btn.dataset.key;
    updatePin();
    if(pin.length === 4) setTimeout(submitPin, 180);
  }
}));
$("#deletePin").addEventListener("click", () => {
  pin = pin.slice(0,-1);
  updatePin();
});
$("#submitPin").addEventListener("click", submitPin);

window.addEventListener("keydown", e => {
  if(lockScreen.style.display === "none") return;
  if(/^\d$/.test(e.key) && pin.length < 4){
    pin += e.key; updatePin();
  }else if(e.key === "Backspace"){
    pin = pin.slice(0,-1); updatePin();
  }else if(e.key === "Enter"){
    submitPin();
  }
});

function tickCounter(){
  let diff = Math.max(0, Date.now() - START_DATE.getTime());
  let total = Math.floor(diff / 1000);
  const days = Math.floor(total / 86400); total %= 86400;
  const hours = Math.floor(total / 3600); total %= 3600;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  $("#days").textContent = days;
  $("#hours").textContent = String(hours).padStart(2,"0");
  $("#minutes").textContent = String(minutes).padStart(2,"0");
  $("#seconds").textContent = String(seconds).padStart(2,"0");
}
tickCounter();
setInterval(tickCounter,1000);

/* Polaroids */
const rotations = ["-3deg","2deg","-1.5deg","3deg","1deg","-2.5deg","2.4deg","-1deg","3.2deg","-2deg","1.7deg","-3.2deg"];
const polaroidGrid = $("#polaroidGrid");
for(let i=1;i<=12;i++){
  const figure = document.createElement("figure");
  figure.className = "polaroid";
  figure.style.setProperty("--rot", rotations[i-1]);
  figure.innerHTML = `<img loading="lazy" src="assets/photos/foto${String(i).padStart(2,"0")}.jpg" alt="Momento de amor ${i}">`;
  polaroidGrid.appendChild(figure);
}

/* Galaxia giratoria 2D con profundidad */
const galaxyStage = $("#galaxyStage");
const galaxyItems = [];
for(let i=1;i<=12;i++){
  const el = document.createElement("div");
  el.className = "galaxy-photo";
  el.innerHTML = `<img draggable="false" src="assets/photos/foto${String(i).padStart(2,"0")}.jpg" alt="Recuerdo ${i}">`;
  galaxyStage.appendChild(el);
  galaxyItems.push({
    el,
    ring: i % 3 === 0 ? 0 : 1,
    base: (Math.PI*2/12)*i + (i%2 ? .2 : -.15)
  });
}

let galaxyRotation = 0;
let galaxyDragging = false;
let galaxyStartX = 0;
let galaxyStartRot = 0;
let lastTs = 0;

function layoutGalaxy(ts=0){
  const rect = galaxyStage.getBoundingClientRect();
  const cx = rect.width/2;
  const cy = rect.height*.53;
  const mobile = rect.width < 560;
  galaxyItems.forEach((item, idx) => {
    const inner = item.ring === 0;
    const rx = inner ? rect.width*(mobile?.24:.22) : rect.width*(mobile?.38:.42);
    const ry = inner ? rect.height*(mobile?.16:.17) : rect.height*(mobile?.29:.31);
    const speedFactor = inner ? -1.15 : 1;
    const angle = item.base + galaxyRotation*speedFactor;
    const x = cx + Math.cos(angle)*rx;
    const y = cy + Math.sin(angle)*ry;
    const depth = (Math.sin(angle)+1)/2;
    const scale = (inner ? .72 : .64) + depth*(inner ? .30 : .42);
    const rot = Math.cos(angle)*5;
    item.el.style.left = `${x}px`;
    item.el.style.top = `${y}px`;
    item.el.style.transform = `translate(-50%,-50%) scale(${scale}) rotate(${rot}deg)`;
    item.el.style.zIndex = String(20 + Math.round(depth*60));
    item.el.style.opacity = String(.56 + depth*.44);
  });
  if(!galaxyDragging){
    const delta = lastTs ? (ts-lastTs) : 16;
    galaxyRotation += Math.min(delta,40)*0.00012;
  }
  lastTs = ts;
  requestAnimationFrame(layoutGalaxy);
}
requestAnimationFrame(layoutGalaxy);

galaxyStage.addEventListener("pointerdown", e => {
  galaxyDragging = true;
  galaxyStartX = e.clientX;
  galaxyStartRot = galaxyRotation;
  galaxyStage.setPointerCapture?.(e.pointerId);
});
galaxyStage.addEventListener("pointermove", e => {
  if(!galaxyDragging) return;
  galaxyRotation = galaxyStartRot + (e.clientX-galaxyStartX)*0.007;
});
["pointerup","pointercancel","pointerleave"].forEach(type => galaxyStage.addEventListener(type, () => {
  galaxyDragging = false;
}));

/* Carta: abre sobre y luego modal real para evitar recortes */
const envelope = $("#envelope");
const letterModal = $("#letterModal");
$("#openLetter").addEventListener("click", () => {
  envelope.classList.add("open");
  setTimeout(() => {
    letterModal.classList.add("open");
    letterModal.setAttribute("aria-hidden","false");
    document.body.classList.add("modal-open");
  }, 620);
});
$("#closeLetter").addEventListener("click", () => {
  letterModal.classList.remove("open");
  letterModal.setAttribute("aria-hidden","true");
  document.body.classList.remove("modal-open");
  setTimeout(() => envelope.classList.remove("open"), 250);
});
letterModal.addEventListener("click", e => {
  if(e.target === letterModal) $("#closeLetter").click();
});
window.addEventListener("keydown", e => {
  if(e.key === "Escape" && letterModal.classList.contains("open")) $("#closeLetter").click();
});

/* Música */
async function tryPlayAudio(){
  try{
    await audio.play();
    playerToggle.textContent = "Ⅱ";
  }catch{
    playerToggle.textContent = "▶";
    showToast("Para escuchar “Rewrite the Stars”, agrega tu MP3 en assets/audio/rewrite-the-stars.mp3 🎵");
  }
}
function toggleAudio(){
  if(audio.paused){
    tryPlayAudio();
  }else{
    audio.pause();
    playerToggle.textContent = "▶";
  }
}
playerToggle.addEventListener("click", toggleAudio);
musicFab.addEventListener("click", toggleAudio);
audio.addEventListener("play", () => playerToggle.textContent = "Ⅱ");
audio.addEventListener("pause", () => playerToggle.textContent = "▶");
audio.addEventListener("timeupdate", () => {
  if(audio.duration && Number.isFinite(audio.duration)){
    progress.style.width = `${audio.currentTime/audio.duration*100}%`;
  }
});
audio.addEventListener("error", () => {
  showToast("Falta el archivo de música: assets/audio/rewrite-the-stars.mp3");
});

/* Reveal */
let observer;
function revealObserver(){
  if(observer) observer.disconnect();
  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting) entry.target.classList.add("visible");
    });
  },{threshold:.10});
  $$(".reveal").forEach(el => observer.observe(el));
}

/* estrellas */
const canvas = $("#starfield");
const ctx = canvas.getContext("2d");
let stars = [];
function resizeStars(){
  const dpr = Math.min(devicePixelRatio || 1,2);
  canvas.width = innerWidth*dpr;
  canvas.height = innerHeight*dpr;
  canvas.style.width = innerWidth+"px";
  canvas.style.height = innerHeight+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
  stars = Array.from({length:Math.min(180,Math.floor(innerWidth*innerHeight/6000))},()=>({
    x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.3+.25,
    a:Math.random()*.8+.2,s:Math.random()*.02+.005
  }));
}
function drawStars(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  stars.forEach(s=>{
    s.a += s.s;
    if(s.a>1 || s.a<.2) s.s*=-1;
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,${150+Math.floor(Math.random()*60)},${205+Math.floor(Math.random()*40)},${s.a})`;
    ctx.fill();
  });
  requestAnimationFrame(drawStars);
}
addEventListener("resize",resizeStars);
resizeStars();drawStars();

/* pétalos/corazones */
const petals = $("#petals");
setInterval(() => {
  if(app.classList.contains("app-hidden")) return;
  const p = document.createElement("span");
  p.className = "petal";
  p.textContent = Math.random()>.45 ? "♥" : "✦";
  p.style.left = Math.random()*100+"vw";
  p.style.fontSize = 10+Math.random()*16+"px";
  p.style.setProperty("--drift",`${-80+Math.random()*160}px`);
  p.style.animationDuration = 7+Math.random()*6+"s";
  petals.appendChild(p);
  setTimeout(()=>p.remove(),14000);
},850);
