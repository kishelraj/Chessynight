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
 for(const example of examples){
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
   await page.setContent(`<body style="margin:0;background:#111;color:#eee;font-family:Arial,sans-serif"><div style="margin:8px;width:400px;height:400px;position:relative">${squares}${glow}${html}</div><div style="padding:10px 8px;font-size:16px;font-weight:700">${example.theme}<span style="float:right;color:#d5ff5f;font-size:14px">${label}</span></div></body>`);
   await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
   const count=await page.locator('img').count();const expected=chess.board().flat().filter(Boolean).length-(progress===1&&solution.captured?1:0);if(count!==expected)throw Error('Capture frame has the wrong piece count');
   const path='../puzzle-gif-frames/'+frames.length+'.png';await page.screenshot({path});frames.push({path,duration:progress===0?1100:progress===1?1300:20,pattern:example.theme,solved:progress===1,pieceCount:count,capture:Boolean(solution.captured)});
  };
  await render(0,black?'Black to move':'White to move',false);
  for(let step=1;step<=20;step++)await render(step/20,step===20?solution.san:'Find the mate',step===20);
 }
 await writeFile('../puzzle-gif-frames/frames.json',JSON.stringify(frames));
 console.log('Rendered '+frames.length+' frames with five verified mating patterns and capture removal.');
}finally{await browser.close()}
