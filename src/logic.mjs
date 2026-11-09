import {SPEC,GROUPS} from './survey.mjs';
export const integerScore=x=>typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<=10;
export const eligibleG=a=>['1','2','3'].includes(String(a.B1))||['1','2','3','4'].includes(String(a.D2));
export function getGroups(a){return GROUPS.filter(g=>g.key!=='G'&&g.key!=='H'||(g.key==='G'?eligibleG(a):!eligibleG(a)));}
export function activeQuestions(key,a){
 return (SPEC[key]||[]).filter(q=>!q.show||q.show(a));
}
export function expectedFieldIds(a){
 const ids=[];for(const group of getGroups(a))for(const q of activeQuestions(group.key,a)){
  if(q.type==='matrix')ids.push(...q.rows.map((_,i)=>q.id+'_'+(i+1)));
  else if(q.type==='models')ids.push('D1_1','D1_2','D1_3');else ids.push(q.id);
 }return ids;
}
export function checkValue(q,v){
 if(q.type==='text'||q.type==='textarea')return typeof v==='string'&&v.length<=(q.type==='text'?160:1500);
 if(q.type==='scale')return integerScore(v)||v==='unknown';
 if(q.type==='multi')return Array.isArray(v)&&v.length>0&&(!q.max||v.length<=q.max)&&new Set(v).size===v.length&&v.every(x=>q.options.some(o=>o.value===x))&&!(q.exclusive||[]).some(e=>v.includes(e)&&v.length>1);
 if(q.type==='radio')return q.options.some(o=>o.value===v);
 if(q.type==='modelchoice')return ['1','2','3','4','5','6'].includes(v);
 return true;
}
export function validatePage(key,a){
 const issues=[];for(const q of activeQuestions(key,a)){
  if(q.type==='matrix'||q.type==='models'){
   const len=q.type==='models'?3:q.rows.length;
   for(let i=1;i<=len;i++){
    const id=(q.type==='models'?'D1':q.id)+'_'+i,v=a[id];
    const valid=q.type==='models'?integerScore(v)||v==='unknown':(Number.isInteger(v)&&v>=q.min&&v<=q.max)||v==='unknown';
    if(!valid)issues.push({id,message:`${q.id} ${i}번째 항목에 응답해 주십시오.`});
   }
  }else if(q.required!==false){if(a[q.id]===undefined||a[q.id]===null||!checkValue(q,a[q.id]))issues.push({id:q.id,message:`${q.id} 문항에 응답해 주십시오.`});}
  else if(a[q.id]!==undefined&&!checkValue(q,a[q.id]))issues.push({id:q.id,message:`${q.id} 입력값을 확인해 주십시오.`});
 }return issues;
}
export function validateAll(a){return getGroups(a).flatMap(g=>validatePage(g.key,a));}
export function sanitizeAnswers(a){const keys=new Set(expectedFieldIds(a));return Object.fromEntries(Object.entries(a).filter(([key])=>keys.has(key)));}
export function groupClassification(a){
 const b1=Number(a.B1),d2=Number(a.D2),b2=a.B2,b3=a.B3;
 if([1,2,3].includes(b1))return {group:1,subgroup:String(b1),discordant:d2===5};
 if(b1>=4&&b1<=9&&[1,2,3,4].includes(d2))return {group:2,subgroup:d2===4?'B':'A',discordant:false};
 if((integerScore(b3)&&b3>=7)||(b1===10&&[1,2,3,4].includes(d2)))return {group:3,subgroup:b1===10&&[1,2,3,4].includes(d2)?'B':'A',discordant:false};
 if(b1>=4&&b1<=9&&integerScore(b2)&&b2<=3&&integerScore(b3)&&b3<=3&&[1,2,3].every(i=>integerScore(a['D1_'+i])&&a['D1_'+i]<=3)&&d2===5)return {group:4,subgroup:'',discordant:false};
 return {group:5,subgroup:'',discordant:false};
}
export function demoAssignment(){return {f4_amt:500,f5_amt:100};}
