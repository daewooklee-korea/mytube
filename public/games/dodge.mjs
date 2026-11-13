import { createGame, advance, difficultyAt, WIDTH, HEIGHT, GOAL } from './dodge-engine.mjs'
import { HALL_KEY, cleanEntries, registerScore } from './dodge-leaderboard.mjs'
const $ = id => document.getElementById(id)
const board = $('board'), ctx = board.getContext('2d')
ctx.scale(2, 2)
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
let game = createGame(), last = 0, countdownAt = null, countdownNumber = null, best = { elapsed: 0, score: 0 }, sound = false, audio = null
let target = null, dragId = null
let pendingRecord = null
const keys = new Set(), held = new Map()
try { const b = JSON.parse(localStorage.getItem('playme-dodge-best-v3')) || JSON.parse(localStorage.getItem('playme-dodge-best-v2')); if (Number.isFinite(b?.elapsed) && Number.isFinite(b?.score)) best = { elapsed: b.elapsed, score: Math.floor(b.elapsed + 1e-8) } } catch { /* Storage may be disabled. */ }
function showBest() { $('best').textContent = best.elapsed > 0 ? `${best.elapsed.toFixed(1)}초 · ${best.score.toLocaleString()}점` : '아직 기록이 없어요' }
showBest()
function readHall() { try { return cleanEntries(JSON.parse(localStorage.getItem(HALL_KEY)) ?? (JSON.parse(localStorage.getItem('playme-dodge-hall-v2')) || []).map(row => ({ ...row, score: Math.floor(row.score / 100) }))) } catch { return [] } }
function renderHall(entries = readHall()) {
  $('hallList').replaceChildren(); $('hallEmpty').hidden = entries.length > 0
  entries.forEach((row, index) => {
    const li=document.createElement('li'),rank=document.createElement('span'),name=document.createElement('span'),score=document.createElement('span'),time=document.createElement('small')
    rank.className='rank';rank.textContent=String(index+1).padStart(2,'0');name.className='hall-name';name.textContent=row.name;score.className='hall-points';score.textContent=`${row.score.toLocaleString()}점`;time.textContent=row.score === 30 ? '30초 달성' : `생존 ${row.score}초 이상`;score.append(time);li.append(rank,name,score);$('hallList').append(li)
  })
}
renderHall()
window.addEventListener('storage',e=>{if(e.key===HALL_KEY)renderHall()})
$('openHall').addEventListener('click',()=>{$('hallForm').scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'center'});$('playerName').focus({preventScroll:true})})
$('hallForm').addEventListener('submit',e=>{
  e.preventDefault();if(!pendingRecord)return
  try {
    const result=registerScore(readHall(),$('playerName').value,pendingRecord.score)
    // Only show a saved rank after durable browser storage succeeds.
    localStorage.setItem(HALL_KEY,JSON.stringify(result.entries));renderHall(result.entries)
    $('hallStatus').textContent=result.rank?(result.improved?`${result.name} 님, ${result.rank}위에 등록됐어요!`:`${result.name} 님의 기존 최고 점수를 유지했어요. 현재 ${result.rank}위입니다.`):'기록을 확인했어요. 현재 상위 5위에는 들지 못했지만 다시 도전할 수 있어요.'
    $('hallForm').hidden=true;$('openHall').hidden=true;pendingRecord=null
  } catch(error) { $('hallStatus').textContent=error.name==='QuotaExceededError'||error.name==='SecurityError'?'브라우저 저장 공간을 사용할 수 없어 등록하지 못했어요. 저장 설정을 확인해주세요.':error.message }
})
function clearInput() { keys.clear(); held.clear(); target = null; dragId = null }
function tone(freq = 650, length = .08) {
  if (!sound) return
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); void audio.resume(); const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+length) } catch { /* Audio is optional. */ }
}
function overlay(label, title, text, button, detail='') {
  $('overlayLabel').textContent=label; $('overlayTitle').innerText=title; $('overlayText').innerText=text; $('start').innerHTML=''; $('start').append(document.createTextNode(button)); const arrow=document.createElement('span');arrow.textContent='→';$('start').append(arrow)
  $('result').textContent=detail;$('result').hidden=!detail;$('overlay').hidden=false
}
function beginCountdown() {
  clearInput();pendingRecord=null;$('hallForm').hidden=true;$('openHall').hidden=true;$('hallStatus').textContent='';$('overlay').hidden=true; game.status='countdown';countdownAt=performance.now();countdownNumber=null;$('countdown').hidden=false;$('pause').disabled=true; board.focus({preventScroll:true})
}
function pause() {
  if (!['running','countdown'].includes(game.status)) return
  clearInput();game.status='paused';countdownAt=null;$('countdown').hidden=true;$('pause').disabled=true
  overlay('TAKE A BREATH','잠깐, 쉬어가요.','시간과 점수는 그대로예요.\n준비되면 이어서 도전하세요.','이어서 하기');$('announcement').textContent='일시정지되었습니다.'
}
function finish() {
  clearInput();$('pause').disabled=true
  const record=game.elapsed>best.elapsed+.001 || (game.elapsed>=best.elapsed-.001 && game.score>best.score)
  if(record){best={elapsed:game.elapsed,score:game.score};try{localStorage.setItem('playme-dodge-best-v3',JSON.stringify(best))}catch{/* Optional local record. */}showBest()}
  const won=game.status==='won'
  overlay(won?'MISSION COMPLETE':'SO CLOSE. ONE MORE?',won?'30초, 살아남았다!':'앗, 부딪혔어요.',`${game.elapsed.toFixed(1)}초 생존 · ${game.score.toLocaleString()}점\n${won?'틈을 찾는 감각, 제법인데요?':'다음 틈은 분명 보일 거예요.'}`,'다시 도전',record?'이 기기의 최고 기록을 갱신했어요!':'다시 시작하면 시간과 점수가 초기화됩니다.')
  if(game.score>0){pendingRecord={score:game.score};$('hallForm').hidden=false;$('openHall').hidden=false;$('pendingScore').textContent=`이번 기록: ${game.score.toLocaleString()}점 · 생존 ${game.elapsed.toFixed(2)}초`;renderHall()}
  $('announcement').textContent=won?'성공! 30초를 버텼습니다.':`${game.elapsed.toFixed(1)}초 만에 충돌했습니다. 다시 도전할 수 있습니다.`;tone(won?1000:170,.25);$('start').focus({preventScroll:true})
}
$('start').addEventListener('click',()=>{if(game.status!=='paused')game=createGame();tone();beginCountdown()})
$('pause').addEventListener('click',pause)
$('sound').addEventListener('click',()=>{sound=!sound;$('sound').textContent=sound?'소리 ON':'소리 OFF';$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'효과음 끄기':'효과음 켜기');tone()})
const movementKeys=['ArrowLeft','ArrowRight','a','d','A','D']
window.addEventListener('keydown',e=>{
  if(movementKeys.includes(e.key) && game.status==='running'){e.preventDefault();keys.add(e.key.toLowerCase());target=null}
  if(['Escape','p','P'].includes(e.key) && ['running','countdown'].includes(game.status)){e.preventDefault();pause()}
})
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()))
window.addEventListener('blur',pause)
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()})
function setTarget(e){const r=board.getBoundingClientRect();target=Math.max(18,Math.min(WIDTH-18,(e.clientX-r.left)*WIDTH/r.width))}
board.addEventListener('pointerdown',e=>{if(game.status!=='running')return;e.preventDefault();dragId=e.pointerId;board.setPointerCapture(e.pointerId);setTarget(e)})
board.addEventListener('pointermove',e=>{if(e.pointerId===dragId)setTarget(e)})
function releaseDrag(e){if(e.pointerId===dragId){dragId=null;target=null}}
for(const name of ['pointerup','pointercancel','lostpointercapture'])board.addEventListener(name,releaseDrag)
for(const [id,dir] of [['left',-1],['right',1]]){
 const button=$(id)
 button.addEventListener('pointerdown',e=>{if(game.status!=='running')return;e.preventDefault();target=null;held.set(e.pointerId,dir);button.setPointerCapture(e.pointerId)})
 for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,e=>held.delete(e.pointerId))
 button.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)&&game.status==='running'){e.preventDefault();keys.add(id==='left'?'arrowleft':'arrowright')}})
 button.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key))keys.delete(id==='left'?'arrowleft':'arrowright')})
 button.addEventListener('blur',()=>keys.delete(id==='left'?'arrowleft':'arrowright'))
}
function roundBox(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function paint() {
 ctx.fillStyle='#0d1524';ctx.fillRect(0,0,WIDTH,HEIGHT)
 ctx.strokeStyle='#1c2b40';ctx.lineWidth=.6
 const offset=reducedMotion?0:(game.elapsed*30)%42
 for(let y=-42+offset;y<HEIGHT;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);ctx.stroke()}
 for(let x=0;x<=WIDTH;x+=72){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);ctx.stroke()}
 const renderObstacles=game.status==='ready'?[{x:70,y:85,w:38,h:28},{x:250,y:175,w:38,h:28},{x:140,y:290,w:38,h:28}]:game.obstacles
 for(const o of renderObstacles){ctx.shadowColor='#ff6f97';ctx.shadowBlur=reducedMotion?0:14;ctx.fillStyle='#ff6f97';roundBox(o.x-o.w/2,o.y-o.h/2,o.w,o.h,5);ctx.shadowBlur=0;ctx.fillStyle='#ffbad0';roundBox(o.x-o.w/2+5,o.y-o.h/2+4,o.w-10,3,1)}
 const p=game.player;ctx.fillStyle='#73dcff';ctx.shadowColor='#73dcff';ctx.shadowBlur=reducedMotion?0:19;roundBox(p.x-p.w/2,p.y-p.h/2,p.w,p.h,7);ctx.shadowBlur=0;ctx.fillStyle='#12344c';roundBox(p.x-7,p.y-4,4,4,1);roundBox(p.x+3,p.y-4,4,4,1)
 ctx.strokeStyle='#73dcff45';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(18,HEIGHT-30);ctx.lineTo(WIDTH-18,HEIGHT-30);ctx.stroke()
 $('time').textContent=Math.max(0,GOAL-game.elapsed).toFixed(1);$('score').textContent=game.score.toLocaleString();$('progress').style.width=`${game.elapsed/GOAL*100}%`
 const difficulty=difficultyAt(game.elapsed);$('difficulty').textContent=`LEVEL ${difficulty.level} · 한 번에 ${difficulty.boxesPerWave}개`
}
function loop(now){
 const dt=last?(now-last)/1000:0;last=now
 if(game.status==='countdown'){
  const left=3-Math.floor((now-countdownAt)/1000)
  if(left<=0){$('countdown').hidden=true;game.status='running';$('pause').disabled=false;last=now;clearInput();$('announcement').textContent='시작! 30초 동안 장애물을 피하세요.'}
  else if(left!==countdownNumber){countdownNumber=left;$('countdown').textContent=String(left);tone(400+left*100,.06)}
 }else if(game.status==='running'){
  // A long stalled frame pauses rather than teleporting obstacles into the player.
  if(dt>.25)pause()
  else{const left=keys.has('arrowleft')||keys.has('a'),right=keys.has('arrowright')||keys.has('d');const direction=(right?1:0)-(left?1:0)+Array.from(held.values()).reduce((a,b)=>a+b,0);advance(game,dt,{direction,target});if(['lost','won'].includes(game.status))finish()}
 }
 paint();requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
