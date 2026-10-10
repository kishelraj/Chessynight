import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {Chess} from 'chess.js';
import {puzzles} from '../worker/puzzles.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const source=await readFile('worker/page.html','utf8');
const pieces=JSON.parse(source.match(/const pieces=(\{.*?\});/)[1]);
const examples=[puzzles[0],puzzles[2],puzzles[5],{...puzzles[1],theme:'Capture and mate'},{fen:'4r1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1',theme:'Black to move · Back rank'}];
await mkdir('../puzzle-gif-frames',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const frames=[];
try{
 const page=await browser.newPage({viewport:{width:416,height:470},deviceScaleFactor:1});
 for(const [exampleIndex,example] of examples.entries()){
  const chess=new Chess(example.fen);let solution;
  for(const move of chess.moves({verbose:true})){chess.move(move);const mate=chess.isCheckmate();chess.undo();if(mate){solution=move;break}}
  if(!solution)throw Error('No mating solution: '+example.theme);
  const black=chess.turn()==='b';
  const xy=s=>{const file=s.charCodeAt(0)-97,rank=8-Number(s[1]);return black?[7-file,7-rank]:[file,rank]};
  const render=async(progress,label,highlight)=>{
   const squares=Array.from({length:64},(_,i)=>{const x=i%8,y=Math.floor(i/8);return `<div style="position:absolute;left:${x*50}px;top:${y*50}px;width:50px;height:50px;background:${(x+y)%2?'#868681':'#e4e4dc'}"></div>`}).join('');
   const position=progress===1?new Chess(chess.fen()):chess;if(progress===1)position.move(solution);
   let html='';for(const row of position.board())for(const piece of row){if(!piece)continue;let [x,y]=xy(piece.square);if(progress<1&&piece.square===solution.from){const end=xy(solution.to);const eased=progress*progress*(3-2*progress);x+=(end[0]-x)*eased;y+=(end[1]-y)*eased}html+=`<img src="${pieces[piece.color+piece.type]}" style="position:absolute;width:46px;height:46px;left:${x*50+2}px;top:${y*50+2}px">`}
   const end=xy(solution.to);const glow=highlight?`<div style="position:absolute;left:${end[0]*50}px;top:${end[1]*50}px;width:50px;height:50px;box-shadow:inset 0 0 0 3px #d5ff5f"></div>`:'';
   const score=(exampleIndex+(progress===1?1:0))*100;
   await page.setContent(`<body style="margin:0;background:#111;color:#eee;font-family:Arial,sans-serif"><div style="margin:8px;width:400px;height:400px;position:relative">${squares}${glow}${html}</div><div style="padding:2px 8px;font-size:14px;font-weight:700;display:flex;justify-content:space-between"><span>${example.theme}</span><span style="color:#d5ff5f;font-size:13px">${label}</span></div><div style="padding:8px;font-size:13px;display:flex;justify-content:space-between"><span style="color:${progress===1?'#d5ff5f':'#aaa'}">${progress===1?'Solved! +100 points':'Find the finish.'}</span><span style="color:#ddd">Demo score <b style="color:#d5ff5f">${score}</b></span></div></body>`);
   await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
   const count=await page.locator('img').count();const expected=chess.board().flat().filter(Boolean).length-(progress===1&&solution.captured?1:0);if(count!==expected)throw Error('Capture frame has the wrong piece count');
   const path='../puzzle-gif-frames/'+frames.length+'.png';await page.screenshot({path});frames.push({path,duration:progress===0?1100:progress===1?1300:20,pattern:example.theme,solved:progress===1,pieceCount:count,capture:Boolean(solution.captured),score});
  };
  await render(0,black?'Black to move':'White to move',false);
  for(let step=1;step<=20;step++)await render(step/20,step===20?solution.san:'Find the mate',step===20);
 }
 const finalScore=examples.length*100;
 await page.setContent(`<body style="margin:0;background:#111;color:#eee;font-family:Arial,sans-serif"><main style="padding:30px 24px"><div style="font-size:11px;letter-spacing:2px;color:#d5ff5f;font-weight:700">SAMPLE RANKING</div><h1 style="font-size:34px;line-height:1.08;margin:17px 0 10px">Make your mark<br>on the board.</h1><p style="font-size:14px;color:#aaa;margin:0 0 24px">Five solves. <b style="color:#d5ff5f">${finalScore} points.</b></p><div style="display:flex;justify-content:space-between;font-size:11px;color:#aaa;padding:0 14px 9px"><span>PLAYER</span><span>POINTS</span></div>${[['1','You (demo)',finalScore],['2','Knight Owl',400],['3','Fork Finder',300]].map(([rank,name,score],i)=>`<div style="display:flex;align-items:center;gap:14px;padding:19px 14px;margin-bottom:8px;border:1px solid ${i===0?'#d5ff5f':'#444'};background:${i===0?'#20251a':'#1b1b1b'}"><span style="color:${i===0?'#d5ff5f':'#aaa'};font-weight:700">${rank}</span><b style="font-size:16px;flex:1">${name}</b><b style="font-size:20px;color:${i===0?'#d5ff5f':'#eee'}">${score}</b></div>`).join('')}<p style="font-size:11px;color:#999;margin:18px 0 0">Demo players and scores · Your turn next.</p></main></body>`);
 const rankingPath='../puzzle-gif-frames/'+frames.length+'.png';await page.screenshot({path:rankingPath});frames.push({path:rankingPath,duration:3200,ranking:true,score:finalScore});
 if(frames.filter(f=>f.solved).some((f,i)=>f.score!==(i+1)*100))throw Error('Incorrect demo scoring');
 await writeFile('../puzzle-gif-frames/frames.json',JSON.stringify(frames));
 console.log('Rendered '+frames.length+' frames with five verified solves, +100 points each, capture removal and a sample ranking.');
}finally{await browser.close()}
