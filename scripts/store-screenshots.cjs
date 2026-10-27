// Captures Play Store screenshots and the feature graphic from the production build.
// Run: npm run build, then npx vite preview --port 4173, then node scripts/store-screenshots.cjs
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const ROOT=process.cwd();const OUT=path.join(ROOT,'store')+'/';
(async()=>{const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true});
const p=await ctx.newPage();
await p.goto('http://localhost:4173/?e2e&seed=11');await p.waitForSelector('#screen-home:not([hidden])');await p.waitForTimeout(300);
await p.screenshot({path:OUT+'screenshots/01-home.png'});
await p.click('#btn-play');await p.click('#btn-go');
const levels=[[1,'02-bendera'],[2,'03-kilimanjaro'],[3,'04-zanzibar'],[4,'05-serengeti']];
for (const [lvl,name] of levels){
  await p.evaluate((lvl)=>{const g=window.__matofali.game;g.level=lvl;g.loadLevel();window.__matofali.updateHud();g.launch();
    // knock out a few bricks and add a power-up so the shot looks mid-game
    const n=Math.floor(g.bricks.length*0.18);for(let i=0;i<n;i++){g.bricks.splice((i*7)%g.bricks.length,1)}
    g.bricks.slice(0,3).forEach(b=>{if(b.maxHp>1)b.hp=b.maxHp-1});
    g.score=lvl*740;g.drops=[{x:150,y:380,kind:'multi'}];window.__matofali.updateHud();},lvl);
  await p.waitForTimeout(700);
  await p.evaluate(()=>window.__matofali.pause()&&window.__matofali.showOverlay(null));
  await p.screenshot({path:OUT+`screenshots/${name}.png`});
  await p.evaluate(()=>{window.__matofali.game.resume()});
}
await p.evaluate(()=>{const g=window.__matofali.game;g.score=4280;g.lives=1;g.balls=[{x:240,y:700,r:7,vx:0,vy:5,stuck:false}]});
await p.waitForSelector('#overlay-over:not([hidden])');await p.waitForTimeout(200);
await p.screenshot({path:OUT+'screenshots/06-game-over.png'});
// Feature graphic
await p.click('#btn-over-home');
const shot=fs.readFileSync(OUT+'screenshots/03-kilimanjaro.png').toString('base64');
const fonts=fs.readdirSync(path.join(ROOT,'dist/assets')).filter(f=>f.endsWith('.woff2'));
const bungee=fonts.find(f=>f.startsWith('bungee')),outfit=fonts.find(f=>f.startsWith('outfit-latin-600'));
const fg=await b.newPage({viewport:{width:1024,height:500}});
await fg.setContent(`<style>@font-face{font-family:B;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT,'dist/assets')+'/'+bungee).toString('base64')})}@font-face{font-family:O;font-weight:600;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT,'dist/assets')+'/'+outfit).toString('base64')})}
body{margin:0;width:1024px;height:500px;overflow:hidden;background:linear-gradient(160deg,#0b1324,#172440);font-family:O;color:#eef3f8;position:relative}
.l{position:absolute;left:64px;top:120px}.t{font-family:B;font-size:84px;line-height:1}.t span{color:#FCD116}
.bar{margin:22px 0;height:12px;width:330px;border-radius:6px;background:linear-gradient(90deg,#1EB53A 0 40%,#FCD116 40% 44%,#000 44% 56%,#FCD116 56% 60%,#00A3DD 60%)}
.s{font-size:30px;font-weight:600}.e{font-size:22px;opacity:.75;margin-top:6px}
img{position:absolute;right:70px;top:40px;width:330px;border-radius:22px;transform:rotate(4deg);box-shadow:0 20px 50px rgba(0,0,0,.5)}</style>
<div class=l><div class=t>MATO<span>FALI</span></div><div class=bar></div><div class=s>Vunja matofali!</div><div class=e>A Tanzanian brick game</div></div><img src="data:image/png;base64,${shot}">`);
await fg.waitForTimeout(400);await fg.screenshot({path:OUT+'feature-graphic-1024x500.png'});
await b.close();})();
