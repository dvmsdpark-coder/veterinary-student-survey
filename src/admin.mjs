import {SCHOOLS,VERSION} from './survey.mjs';
import {api} from './api.mjs';
import {surveyCsv,couponCsv,codebookCsv} from './exports.mjs?v=448-csv3';
const root=document.querySelector('#admin'),cfg=window.SURVEY_CONFIG||{};
let jwt='',error='',status=null,stats=null;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function dl(text,filename){const blob=new Blob([text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function printErr(){return error?`<div class="error" role="alert">${esc(error)}</div>`:''}
function login(){
 root.innerHTML=`<section class="panel"><h1>조사 관리자 로그인</h1><p class="muted">Supabase Auth에서 생성한 계정이면서 survey_admins 권한이 부여된 관리자만 접속할 수 있습니다.</p>${printErr()}
 <label>관리자 이메일<input id="email" class="field" autocomplete="username" type="email" required placeholder="admin@example.org"></label>
 <label>비밀번호<input id="password" class="field" type="password" autocomplete="current-password" required></label>
 <button class="btn" id="login">로그인</button><div class="warning">관리자 화면은 비공개 응답자료를 포함할 수 있습니다. 공용 PC에서 사용하지 마십시오.</div></section>`;
 document.querySelector('#login').onclick=async()=>{
  try{
   if(!cfg.supabaseUrl||!cfg.supabasePublishableKey||!cfg.apiUrl)throw Error('config.js의 Supabase 설정을 먼저 입력해야 합니다.');
   const res=await fetch(cfg.supabaseUrl+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'content-type':'application/json','apikey':cfg.supabasePublishableKey},body:JSON.stringify({email:document.querySelector('#email').value.trim(),password:document.querySelector('#password').value})});
   const data=await res.json();if(!res.ok||!data.access_token)throw Error(data.error_description||data.msg||'로그인할 수 없습니다.');
   jwt=data.access_token;error='';await load();
  }catch(e){error=e.message;login()}
 };
}
async function load(){try{status=await api('admin_status',{},jwt);stats=await api('admin_stats',{},jwt);dashboard()}catch(e){error=e.message;jwt='';login()}}
function dashboard(){const c=status?.control||{};
 root.innerHTML=`<section class="panel"><div class="row"><div><span class="eyebrow">관리자 · ${esc(VERSION)}</span><h1>조사 운영 현황</h1></div><button class="btn outline" id="logout">로그아웃</button></div>
 <div class="mini-grid"><div class="metric"><strong>${status.submitted??0}</strong><span>제출 완료</span></div><div class="metric"><strong>${c.is_open?'진행 중':'접수 중지'}</strong><span>조사 접수상태</span></div></div>
 ${c.is_open?'<div class="success">설문 접수가 열려 있습니다.</div>':'<div class="warning">현재 설문 접수가 중지되어 있습니다.</div>'}${printErr()}
 <div class="buttons"><button class="btn outline" id="refresh">현황 새로고침</button><button class="btn" id="export">전체 설문 결과 CSV · 보기 내용</button><button class="btn outline" id="export-codes">분석용 CSV · 숫자 코드</button><button class="btn outline" id="codebook">문항·코드 해석표 CSV</button></div><p class="help">보기 내용 파일에는 선택한 보기의 문구가 표시됩니다. 분석용 파일은 숫자 코드를 유지합니다. 모든 문항 열은 고정되며, 분기 미해당과 선택문항 무응답은 빈칸입니다.</p></section>
 <section class="panel"><h2>커피 쿠폰 연락처</h2><p>대한수의사회에서 추첨 및 쿠폰 발송에 사용합니다. 쿠폰 발송 완료 후 즉시 파기해 주십시오.</p><div class="buttons"><button class="btn" id="raffle-export">쿠폰 연락처 CSV 다운로드</button><button class="btn outline" id="raffle-purge">쿠폰 발송 완료 · 연락처 파기</button></div><p class="help">번호는 설문 분석 CSV에 포함되지 않습니다. 파기 버튼은 서버에 저장된 연락처를 삭제합니다. 내려받은 CSV와 발송에 사용한 파일도 즉시 삭제해 주십시오.</p><p id="raffle-result" role="status"></p></section>
 <section class="panel"><h2>본조사 응답 초기화</h2><p>학생용 공통 링크로 제출한 응답 <strong>${Number(status.submitted??0)}건</strong>과 연결된 쿠폰 연락처를 초기화합니다. 배포 전 입력한 테스트 응답을 정리할 때 사용해 주십시오.</p><div class="warning">초기화하면 현재 설문 버전의 본조사 응답과 연결된 연락처가 영구 삭제됩니다. 필요한 CSV를 먼저 내려받아 주십시오.</div><button class="btn outline" id="responses-reset" ${status.submitted?'':'disabled'}>본조사 응답 ${Number(status.submitted??0)}건 초기화</button><div id="responses-reset-confirmation" hidden><p>위 응답과 연결된 쿠폰 연락처를 영구 삭제하려면 아래에 <strong>초기화</strong>를 입력해 주십시오.</p><label for="responses-reset-text">초기화 확인</label><input class="field" id="responses-reset-text" autocomplete="off" placeholder="초기화"><div class="buttons"><button class="btn" id="responses-reset-execute" disabled>확인 후 영구 삭제</button><button class="btn outline" id="responses-reset-cancel">취소</button></div></div><p id="responses-reset-result" role="status"></p></section>
 <section class="panel"><h2>관리자 시험 링크</h2><p>저장된 관리자 시험 응답 <strong>${Number(status.pilotSubmitted??0)}건</strong></p>
 <p class="help">시험 링크는 발급 후 2시간 동안 유효하며 한 번 제출할 수 있습니다. 초기화하면 시험 응답과 기존 시험 링크를 삭제합니다.</p>
 <div class="buttons"><button class="btn" id="pilot-create">시험 설문 열기</button><button class="btn outline" id="pilot-reset">시험 응답 초기화</button></div>
 <p id="pilot-result" role="status"></p></section>
 <section class="panel"><h2>조사 응답 현황</h2><div class="row"><div><h3>정책집단별</h3>${statTable(stats.groupCount,['① 기존 희망','② 조건부 선택','③ 탐색·미정','④ 비고려','⑤ 경계'])}</div><div><h3>학년별</h3>${statTable(stats.yearCount,['본과 1학년','본과 2학년','본과 3학년','본과 4학년'])}</div></div><h3>대학별</h3>${statTable(stats.schoolCount,SCHOOLS)}<h3>지원 조건별 완료응답</h3><div class="row"><div>${numberTable(stats.f4Count,['500'],'F4 학기당 장학금 (만 원)')}</div><div>${numberTable(stats.f5Count,['100'],'I2-1 월 정착지원금 (만 원)')}</div></div><p class="help">위 표는 각 지원 문항의 제출 완료 응답 수입니다.</p></section>
 <section class="panel"><h2>학생용 설문 링크 배포</h2><p>대한수의사회에서 각 학교 학생회에 아래 공통 링크를 전달해 주십시오. 학생은 로그인이나 초대코드 입력 없이 설문 안내와 참여 동의 화면으로 접속합니다.</p><label for="survey-link">학생용 공통 링크</label><input class="field" id="survey-link" readonly value="${esc(new URL('./',location.href).href)}"><div class="buttons"><button class="btn" id="copy-link">설문 링크 복사</button><a class="btn outline" href="./" target="_blank" rel="noopener noreferrer">학생 화면 열기</a></div><p id="copy-result" role="status"></p><p class="help">이 주소를 QR코드로 만들어 같은 설문에 접속할 수 있습니다. 접수 상태는 위 조사 운영 현황에서 확인해 주십시오.</p></section>`;
 document.querySelector('#logout').onclick=()=>{jwt='';status=null;stats=null;error='';login()};
 document.querySelector('#refresh').onclick=load;
 document.querySelector('#responses-reset').onclick=()=>{
  document.querySelector('#responses-reset-confirmation').hidden=false;
  document.querySelector('#responses-reset').disabled=true;
  document.querySelector('#responses-reset-text').focus();
 };
 document.querySelector('#responses-reset-text').oninput=event=>{
  document.querySelector('#responses-reset-execute').disabled=event.target.value!=='초기화';
 };
 document.querySelector('#responses-reset-cancel').onclick=()=>{
  document.querySelector('#responses-reset-confirmation').hidden=true;
  document.querySelector('#responses-reset-text').value='';
  document.querySelector('#responses-reset-execute').disabled=true;
  document.querySelector('#responses-reset').disabled=false;
 };
 document.querySelector('#responses-reset-execute').onclick=async event=>{
  const confirmation=document.querySelector('#responses-reset-text').value;
  if(confirmation!=='초기화')return;
  const expectedCount=Number(status.submitted??0),button=event.currentTarget;
  button.disabled=true;
  document.querySelector('#responses-reset-cancel').disabled=true;
  const result=document.querySelector('#responses-reset-result');
  result.textContent='초기화 처리 중입니다…';
  try{
   const r=await api('admin_responses_reset',{confirm:confirmation,expectedCount},jwt);
   await load();
   const updated=document.querySelector('#responses-reset-result');
   if(updated)updated.textContent=`본조사 응답 ${r.removed.responses}건과 쿠폰 연락처 ${r.removed.contacts}건을 초기화했습니다.`;
  }catch(e){
   result.textContent=e.message;
   if(button.isConnected){button.disabled=false;document.querySelector('#responses-reset-cancel').disabled=false;}
  }
 };
 document.querySelector('#copy-link').onclick=async()=>{
  const field=document.querySelector('#survey-link'),result=document.querySelector('#copy-result');
  try{await navigator.clipboard.writeText(field.value);result.textContent='학생용 설문 링크를 복사했습니다.';}catch{field.focus();field.select();result.textContent='위 주소를 선택했습니다. 복사해 배포해 주십시오.';}
 };
 document.querySelector('#raffle-export').onclick=async()=>{try{const r=await api('admin_raffle_export',{},jwt);dl(couponCsv(r.csv),'coffee_coupon_contacts_formatted.csv');document.querySelector('#raffle-result').textContent=`추첨 신청 ${r.count}건을 내려받았습니다. 같은 번호의 중복 응모 여부를 확인해 주십시오.`;}catch(e){document.querySelector('#raffle-result').textContent=e.message}};
 document.querySelector('#raffle-purge').onclick=async event=>{
  if(!confirm('쿠폰 발송을 완료하셨습니까? 저장된 쿠폰 연락처를 모두 영구 삭제합니다. 복구할 수 없습니다.'))return;
  const button=event.currentTarget;button.disabled=true;
  try{const r=await api('admin_raffle_purge',{confirm:true},jwt);document.querySelector('#raffle-result').textContent=`연락처 ${r.removed}건을 파기했습니다. 내려받은 파일도 삭제해 주십시오.`;}catch(e){document.querySelector('#raffle-result').textContent=e.message}finally{button.disabled=false}
 };
 document.querySelector('#pilot-create').onclick=async event=>{
  const button=event.currentTarget;
  button.disabled=true;
  try{
   const r=await api('admin_pilot_create',{},jwt);
   const link=document.createElement('a');
   link.href='./?pilot=1#'+encodeURIComponent(r.code);
   link.target='_blank';
   link.rel='noopener noreferrer';
   link.textContent='새 탭에서 시험 설문 시작';
   document.querySelector('#pilot-result').replaceChildren(link);
  }catch(e){document.querySelector('#pilot-result').textContent=e.message}
  finally{button.disabled=false}
 };
 document.querySelector('#pilot-reset').onclick=async event=>{
  if(!confirm('시험 응답과 기존 시험 링크를 초기화하시겠습니까?'))return;
  const button=event.currentTarget;
  button.disabled=true;
  try{
   const r=await api('admin_pilot_reset',{confirm:true},jwt);
   await load();
   const result=document.querySelector('#pilot-result');
   if(result)result.textContent=`시험 응답 ${Number(r.removed)}건을 초기화했습니다.`;
  }catch(e){document.querySelector('#pilot-result').textContent=e.message}
  finally{button.disabled=false}
 };
 document.querySelector('#export').onclick=async()=>{try{const r=await api('admin_export',{},jwt);dl(surveyCsv(r.csv),`survey_${VERSION}_readable.csv`)}catch(e){alert('CSV 추출 실패: '+e.message)}};
 document.querySelector('#export-codes').onclick=async()=>{try{const r=await api('admin_export',{},jwt);dl(surveyCsv(r.csv,false),`survey_${VERSION}_analysis.csv`)}catch(e){alert('CSV 추출 실패: '+e.message)}};
 document.querySelector('#codebook').onclick=()=>dl(codebookCsv(),`survey_${VERSION}_codebook.csv`);

}
function statTable(obj={},labels=[]){return `<div class="table-wrap"><table><thead><tr><th>구분</th><th>응답 수</th></tr></thead><tbody>${labels.map((label,i)=>`<tr><td>${esc(label)}</td><td>${Number(obj[String(i+1)]||0)}</td></tr>`).join('')}</tbody></table></div>`}
login();

function numberTable(obj,keys,title){return `<div class="table-wrap"><table><thead><tr><th colspan="2">${esc(title)}</th></tr></thead><tbody>${keys.map(k=>`<tr><td>${esc(k)}</td><td>${Number(obj?.[k]||0)}명</td></tr>`).join('')}</tbody></table></div>`}
