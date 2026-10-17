import React from 'react';
import {move} from './motion';
export const TerminalBackdrop:React.FC<{time:number}>=({time:t})=>{
 const a=move(t,0.9,1.65,0,1);
 const rail=move(t,1.02,1.55,0,1);
 return <>
  <div style={{position:'absolute',left:323,top:43,width:620,height:620,border:'21px solid #b8c7ca',opacity:0.13*a,transform:`rotate(45deg) scale(${move(t,0.5,1.2,0.8,1)})`}} />
  <div style={{position:'absolute',top:25,left:35,opacity:a,lineHeight:0.9,borderLeft:'5px solid #111719',paddingLeft:9}}><div style={{fontFamily:'Terminal Condensed, sans-serif',fontSize:29,fontWeight:800,letterSpacing:-1}}>PRTS</div><div style={{fontSize:11,fontWeight:700,letterSpacing:1}}>DESKTOP TERMINAL</div></div>
  <div style={{position:'absolute',top:29,right:36,fontSize:12,opacity:a}}>PERSONAL WORKSPACE / <b>PRIESTESS</b></div>
  <div style={{position:'absolute',bottom:58,width:'100%',textAlign:'center',fontSize:9,opacity:a}}>PRTS DESKTOP TERMINAL SERVICE<div style={{marginTop:12}}>SYSTEM [OS]</div></div>
  <div style={{position:'absolute',left:73,bottom:26,width:510,height:1,background:'#1d292c',scale:`${rail} 1`,transformOrigin:'right'}}/>
  <div style={{position:'absolute',right:73,bottom:26,width:510,height:1,background:'#1d292c',scale:`${rail} 1`,transformOrigin:'left'}}/>
  {[73,1206].map(x=><div key={x} style={{position:'absolute',left:(x<640?583+(x-583)*rail:697+(x-697)*rail)-5,bottom:21,width:11,height:11,border:'1px solid #1d292c',opacity:move(t,1.02,1.18,0,1)}}/>)}
  {[596,612,640,668,684].map((x,i)=><div key={x} style={{position:'absolute',left:640+(x-640)*move(t,0.94,1.5,0,1)-(i===2?9:3),bottom:i===2?18:23,width:i===2?18:6,height:i===2?18:6,background:i===2?'transparent':'#1d292c',border:i===2?'1px solid #1d292c':undefined,rotate:'45deg',opacity:move(t,i===2?1.28:0.94,i===2?1.55:1.12,0,1)}}/>)}
  <div style={{position:'absolute',bottom:19,left:16,fontSize:10,opacity:a}}>▪▫▪</div><div style={{position:'absolute',bottom:19,right:23,fontSize:10,opacity:a}}>›››▏</div>
 </>;
};
