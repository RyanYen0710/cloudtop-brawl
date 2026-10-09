'use strict';
// Run after building: node --test server/test/titan-avalanche.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const root = join(__dirname, '../..');
const read = p => readFileSync(join(root, p), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function load(server) {
  let now=1000;
  const context = vm.createContext({ console, performance, toast() {},
    Date: class extends Date { static now() { return now; } }, setInterval:()=>1, clearInterval() {} });
  if (server) {
    vm.runInContext(read('server/src/worker.js').replace(/^export class /gm, 'class ').replace(/^export default /gm, 'const worker = '), context);
  } else {
    for (const file of ['data', 'engine', 'match', 'stages2', 'stages', 'ult']) vm.runInContext(read('site/' + file + '.js'), context);
  }
  const net = read('site/net.js'), training = read('site/training.js');
  vm.runInContext(net.slice(net.indexOf('function encodeState(g)'), net.indexOf('/* ---------- joining ---------- */')), context);
  vm.runInContext(net.slice(net.indexOf('function guestView()'), net.indexOf('function guestSendInput()')), context);
  vm.runInContext(training.slice(0, training.indexOf('/* the small panel')), context);
  vm.runInContext(`
    var G={t:0}, NET={}, testSnap=null;
    function lerp(a,b,k){return a+(b-a)*k;}
    function snapPair(){return {a:testSnap,b:testSnap,k:1,rf:testSnap.t};}
    function hydrate(g,s){NET.lb={fm:g.fighters.map(f=>[f.slot,f.c.id,f.tid,f.name,f.color,f.tag]),gid:1,st:g.cfg.stage,sk:3};testSnap=s;return guestView();}
    function resetTraining(){TRAIN.reset=true;}
  `, context);
  const api=vm.runInContext('({makeGame,stepGame,tryUlt,applyHit,koF,encodeState,guestView,hydrate,trainingTick,resetTraining,ROSTER,AVALANCHE_FRAMES,ULT_CUT,BL,BR,BH,BZ'+(server?',srvEncodeState,Room':'')+'})', context);
  api.advanceClock=ms=>{now+=ms;};
  return api;
}
function fresh(api, char='titan', enemy='zephyr', reverse=false) {
const g = api.makeGame({ stage: 0, stocks: 3, time: 0, teams: false, endless: true, slots: [
{ type: 'you', char, team: 0, ctrl: { type: 'local' } },
{ type: 'peer', char: enemy, team: 1, ctrl: { type: 'dummy', mode: 'stand' } },
{ type: 'peer', char: 'aurelia', team: 2, ctrl: { type: 'none' } }
] });
const [f,o,p] = g.fighters, m = g.stage.solids[0];
for (const x of g.fighters) { x.y=m.y; x.ground=m; x.inv=0; x.halo=0; }
f.x=m.x+m.w*.4; f.face=1; o.x=m.x+m.w*.85; p.x=m.x+40;
if (reverse) g.fighters.reverse();
const tick = (b=api.BR, pr=0, other=0) => api.stepGame(g,g.fighters.map(x=>x===f?{b,pr}:{b:other,pr:0}));
// Z plays Titan's opening scene (the match pauses), then the roll starts
const start = () => { f.ult=true; tick(api.BR,api.BZ); for(let i=0;i<api.ULT_CUT&&!f.avalanche;i++)tick(); };
const roll = () => { start(); for(let i=0;i<20&&f.avalanche;i++){ f.x=m.x+m.w*.4; tick(); } };
return { g,f,o,p,m,tick,start,roll };
}

for (const server of [false,true]) {
const label = server ? 'Worker' : 'solo';
test(label + ': Z plays the opening scene first, then the roll starts and steers', () => {
const api=load(server),s=fresh(api);s.f.ult=true;s.tick(api.BR,api.BZ);
assert.equal(s.f.ult,false);assert.ok(s.g.ult&&s.g.ult.roll,'opening scene');assert.equal(s.f.avalanche,null);
const ox=s.o.x;s.tick(api.BR,0,api.BL);assert.equal(s.o.x,ox,'the match is paused during the scene');
for(let i=0;i<api.ULT_CUT&&!s.f.avalanche;i++)s.tick();
assert.equal(s.g.ult,null);assert.ok(s.f.avalanche);assert.equal(s.f.avalanche.left,api.AVALANCHE_FRAMES);assert.ok(!s.f.vanish);
const v=fresh(api);v.o.x=v.m.x+v.m.w*.95;v.roll();for(let i=0;i<6;i++){v.f.x=v.m.x+v.m.w*.4;v.tick();}assert.ok(v.f.vx>4);
for(let i=0;i<32;i++){v.f.x=v.m.x+v.m.w*.5;v.tick(api.BL);}assert.ok(v.f.vx<0);assert.equal(v.f.face,-1);
v.tick(api.BL,api.BZ);assert.ok(v.f.avalanche,'pressing Z again does not stop the roll');
});
test(label + ': expires by itself after the timer',()=>{
const api=load(server),s=fresh(api);s.o.x=s.m.x+s.m.w*.95;s.roll();
for(let i=0;i<api.AVALANCHE_FRAMES+5&&s.f.avalanche;i++){s.f.x=s.m.x+s.m.w*.4;s.f.vx=0;s.tick(i%2?api.BL:api.BR);}
assert.equal(s.f.avalanche,null);assert.equal(s.o.dmg,0);
});
for(const reverse of [false,true]) test(label + ': hitting a rival stops the roll at once and launches them (reverse order '+reverse+')',()=>{
const api=load(server),s=fresh(api,'titan','zephyr',reverse);s.roll();assert.ok(s.f.avalanche);
s.o.x=s.f.x+30;s.o.y=s.f.y;s.o.ground=s.m;const st=s.f.stocks;s.tick();
assert.equal(s.f.avalanche,null,'roll stopped');assert.equal(s.o.carriedBy,null,'nobody is carried');
assert.ok(s.o.dmg>=8,'real ultimate damage');assert.ok(s.o.vx>3,'launched forward');
for(let i=0;i<30;i++)s.tick(0);assert.equal(s.f.stocks,st);assert.ok(!s.f.out&&s.f.dead<=0,'Titan stays on the stage');
});
test(label + ': stops at the edge of the platform instead of rolling off',()=>{
const api=load(server),s=fresh(api);s.o.x=s.m.x+30;s.p.x=s.m.x+60;s.start();const st=s.f.stocks;
for(let i=0;i<api.AVALANCHE_FRAMES&&s.f.avalanche;i++)s.tick(api.BR);
assert.equal(s.f.avalanche,null);
for(let i=0;i<40;i++)s.tick(0);
assert.equal(s.f.stocks,st);assert.ok(!s.f.out&&s.f.dead<=0);assert.ok(s.f.x<=s.m.x+s.m.w&&s.f.x>=s.m.x,'still on the platform');
});
test(label + ': shield/jump/team/invulnerability are not hit',()=>{
for(const guard of ['shield','jump','team','inv','halo','vanish']){
const api=load(server),v=fresh(api);v.roll();v.o.x=v.f.x+30;
if(guard==='shield')v.o.shielding=true;
else if(guard==='jump'){v.o.y-=180;v.o.ground=null;}
else if(guard==='team')v.o.tid=v.f.tid;
else v.o[guard]=80;
v.tick(api.BR,0,guard==='shield'?api.BH:0);assert.ok(v.f.avalanche,guard);assert.equal(v.o.dmg,0,guard);
}
});
test(label + ': heavy hits, freeze/zap, KO and match end stop the roll safely',()=>{
for(const cause of ['heavy','frozen','zap','ko','over','respawn']){
const api=load(server),v=fresh(api);v.o.x=v.m.x+v.m.w*.95;v.roll();assert.ok(v.f.avalanche,cause);
if(cause==='heavy')api.applyHit(v.p,v.f,{dmg:20,b:40,g:1,angle:45},1,v.g,true);
else if(cause==='ko'){v.f.y=v.g.stage.blast.b+20;api.koF(v.f,v.g);}
else if(cause==='over')v.g.over=true;
else if(cause==='respawn')v.f.spawn(v.m.x+v.m.w*.4,v.m.y,false);
else v.f[cause]=30;
v.tick();assert.equal(v.f.avalanche,null,cause);assert.equal(v.o.dmg,0,cause);
}
});
test(label + ': small hits cannot interrupt armor; stunned activation does not spend the charge',()=>{
const api=load(server),s=fresh(api);s.o.x=s.m.x+s.m.w*.95;s.roll();
assert.equal(api.applyHit(s.p,s.f,{dmg:2,b:2,g:.1,angle:45},1,s.g,true),'armor');
s.tick();assert.ok(s.f.avalanche);
const v=fresh(api);v.f.ult=true;v.f.zap=30;v.tick(api.BR,api.BZ);
assert.equal(v.f.avalanche,null);assert.equal(v.g.ult,null);assert.equal(v.f.ult,true);
});
test(label + ': training does not recharge during a roll, and reset clears it',()=>{
const api=load(server),s=fresh(api);s.o.x=s.m.x+s.m.w*.95;s.roll();api.trainingTick(s.g,[null,null,null]);assert.equal(s.f.ult,false);
api.resetTraining();api.trainingTick(s.g,[null,null,null]);s.tick();assert.equal(s.f.avalanche,null);
});
test(label + ': online guests see the roll and see it end',()=>{
const api=load(server),s=fresh(api);s.o.x=s.m.x+s.m.w*.95;s.roll();let snap=api.encodeState(s.g),view=api.hydrate(s.g,snap);
assert.ok(view.fighters[0].avalanche);
s.o.x=s.f.x+30;s.o.y=s.f.y;s.o.ground=s.m;s.tick();snap=api.encodeState(s.g);view=api.hydrate(s.g,snap);
assert.ok(view.fighters.every(f=>!f.avalanche&&f.carriedBy==null));delete snap.av;
assert.ok(api.hydrate(s.g,snap).fighters.every(f=>!f.avalanche&&f.carriedBy==null));
});
test(label + ': every other fighter retains its old ultimate path and finite state',()=>{
const api=load(server);
for(const c of api.ROSTER){
const s=fresh(api,c.id);s.f.ult=true;s.tick(api.BR,api.BZ);
assert.equal(s.g.ult.slot,s.f.slot,c.name);assert.equal(s.f.avalanche,null,c.name);assert.equal(!!s.g.ult.roll,c.id==='titan',c.name);
for(let i=0;i<470;i++){s.f.x=s.m.x+s.m.w*.4;s.tick(i%60<30?api.BR:api.BL);}
assert.ok(s.g.fighters.every(f=>[f.x,f.y,f.vx,f.vy,f.dmg].every(Number.isFinite)),c.name);
}
});
}
test('Worker and browser emit identical roll state',()=>{
const a=load(false),b=load(true),s=fresh(a),v=fresh(b);for(const x of [s,v]){x.o.x=x.m.x+x.m.w*.95;x.roll();}
const result=b.srvEncodeState(v.g,42);
assert.deepEqual(plain(a.encodeState(s.g).av),plain(result.av));
});

test('two online peers: the host rolls into the guest through the Worker room',()=>{
const api=load(true),room=new api.Room({},{}),logs=[[],[]];room.code='TEST';
const clients=['host','guest'].map((id,i)=>({id,pres:{ib:0,ic:Array(10).fill(0)},ws:{send:raw=>logs[i].push(JSON.parse(raw))},win:1000,n:0}));
clients.forEach(c=>room.clients.set(c.id,c));clients[0].pres.lb={c:'TEST'};
room.onMsg(clients[0],JSON.stringify({cmd:'start',gid:42,cfg:{stage:0,stocks:3,time:2,slots:[
{type:'remote',peer:'host',char:'titan'},{type:'remote',peer:'guest',char:'zephyr'}
]}}));
const g=room.g,[f,o]=g.fighters,m=g.stage.solids[0];
for(const x of g.fighters){x.y=m.y;x.ground=m;x.inv=0;x.halo=0;}
f.x=m.x+m.w*.4;f.face=1;o.x=m.x+m.w*.95;f.ult=true;
const input=(i,b,ult=false)=>{const c=clients[i],ic=c.pres.ic.slice();if(ult)ic[9]++;room.onMsg(c,JSON.stringify({d:{ib:b,ic}}));};
const tick=()=>{api.advanceClock(17);room.tick();};tick();
input(0,api.BR,true);tick();for(let i=0;i<api.ULT_CUT+4;i++)tick();
assert.ok(f.avalanche,'rolling after the opening scene');
const last=i=>logs[i].filter(x=>x.from==='srv'&&x.d.gs).at(-1).d.gs;
assert.deepEqual(plain(last(0).av),plain(last(1).av));
for(let i=0;i<20&&f.avalanche;i++){f.x=m.x+m.w*.4;tick();}
if(f.avalanche){o.x=f.x+30;o.y=f.y;o.ground=m;tick();tick();}
assert.equal(f.avalanche,null);assert.equal(o.carriedBy,null);assert.ok(o.dmg>=8);
assert.deepEqual(plain(last(0).av),[]);assert.deepEqual(plain(last(0).av),plain(last(1).av));room.stop(true);
});
