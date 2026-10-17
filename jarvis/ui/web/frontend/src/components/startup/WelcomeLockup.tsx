import React from 'react';
import {move,COMPACT_START,COMPACT_END} from './motion';

export const WelcomeLockup:React.FC<{time:number}>=({time:t})=>{
 const light=move(t,6.9,7.25,0,1);
 const compact=move(t,COMPACT_START,COMPACT_END,1,0.64);
 const x=move(t,7.78,8.43,640,334)+move(t,COMPACT_START,COMPACT_END,0,-190);
 return <div data-testid="welcome-lockup" style={{position:'absolute',left:x,top:314+move(t,COMPACT_START,COMPACT_END,0,17),display:'flex',alignItems:'flex-start',gap:12,height:92,scale:compact,transformOrigin:'left center',opacity:move(t,6.25,6.6,0,1)}}>
  <div data-testid="slash-box" style={{width:92,height:92,boxSizing:'border-box',border:'3px solid #101719',position:'relative',flexShrink:0,background:'#101719'}}>
   <div style={{position:'absolute',inset:0,background:'#edf2f2',opacity:light}}/>
   <div style={{position:'absolute',inset:4,border:'1px solid #edf2f2',opacity:1-light}}/>
   {[0,1,2,3].map(i=><div key={i} style={{position:'absolute',left:22+i%2*30,top:14+Math.floor(i/2)*34,width:3,height:26,rotate:'30deg',scale:`1 ${move(t,6.4+i*0.07,6.6+i*0.07,0,1)}`,background:'#edf2f2'}}><div style={{position:'absolute',inset:0,background:'#101719',opacity:light}}/></div>)}
  </div>
  <svg data-testid="welcome-text" width="290" height="92" viewBox="0 0 290 92" style={{overflow:'visible',fontFamily:'Terminal Condensed, sans-serif',fill:'#111719'}}>
   <text x="0" y="24" fontSize="33.5" fontWeight="800" style={{opacity:move(t,7.12,7.42,0,1),translate:`${move(t,7.12,7.42,14,0)}px 0`}}>PRIESTESS</text>
   <text x="0" y="54" fontSize="37" fontWeight="400" style={{opacity:move(t,7.22,7.52,0,1),translate:`${move(t,7.22,7.52,14,0)}px 0`}}>WORKSPACE</text>
   <text x="0" y="92" fontSize="48" fontWeight="800" style={{opacity:move(t,7.32,7.62,0,1),translate:`${move(t,7.32,7.62,14,0)}px 0`}}>WELCOME</text>
  </svg>
 </div>;
};
