export const ease=(p:number)=>p*p*p*(p*(p*6-15)+10);
export const move=(t:number,start:number,end:number,a:number,b:number)=>{
 const p=Math.max(0,Math.min(1,(t-start)/(end-start)));
 return a+(b-a)*ease(p);
};
export const COMPACT_START=8.7;
export const COMPACT_END=9.45;
