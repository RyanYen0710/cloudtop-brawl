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
  const api=vm.runInContext('({makeGame,stepGame,tryUlt,applyHit,koF,encodeState,guestView,hydrate,trainingTick,resetTraining,ROSTER,AVALANCHE_FRAMES,BL,BR,BH,BZ'+(server?',srvEncodeState,Room':'')+'})', context);
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
  const roll = () => { f.ult=true; tick(api.BR,api.BZ); for(let i=0;i<20;i++)tick(); };
  const scoop = () => { roll(); o.x=f.x+30; o.y=f.y; o.ground=m; tick(); assert.equal(o.carriedBy,f.slot); };
  return { g,f,o,p,m,tick,roll,scoop };
}

for (const server of [false,true]) {
  const label = server ? 'Worker' : 'solo';
  test(label + ': playable roll consumes charge, has startup, steers, and expires at 240 frames', () => {
    const api=load(server),s=fresh(api);s.f.ult=true;s.tick(api.BR,api.BZ);
    assert.equal(s.f.avalanche.left,240);assert.equal(s.f.ult,false);assert.equal(s.g.ult,null);assert.ok(!s.f.vanish);
    const x=s.o.x;s.tick(api.BR,0,api.BL);assert.ok(s.o.x<x,'other players still move');
    for(let i=0;i<239;i++){s.f.x=s.m.x+s.m.w*.4;s.f.vx=0;s.tick(i%2?api.BL:api.BR);}
    assert.equal(s.f.avalanche,null);
    const v=fresh(api);v.roll();for(let i=0;i<10;i++)v.tick();assert.ok(v.f.vx>8);
    for(let i=0;i<32;i++)v.tick(api.BL);assert.ok(v.f.vx<0);assert.equal(v.f.face,-1);
    v.tick(api.BL,api.BZ);assert.equal(v.f.avalanche,null);assert.ok(v.f.land>0);
  });
  for(const reverse of [false,true]) test(label + ': one rival is carried and thrown with low damage (reverse order '+reverse+')',()=>{
    const api=load(server),s=fresh(api,'titan','zephyr',reverse);s.scoop();assert.equal(s.o.dmg,0);
    s.p.x=s.f.x+20;s.p.y=s.f.y;s.tick();assert.equal(s.p.carriedBy,null);
    const pos=s.o.x;s.tick();assert.notEqual(s.o.x,pos);assert.equal(s.o.carriedBy,s.f.slot);
    assert.equal(api.applyHit(s.p,s.o,{dmg:50,b:20,g:1,angle:45},1,s.g,true),'miss');
    s.tick(api.BR,api.BZ);assert.equal(s.f.avalanche,null);assert.equal(s.o.carriedBy,null);
    assert.ok(s.o.dmg>0&&s.o.dmg<8);assert.ok(s.o.vx>8);assert.equal(s.o.jumps,s.o.ph.jumps-1);assert.ok(!s.o.helpless&&!s.o.upUsed);
  });
  test(label + ': timer automatically throws, and shield/jump/team/invulnerability stop capture',()=>{
    const api=load(server),s=fresh(api);s.scoop();s.f.avalanche.left=1;s.tick();assert.equal(s.o.carriedBy,null);assert.ok(s.o.dmg>0);
    for(const guard of ['shield','jump','team','inv','halo','vanish']){
      const v=fresh(api);v.roll();v.o.x=v.f.x+30;
      if(guard==='shield')v.o.shielding=true;
      else if(guard==='jump'){v.o.y-=180;v.o.ground=null;}
      else if(guard==='team')v.o.tid=v.f.tid;
      else v.o[guard]=80;
      v.tick(api.BR,0,guard==='shield'?api.BH:0);assert.equal(v.o.carriedBy,null,guard);assert.equal(v.o.dmg,0,guard);
    }
  });
  test(label + ': counters, heavy interruption, freeze/zap, KO and match end release safely',()=>{
    const api=load(server),s=fresh(api,'titan','tseng');s.roll();s.o.x=s.f.x+30;
    const m=s.o.c.specials.down;s.o.act={m,t:m.startup,countered:0};s.tick();assert.equal(s.o.carriedBy,null);
    for(const cause of ['heavy','frozen','zap','ko','over','respawn','target-out']){
      const v=fresh(api);v.scoop();
      if(cause==='heavy')api.applyHit(v.p,v.f,{dmg:20,b:40,g:1,angle:45},1,v.g,true);
      else if(cause==='ko'){v.f.y=v.g.stage.blast.b+20;api.koF(v.f,v.g);}
      else if(cause==='over')v.g.over=true;
      else if(cause==='respawn')v.f.spawn(v.m.x+v.m.w*.4,v.m.y,false);
      else if(cause==='target-out')v.o.out=true;
      else v.f[cause]=30;
      v.tick();assert.equal(v.f.avalanche,null,cause);assert.equal(v.o.carriedBy,null,cause);assert.equal(v.o.dmg,0,cause);
      if(cause==='ko')assert.ok(v.o.y<=v.m.y,'KO release returns a captive above the stage');
    }
  });
  test(label + ': small hits cannot interrupt armor; stunned activation does not spend the charge',()=>{
    const api=load(server),s=fresh(api);s.roll();
    assert.equal(api.applyHit(s.p,s.f,{dmg:2,b:2,g:.1,angle:45},1,s.g,true),'armor');
    s.tick();assert.ok(s.f.avalanche);
    const v=fresh(api);v.f.ult=true;v.f.zap=30;v.tick(api.BR,api.BZ);
    assert.equal(v.f.avalanche,null);assert.equal(v.f.ult,true);
  });
  test(label + ': training does not recharge during a roll, and reset clears both fighters',()=>{
    const api=load(server),s=fresh(api);s.scoop();api.trainingTick(s.g,[null,null,null]);assert.equal(s.f.ult,false);
    api.resetTraining();api.trainingTick(s.g,[null,null,null]);s.tick();assert.equal(s.f.avalanche,null);assert.equal(s.o.carriedBy,null);
  });
  test(label + ': online guests round-trip and clear the carry state, including old snapshots',()=>{
    const api=load(server),s=fresh(api);s.scoop();let snap=api.encodeState(s.g),view=api.hydrate(s.g,snap);
    assert.equal(view.fighters[0].avalanche.captured,s.o.slot);assert.equal(view.fighters[1].carriedBy,s.f.slot);
    s.tick(api.BR,api.BZ);snap=api.encodeState(s.g);view=api.hydrate(s.g,snap);
    assert.ok(view.fighters.every(f=>!f.avalanche&&f.carriedBy==null));delete snap.av;
    assert.ok(api.hydrate(s.g,snap).fighters.every(f=>!f.avalanche&&f.carriedBy==null));
  });
  test(label + ': every other fighter retains its old ultimate path and finite state',()=>{
    const api=load(server);
    for(const c of api.ROSTER){
      const s=fresh(api,c.id);s.f.ult=true;s.tick(api.BR,api.BZ);
      if(c.id!=='titan'){assert.equal(s.g.ult.slot,s.f.slot,c.name);assert.equal(s.f.avalanche,null,c.name);}
      for(let i=0;i<470;i++){s.f.x=s.m.x+s.m.w*.4;s.tick(i%60<30?api.BR:api.BL);}
      assert.ok(s.g.fighters.every(f=>[f.x,f.y,f.vx,f.vy,f.dmg].every(Number.isFinite)),c.name);
    }
  });
}
test('Worker and browser emit identical authoritative carry state',()=>{
  const a=load(false),b=load(true),s=fresh(a),v=fresh(b);s.scoop();v.scoop();
  // Use the actual server encoder, not a duplicated implementation in the test.
  const result=b.srvEncodeState(v.g,42);
  assert.deepEqual(plain(a.encodeState(s.g).av),plain(result.av));
});

test('two online peers send real inputs, receive matching snapshots and throw through the Worker room',()=>{
  const api=load(true),room=new api.Room({},{}),logs=[[],[]];room.code='TEST';
  const clients=['host','guest'].map((id,i)=>({id,pres:{ib:0,ic:Array(10).fill(0)},ws:{send:raw=>logs[i].push(JSON.parse(raw))},win:1000,n:0}));
  clients.forEach(c=>room.clients.set(c.id,c));clients[0].pres.lb={c:'TEST'};
  room.onMsg(clients[0],JSON.stringify({cmd:'start',gid:42,cfg:{stage:0,stocks:3,time:2,slots:[
    {type:'remote',peer:'host',char:'titan'},{type:'remote',peer:'guest',char:'zephyr'}
  ]}}));
  const g=room.g,[f,o]=g.fighters,m=g.stage.solids[0];
  for(const x of g.fighters){x.y=m.y;x.ground=m;x.inv=0;x.halo=0;}
  f.x=m.x+m.w*.4;f.face=1;o.x=m.x+m.w*.85;f.ult=true;
  const input=(i,b,ult=false)=>{const c=clients[i],ic=c.pres.ic.slice();if(ult)ic[9]++;room.onMsg(c,JSON.stringify({d:{ib:b,ic}}));};
  const tick=()=>{api.advanceClock(17);room.tick();};tick();
  input(0,api.BR,true);tick();for(let i=0;i<21;i++)tick();
  o.x=f.x+30;o.y=f.y;o.ground=m;tick();assert.equal(o.carriedBy,f.slot);
  input(1,api.BL|api.BZ,true);tick();assert.equal(o.carriedBy,f.slot);
  const last=i=>logs[i].filter(x=>x.from==='srv'&&x.d.gs).at(-1).d.gs;
  assert.deepEqual(plain(last(0).av),plain(last(1).av));
  assert.equal(api.hydrate(g,last(1)).fighters[1].carriedBy,f.slot);
  input(0,api.BL);for(let i=0;i<20;i++)tick();input(0,api.BL,true);tick();tick();
  assert.equal(f.avalanche,null);assert.equal(o.carriedBy,null);assert.ok(o.dmg>0&&o.dmg<8);assert.ok(o.vx<0);
  assert.deepEqual(plain(last(0).av),[]);assert.deepEqual(plain(last(0).av),plain(last(1).av));room.stop(true);
});
