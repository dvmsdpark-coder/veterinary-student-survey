import {SPEC,MODEL,VERSION} from './survey.mjs';

export function parseCsv(text){
 const rows=[];let row=[],cell='',quoted=false;
 const input=text.replace(/^\uFEFF/,'');
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(c==='"'){
   if(quoted&&input[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;
  }else if(!quoted&&(c===','||c==='\n'||c==='\r')){
   row.push(cell);cell='';
   if(c!==','){rows.push(row);row=[];if(c==='\r'&&input[i+1]==='\n')i++;}
  }else cell+=c;
 }
 if(quoted)throw Error('CSV의 따옴표가 닫히지 않았습니다.');
 if(cell!==''||row.length){row.push(cell);rows.push(row);}
 const headers=rows.shift()||[];
 return rows.filter(r=>r.some(v=>v!=='')).map(r=>{
  if(r.length!==headers.length)throw Error('CSV 열 개수가 일치하지 않습니다.');
  return Object.fromEntries(headers.map((h,i)=>[h,r[i]]));
 });
}
function csvCell(value){
 let text=String(value??'');
 if(/^[\s]*[=+@\-\t\r]/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}
function csv(headers,rows){return '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');}
function koreanTime(value){
 if(!value)return '';
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return value;
 return new Date(date.getTime()+9*60*60*1000).toISOString().slice(0,19).replace('T',' ')+' KST';
}
const displayedId=id=>({F4:'I1',H2:'J1'})[id]??id.replaceAll('_','-');
function choices(q){
 if(q.type==='modelchoice')return [...MODEL.map(m=>({value:m.value,label:m.short})),
  {value:'4',label:'세 유형 외 농장동물 현장진료·건강관리 직무(수의사 2인 병원, 기업, 혼합진료 등)'},
  {value:'5',label:'농장동물 이외의 진로(반려동물 임상 등)'},{value:'6',label:'아직 판단하기 어려움'}];
 return q.options||[];
}
const questionFields=Object.values(SPEC).flatMap(questions=>questions.flatMap(q=>{
 if(q.type==='matrix')return q.rows.map((label,i)=>({id:q.id+'_'+(i+1),title:displayedId(q.id)+' '+label,q,type:'score'}));
 if(q.type==='models')return MODEL.map(m=>({id:'D1_'+m.value,title:'D1 '+m.short,q,type:'score'}));
 return [{id:q.id,title:displayedId(q.id)+' '+q.title,q,type:q.type}];
}));
const metadata=['id','survey_version','submitted_at','group_class','subgroup_class','discordant','recruit_source','d_order','f4_amt','f5_amt','g5_order'];
const groupNames={'1':'기존 희망','2':'조건부 선택','3':'탐색·미정','4':'비고려','5':'경계'};
function orderedModels(value,version){
 // v4.4.8의 고정 순서는 엑셀에서 날짜로 저장된 기존 파일도 복원할 수 있습니다.
 if(value==='2001-02-03'&&version===VERSION)return '1 > 2 > 3';
 return String(value||'').replace(/-/g,' > ');
}
function arrayValue(value){
 if(!value)return [];
 try{const parsed=JSON.parse(value);if(Array.isArray(parsed))return parsed.map(String);}catch{}
 return value.split('|').map(v=>v.trim());
}
function answerValue(field,value,readable){
 if(value===undefined||value==='')return '';
 if(value==='unknown')return readable?'모름':'unknown';
 const label=code=>choices(field.q).find(o=>o.value===code)?.label??code;
 if(field.type==='multi'){
  const values=arrayValue(value).sort((a,b)=>Number(a)-Number(b));
  return values.map(v=>readable?label(v):v).join(' | ');
 }
 if(readable&&['radio','modelchoice'].includes(field.type))return label(value);
 return value;
}
export function surveyCsv(text,readable=true){
 const data=parseCsv(text);
 const headers=readable?['응답번호','설문버전','제출일시(한국시간)','정책집단','세부집단','진로선택불일치','접속경로','병원유형제시순서','학기당장학금(만원)','월정착지원금(만원)','연봉문항제시순서',...questionFields.map(f=>f.title)]:[...metadata,...questionFields.map(f=>f.id)];
 const rows=data.map(r=>{
  const meta=readable?[r.id,r.survey_version,koreanTime(r.submitted_at),groupNames[r.group_class]??r.group_class,r.subgroup_class,/^true$/i.test(r.discordant)?'있음':'없음',r.recruit_source==='public_link'?'학생용 공통 링크':r.recruit_source,orderedModels(r.d_order,r.survey_version),r.f4_amt,r.f5_amt,r.g5_order==='farm_first'?'농장동물 → 반려동물':r.g5_order]:metadata.map(id=>id==='d_order'?orderedModels(r[id],r.survey_version):r[id]);
  return [...meta,...questionFields.map(f=>answerValue(f,r[f.id],readable))];
 });
 return csv(headers,rows);
}
export function codebookCsv(){
 const rows=questionFields.map(f=>{
  let codes=choices(f.q).map(o=>o.value+' = '+o.label).join(' | ');
  if(f.type==='score'||f.type==='scale')codes=`${f.q.min??0}~${f.q.max??10} = 점수 | unknown = 모름`;
  if(f.type==='text'||f.type==='textarea')codes='자유입력';
  return [f.id,f.title,f.type,codes,'빈칸 = 분기 미해당 또는 선택문항 무응답',f.type==='multi'?'복수 선택 코드를 |로 구분':''];
 });
 const metadataRows=[
  ['id','응답번호','text','서버 생성 응답 식별자','',''],
  ['survey_version','설문버전','text',VERSION,'',''],
  ['submitted_at','제출일시','datetime','분석용 파일은 UTC, 보기내용 파일은 한국시간(KST)','',''],
  ['group_class','정책집단','code',Object.entries(groupNames).map(([k,v])=>k+' = '+v).join(' | '),'',''],
  ['subgroup_class','세부집단','code','집단 1: 1=농장동물 전문, 2=혼합진료, 3=기업 현장 | 집단 2: A=병원유형, B=기타 농장동물 직무 | 집단 3: A=실습 관심, B=미정·농장동물 선택','집단 4·5는 빈칸',''],
  ['discordant','진로선택불일치','boolean','true = B1 농장동물 희망, D2 농장동물 외 진로 선택 | false = 그 외','',''],
  ['recruit_source','접속경로','text','public_link = 학생용 공통 링크','',''],
  ['d_order','병원유형제시순서','text','1 > 2 > 3 = 수의사 1인 → 3인 이상 → 네트워크형','',''],
  ['f4_amt','학기당장학금','number','단위 만원, 고정 500','',''],
  ['f5_amt','월정착지원금','number','단위 만원, 고정 100, I2-1 조건','',''],
  ['g5_order','연봉문항제시순서','text','farm_first = 농장동물 → 반려동물','','']
 ];
 return csv(['변수명','문항명','형식','코드해석','빈칸의미','비고'],[...metadataRows,...rows]);
}
function normalizedPhone(value){
 const digits=String(value||'').replace(/[^0-9]/g,'');
 return /^10\d{8}$/.test(digits)?'0'+digits:digits;
}
export function couponCsv(text){
 const data=parseCsv(text),counts=new Map();
 for(const row of data){const phone=normalizedPhone(row.phone);counts.set(phone,(counts.get(phone)||0)+1);}
 return csv(['접수순번','휴대전화번호','수집이용동의','동의일시(한국시간)','동의문버전','수집관리기관','이용목적','파기시점','동일번호응모건수','번호확인'],data.map((r,i)=>{
  const phone=normalizedPhone(r.phone),valid=/^010\d{8}$/.test(phone);
  return [i+1,valid?phone.replace(/^(\d{3})(\d{4})(\d{4})$/,'$1-$2-$3'):r.phone,'동의함',koreanTime(r.consented_at),r.consent_notice?.match(/^raffle-v\d+/)?.[0]??r.consent_notice,'대한수의사회','커피 쿠폰 추첨·당첨 안내·발송','쿠폰 발송 완료 후 즉시 파기',counts.get(phone),valid?'정상':'확인 필요'];
 }));
}
