import React from 'react';
import {move} from './motion';
export const OpeningGlyph:React.FC<{time:number}>=({time:t})=>{
 const outer=move(t,0.44,0.61,300,60)+move(t,0.61,0.93,0,-58);
 const inner=move(t,0.44,0.59,105,30)+move(t,0.61,0.93,0,-28);
 const ink=Math.round(move(t,0.47,0.54,246,17));
 const color=`rgb(${ink},${ink},${ink})`;
 const ringOpacity=move(t,0.43,0.48,0,1)*move(t,0.89,0.98,1,0);
 const centerOpacity=(1-move(t,0.56,0.6,0,1)+move(t,0.61,0.65,0,1))*move(t,0.94,1.02,1,0);
 const lineWidth=move(t,0.98,1.3,2,170);
 return <div data-testid="opening-glyph" style={{position:'absolute',left:640,top:360}}>
  <div data-testid="opening-outline" style={{position:'absolute',boxSizing:'border-box',width:outer,height:outer,left:-outer/2,top:-outer/2,border:`1px solid ${color}`,rotate:'45deg',opacity:ringOpacity}}/>
  <div data-testid="opening-center" style={{position:'absolute',width:inner,height:inner,left:-inner/2,top:-inner/2,background:color,rotate:'45deg',opacity:move(t,0.43,0.48,0,1)*centerOpacity}}/>
  <div style={{position:'absolute',width:lineWidth,height:1,left:-lineWidth/2,background:'#111719',opacity:move(t,0.98,1.04,0,1)*move(t,1.28,1.36,1,0)}}/>
 </div>;
};
