import React from 'react';

import {move,COMPACT_START,COMPACT_END} from './motion';
import {WelcomeLockup} from './WelcomeLockup';
const typed=(text:string,t:number,start:number,duration:number)=>text.slice(0,Math.floor(Math.max(0, Math.min(1, (t-start)/duration))*text.length));
export const StartupRow:React.FC<{time:number}>=({time:t})=>{
 const compact=move(t,COMPACT_START,COMPACT_END,1,0.64);
 const left=move(t,2.25,3.15,555,156)+move(t,COMPACT_START,COMPACT_END,0,-126);
 const show=move(t,1.28,1.36,0,1)*move(t,11.0,11.45,1,0);
 const split=move(t,1.36,1.82,0,46);
 const labelOpacity=move(t,3.1,3.35,0,1)*move(t,5.9,6.15,1,0);
 const load=move(t,9.35,9.8,0,1);
 const percent=Math.round(move(t,9.8,11.0,0,100));
 return <div style={{opacity:show}}>
  <div data-testid="main-wordmark" style={{position:'absolute',left,top:314+move(t,COMPACT_START,COMPACT_END,0,17),height:92,width:170,transformOrigin:'left center',transform:`scale(${compact})`}}>
   <div style={{position:'absolute',top:46-split,width:170,height:1,background:'#111719'}}/>
   <div style={{height:92,display:'flex',justifyContent:'center',alignItems:'center',fontFamily:'Terminal Condensed, sans-serif',fontSize:86,fontWeight:800,letterSpacing:-4,lineHeight:1,clipPath:`inset(${46-split}px 0)`}}>PRTS</div>
   <div style={{position:'absolute',top:46+split,width:170,height:1,background:'#111719'}}/>
  </div>
  <div style={{position:'absolute',left:490,top:315,opacity:labelOpacity,fontSize:10,lineHeight:'42px'}}><div>WORKSPACE: <b>{typed('LOCAL',t,3.8,0.65)}</b></div><div>ASSISTANT: <b>{typed('PRIESTESS',t,4.7,0.8)}</b></div></div>
  <div style={{position:'absolute',left:995,top:move(t,3,3.6,360,310),width:1,height:move(t,3,3.6,0,100),background:'#111719',opacity:move(t,3,3.2,0,1)*move(t,8.2,8.7,1,0)}}/>
  <div style={{position:'absolute',left:move(t,COMPACT_START,COMPACT_END,960,1020),top:316+move(t,COMPACT_START,COMPACT_END,0,20),width:move(t,8.2,8.7,0,155),height:86*compact,overflow:'hidden',opacity:move(t,8.2,8.6,0,1)}}><div style={{width:220,height:'100%',background:'repeating-linear-gradient(102deg,transparent 0px,transparent 8px,#172124 9px,#172124 10px)',backgroundPosition:`${-t*18}px 0`,maskImage:'linear-gradient(90deg,transparent,#000)'}}/></div>
  <WelcomeLockup time={t}/>
  <div data-testid="loading-block" style={{position:'absolute',left:430,top:329,opacity:load,width:420,height:62,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:12}}>
   <div data-testid="loading-label" style={{fontSize:23,fontWeight:600,lineHeight:1.1,textAlign:'center',width:'100%'}}>Preparing your workspace...</div>
   <div data-testid="loading-progress" style={{position:'relative',width:286,display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:10,lineHeight:1}}><span>[</span><div style={{height:4,width:258,background:'#17212418'}}><div style={{height:'100%',width:`${percent}%`,background:'#172124'}}/></div><span>]</span><span style={{position:'absolute',left:'calc(100% + 12px)',fontVariantNumeric:'tabular-nums'}}>{percent}%</span></div>
  </div>
 </div>;
};
