import {SPEC,MODEL,VERSION} from './survey.mjs';
import {getGroups,activeQuestions,validatePage,validateAll,sanitizeAnswers,demoAssignment} from './logic.mjs';
import {api} from './api.mjs';
const root=document.querySelector('#app'),config=window.SURVEY_CONFIG||{};
const previewOnly=config.demoOnly===true||new URLSearchParams(location.search).has('demo');
let demo=previewOnly;
let page='landing',code='',assignment=null,answers={},step=0,busy=false,error='';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyAttr=(id)=>esc(id);
function render(){
 if(page==='landing')return landing();
 if(page==='consent')return consent();
 if(page==='survey')return survey();
 if(page==='finished')return finished();
 if(page==='declined')return declined();
}
const alertErr=()=>error?`<div class="error" role="alert">${esc(error)}</div>`:'';
function landing(){
 const prod=!previewOnly&&!!config.approvedForRecruitment&&!!config.apiUrl;
 root.innerHTML=`${demo?'<div class="test-watermark">체험 모드 — 응답은 서버에 저장되지 않습니다</div>':''}<section class="panel hero"><span class="eyebrow">대한민국 10개 수의과대학 본과 재학생</span><h1>전국 수의대생의 농장동물 진로 및 취업의향 조사</h1><p>반려동물 임상 등 다른 진로를 희망하는 학생도 참여할 수 있습니다. 설문은 첫 진로희망, 현장경험, 근무형태 및 정책지원조건을 파악하기 위한 것입니다.</p><p class="muted">응답한 내용은 통계 및 학술 연구용으로 활용될 수 있으며, 가상 일자리·장학금·정착지원금은 실제 시행을 보장하지 않습니다.</p></section>
 <section class="panel"><h2>설문 시작</h2>${prod?'<p>배부받은 일회용 초대코드를 입력해 주십시오.</p>':previewOnly?'<p>체험 모드에서 설문과 자동 분기를 확인할 수 있습니다.</p>':'<div class="warning">현재 운영자의 연구윤리·개인정보 안내 및 서버 설정이 완료되지 않아 실제 응답 수집이 비활성화되어 있습니다. 체험 모드에서만 화면을 확인할 수 있습니다.</div>'}
 ${prod?'<input class="field" id="code" autocomplete="off" spellcheck="false" maxlength="48" placeholder="일회용 초대코드">':''}${alertErr()}
 <div class="buttons">${prod?'<button class="btn" id="start">코드 확인 후 시작</button>':''}<button class="btn outline" id="demo">체험 모드로 확인</button></div><p class="help">학생용 초대코드는 개인정보와 설문응답을 직접 연결하지 않는 방식으로 관리합니다.</p></section>`;
 document.querySelector('#demo').onclick=()=>beginConsent(demoAssignment());
 if(prod){document.querySelector('#start').onclick=async()=>{
  const v=document.querySelector('#code').value.trim();if(!v){error='일회용 초대코드를 입력해 주십시오.';render();return;}
  try{setBusy(true);const r=await api('start',{code:v});beginConsent(r.assignment,v)}catch(e){error=e.message;render()}finally{busy=false;}
 }}
}
function beginConsent(nextAssignment,inviteCode=''){
 demo=!inviteCode;
 code=inviteCode;
 assignment=nextAssignment;
 answers={};
 error='';
 page='consent';
 render();
}
function consent(){
 root.innerHTML=`${demo?'<div class="test-watermark">체험 모드 · 실제 응답 저장 안 함</div>':''}<section class="panel"><span class="eyebrow">연구 참여 안내</span><h1>조사 목적과 참여 동의</h1><p>본 조사는 전국 수의과대학 본과 재학생의 첫 실무진로, 농장동물 진료 관련 경험, 일자리 선호 및 근무조건을 파악하여 지역 농장동물 진료인력 육성과 진료체계 개선 정책의 기초자료로 활용하고자 합니다.</p><p>반려동물 임상 등 다른 진로를 희망하거나 농장동물 진료에 관심이 없는 학생도 응답할 수 있습니다. 정답은 없으며, 가상 일자리나 지원사업은 실제 시행 또는 채용을 약속하는 것이 아닙니다. 참여는 자발적입니다.</p><p class="help">농장동물 진료·건강관리: 소·돼지·가금 등의 진단·치료, 예방·번식관리, 농장 단위 건강관리와 축산기업·계열화사업자 소속 현장수의사 업무를 포함합니다.</p>
 ${demo?'<div class="warning">아래 안내는 기능 확인용 예시입니다. 실제 연구동의서를 대체하지 않습니다.</div>':`<div class="notice"><strong>조사책임기관</strong> ${esc(config.owner)}<br><strong>문의</strong> ${esc(config.contact)}<br><strong>개인정보·철회·보존·파기 안내</strong><br>${esc(config.privacyNotice)}<br><strong>연구윤리</strong><br>${esc(config.ethicsNotice)}</div>`}
 <div class="question"><span class="question-title">위 안내를 읽고 자발적으로 참여하는 데 동의하십니까?</span><div class="options single-column"><label class="option"><input type="radio" name="consent" value="yes">동의함</label><label class="option"><input type="radio" name="consent" value="no">동의하지 않음</label></div></div>${alertErr()}
 <div class="buttons"><button id="back" class="btn outline">이전</button><button id="consentNext" class="btn">계속</button></div></section>`;
 document.querySelector('#back').onclick=()=>{demo=previewOnly;error='';page='landing';render()};
 document.querySelector('#consentNext').onclick=()=>{let v=document.querySelector('input[name=consent]:checked')?.value;if(!v){error='동의 여부를 선택해 주십시오.';render();return;}if(v==='no'){page='declined';render();return;}error='';page='survey';step=0;render();};
}
function getRenderable(){const groups=getGroups(answers);step=Math.max(0,Math.min(step,groups.length-1));return {groups,current:groups[step]};}
function survey(){
 const {groups,current}=getRenderable(),percent=Math.round((step+1)/groups.length*100);
 root.innerHTML=`${demo?'<div class="test-watermark">체험 모드 — 실제 응답 저장 안 함</div>':''}<section class="panel"><span class="eyebrow">전국 수의대생 조사</span><div class="progress"><span style="width:${percent}%"></span></div><div class="progress-meta"><span>${step+1} / ${groups.length} 단계</span><span>${percent}%</span></div><h1>${esc(current.title)}</h1>${current.note?`<div class="notice">${esc(current.note)}</div>`:''}
 <div id="questions">${activeQuestions(current.key,answers).map(renderQuestion).join('')}</div>${alertErr()}
 <div class="buttons"><button id="back" class="btn outline">이전</button><button id="next" class="btn" ${busy?'disabled':''}>${step===groups.length-1?'설문 제출':'다음 단계'}</button></div><p class="help">개인별 조건은 최초 접속 시 고정됩니다. 이전 단계로 돌아가 응답을 수정할 수 있습니다.</p></section>`;
 document.querySelector('#back').onclick=()=>{if(step===0){page='consent'}else step--;error='';render();scrollTo({top:0,behavior:'instant'})};
 document.querySelector('#next').onclick=async()=>{const issues=validatePage(current.key,answers);if(issues.length){const {id,message}=issues[0];error=message;render();document.querySelector(`[data-question="${CSS.escape(id)}"]`)?.scrollIntoView({behavior:'smooth'});return;}error='';if(step<groups.length-1){step++;render();scrollTo({top:0,behavior:'instant'});return;}
 const all=validateAll(answers);if(all.length){error=`아직 응답하지 않은 문항이 있습니다: ${all.map(x=>x.id).slice(0,5).join(', ')}`;render();return;}
 if(demo){page='finished';render();return;}
 try{setBusy(true);await api('submit',{code,consent:true,version:VERSION,answers:sanitizeAnswers(answers)});page='finished';code='';answers={};render();}catch(e){busy=false;error=e.message;render();}
 };
 root.querySelector('#questions').addEventListener('change',onChange);
 root.querySelector('#questions').addEventListener('input',e=>{if(e.target.matches('textarea,input[type=text]'))answers[e.target.dataset.id]=e.target.value;});
}
function renderQuestion(q){const visibleID=q.id.replaceAll('_','-');let content='';
 if(q.type==='radio'||q.type==='modelchoice'){
  let opts=q.type==='modelchoice'?[...MODEL.map(m=>({value:m.value,label:m.short})),{value:'4',label:'세 유형 외 농장동물 현장진료·건강관리 직무(수의사 2인 병원, 기업, 혼합진료 등)'},{value:'5',label:'농장동물 이외의 진로(반려동물 임상 등)'},{value:'6',label:'아직 판단하기 어려움'}]:q.options;
  content=`<div class="options">${opts.map(o=>`<label class="option"><input type="radio" name="${q.id}" data-id="${q.id}" value="${esc(o.value)}" ${answers[q.id]===o.value?'checked':''}><span>${esc(o.label)}</span></label>`).join('')}</div>`;
 }else if(q.type==='multi'){
  content=`<div class="options">${q.options.map(o=>`<label class="option"><input type="checkbox" data-id="${q.id}" value="${esc(o.value)}" ${Array.isArray(answers[q.id])&&answers[q.id].includes(o.value)?'checked':''}><span>${esc(o.label)}</span></label>`).join('')}</div>`;
 }else if(q.type==='scale')content=renderScale(q.id,0,10,answers[q.id]);
 else if(q.type==='matrix')content=`<div>${q.rows.map((r,i)=>`<div class="subquestion" data-question="${q.id}_${i+1}"><h3>${esc(r)}</h3>${renderScale(q.id+'_'+(i+1),q.min,q.max,answers[q.id+'_'+(i+1)])}</div>`).join('')}</div>`;
 else if(q.type==='models')content=`<div class="model-card">${MODEL.map(m=>`<div class="subquestion" data-question="D1_${m.value}"><h3>${esc(m.short)}</h3><p>${esc(m.label)}</p>${renderScale('D1_'+m.value,0,10,answers['D1_'+m.value])}</div>`).join('')}</div>`;
 else if(q.type==='text')content=`<input class="field" data-id="${q.id}" type="text" maxlength="160" value="${esc(answers[q.id]||'')}">`;
 else if(q.type==='textarea')content=`<textarea class="field" data-id="${q.id}" maxlength="1500" placeholder="자유롭게 작성해 주십시오.">${esc(answers[q.id]||'')}</textarea>`;
 let help=q.description?`<p class="help">${esc(q.description)}</p>`:'';
 if(q.id==='F4'){
  const semesterAmount=Number(assignment.f4_amt);
  help+=`<div class="notice">가정: 본과 1학년부터 4학년까지 <strong>학기당 ${semesterAmount.toLocaleString('ko-KR')}만 원</strong>의 장학금을 받습니다. 장학금을 받은 학기당 6개월씩, 졸업 후 농장동물 진료인력이 부족한 지정지역에서 진료·건강관리 업무를 수행합니다. 8학기 모두 받으면 <strong>총 ${(semesterAmount*8).toLocaleString('ko-KR')}만 원을 받고 4년간 의무복무</strong>합니다. 병역 등 의무이행 기간은 의무복무기간에서 제외합니다. 의무복무를 이행하지 않으면 지급된 장학금을 반환합니다. 현재 학년과 관계없이 8학기 모두 받는 조건으로 응답해 주십시오.</div>`;
 }
 const intro=q.id==='I2_1'?'<div class="notice"><strong>I2 정착지원금 공통 조건</strong><br>다음은 인구감소지역의 농장동물 진료·건강관리 일자리입니다. 두 문항은 같은 일자리이며 정착지원금 조건만 다릅니다.<br>인구가 줄어드는 군(읍·면) 지역에서 근무하는 일자리입니다. 급여와 그 밖의 근무조건은 다른 지역의 같은 직무와 동일합니다.</div>':'';
 if(q.id==='G4_1')help+=`<p class="help">공통가정: 실제 호출·출동횟수와 다른 호출대기이며, 별도의 적정 당직수당과 동료 수의사의 지원이 제공됩니다.</p>`;
 if(q.id==='G5_1'||q.id==='G5_2')help+=`<p class="help">동물병원 신규 봉직, 주 40시간 기본근무, 야간·휴일·초과수당 별도 지급을 가정합니다. 실제 시장임금이 아닙니다.</p>`;
 const selectionLimit=q.type==='multi'?` (최대 ${q.max??(q.options.length-(q.exclusive?.length??0))}개)`:'';
 const questionNumber=({F4:'I1',H2:'J1'})[q.id]??visibleID;
 return `<div class="question" id="question-${visibleID}" data-question="${q.id}">${intro}<div class="question-title"><span class="qid">${esc(questionNumber)}</span>${esc(q.title)}${selectionLimit}</div>${help}${content}</div>`;
}
function renderScale(id,min,max,value){let html=`<div class="choice-scale" role="radiogroup" aria-label="${esc(id)} 응답점수">`;for(let i=min;i<=max;i++)html+=`<label><input name="${esc(id)}" type="radio" data-id="${esc(id)}" value="${i}" ${value===i?'checked':''}><span>${i}</span></label>`;html+=`<label><input name="${esc(id)}" type="radio" data-id="${esc(id)}" value="unknown" ${value==='unknown'?'checked':''}><span class="small">모름</span></label></div><div class="scale-ends"><span>${min}점 ${min===0?'전혀 없음':'낮음'}</span><span>${max}점 ${max===10?'매우 높음':'높음'}</span></div>`;return html;}
function onChange(e){const el=e.target,id=el.dataset.id;if(!id)return;
 if(el.type==='checkbox'){
  const q=Object.values(SPEC).flat().find(x=>x.id===id),cur=new Set(answers[id]||[]);
  if(el.checked){if(q.exclusive?.includes(el.value))cur.clear();else for(const x of q.exclusive||[])cur.delete(x);cur.add(el.value);if(q.max&&cur.size>q.max){cur.delete(el.value);el.checked=false;error=`${id}: 최대 ${q.max}개까지만 선택할 수 있습니다.`;alert(error);error='';}}
  else cur.delete(el.value);answers[id]=[...cur];
  document.querySelectorAll(`input[type=checkbox][data-id="${id}"]`).forEach(x=>x.checked=cur.has(x.value));
 }else{answers[id]=el.closest('.choice-scale')&&el.value!=='unknown'?Number(el.value):el.value;}
 // B1의 '기타' 세부기입란은 해당 선택지를 고른 즉시 표시하거나 숨깁니다.
 if(id==='B1'){const y=window.scrollY;render();window.scrollTo(0,y);}
}
function finished(){root.innerHTML=`<section class="panel hero"><h1>${demo?'설문 화면 체험 완료':'설문 제출 완료'}</h1><p>${demo?'체험 과정에서 입력한 응답은 서버에 저장되지 않았습니다.':'응답이 정상적으로 접수되었습니다. 참여해 주셔서 감사합니다.'}</p><div class="buttons"><a class="btn outline" href="">처음으로</a></div></section>`;}
function declined(){root.innerHTML=`<section class="panel"><h1>참여하지 않음</h1><p>동의하지 않으셔도 불이익은 없습니다. 설문은 종료되었습니다.</p><a href="" class="btn outline">처음으로</a></section>`;code='';answers={};}
function setBusy(v){busy=v;document.querySelectorAll('button').forEach(x=>x.disabled=v);}
render();
