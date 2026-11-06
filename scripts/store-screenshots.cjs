// Captures Play Store screenshots from the production build.
// The feature graphic is Robert's artwork, built by scripts/make-brand-assets.mjs.
// Run: npm run build, then npx vite preview --port 4173, then node scripts/store-screenshots.cjs
const {chromium}=require('playwright');const path=require('path');
const ROOT=process.cwd();const OUT=path.join(ROOT,'store')+'/';
(async()=>{const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true});
// Skip the first-launch language question: screenshots are in Kiswahili.
await ctx.addInitScript(()=>{if(localStorage.getItem('matofali.settings')===null)localStorage.setItem('matofali.settings',JSON.stringify({sound:true,vibration:true,language:'sw'}));});
const p=await ctx.newPage();
await p.goto('http://localhost:4173/?e2e&seed=11');await p.waitForSelector('#screen-home:not([hidden])');await p.waitForTimeout(300);
await p.screenshot({path:OUT+'screenshots/01-home.png'});
await p.click('#btn-play');await p.click('#btn-go');
const levels=[[1,'02-twiga'],[2,'03-kilimanjaro'],[3,'04-zanzibar'],[4,'05-serengeti']];
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
await b.close();})();
