import {SCHOOLS,VERSION} from './survey.mjs';
import {api} from './api.mjs';
const root=document.querySelector('#admin'),cfg=window.SURVEY_CONFIG||{};
let jwt='',error='',status=null,stats=null,invitationBatch=null;
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
 <div class="mini-grid"><div class="metric"><strong>${status.invited??0}</strong><span>발급된 초대코드</span></div><div class="metric"><strong>${status.submitted??0}</strong><span>제출 완료</span></div><div class="metric"><strong>${c.is_open?'진행 중':'접수 중지'}</strong><span>조사 접수상태</span></div></div>
 ${c.is_open?'<div class="success">설문 접수가 열려 있습니다.</div>':'<div class="warning">접수 기본값은 닫힘입니다. 연구윤리·개인정보 고지를 확정한 뒤에만 DB 관리자 승인으로 열 수 있습니다.</div>'}${printErr()}
 <div class="buttons"><button class="btn outline" id="refresh">현황 새로고침</button><button class="btn" id="export">익명 CSV 다운로드</button></div></section>
 <section class="panel"><h2>조사 응답 현황</h2><div class="row"><div><h3>정책집단별</h3>${statTable(stats.groupCount,['① 기존 희망','② 조건부 선택','③ 탐색·미정','④ 비고려','⑤ 경계'])}</div><div><h3>학년별</h3>${statTable(stats.yearCount,['본과 1학년','본과 2학년','본과 3학년','본과 4학년'])}</div></div><h3>대학별</h3>${statTable(stats.schoolCount,SCHOOLS)}<h3>지원 조건별 완료응답</h3><div class="row"><div>${numberTable(stats.f4Count,['500'],'F4 학기당 장학금 (만 원)')}</div><div>${numberTable(stats.f5Count,['100'],'I2-1 월 정착지원금 (만 원)')}</div></div><p class="help">위 표는 각 지원 문항의 제출 완료 응답 수입니다.</p></section>
 <section class="panel"><h2>일회용 초대코드 발급</h2><p class="muted">초대코드는 한 번만 화면에 표시되며, DB에는 SHA-256 해시만 저장됩니다. 이메일·이름·학번은 시스템에 입력하지 않습니다.</p>
 <label>대상 대학<select class="field" id="school">${[...SCHOOLS,'unspecified'].map(x=>`<option>${esc(x)}</option>`).join('')}</select></label>
 <label>배포 경로<select class="field" id="source"><option value="academic">학사행정</option><option value="student">학생회</option><option value="club">동아리</option><option value="other">기타</option></select></label>
 <label>발급 개수 (한 번에 최대 300)<input class="field" type="number" id="count" min="1" max="300" value="10"></label>
 <button class="btn" id="create">코드 생성 및 CSV 저장</button><div class="warning">생성 후 코드 목록을 배포 담당자에게 안전하게 전달하십시오. 유효 코드가 유출되면 다른 사람이 먼저 제출할 수 있습니다.</div></section>`;
 document.querySelector('#logout').onclick=()=>{jwt='';status=null;stats=null;invitationBatch=null;error='';login()};
 document.querySelector('#refresh').onclick=load;
 document.querySelector('#export').onclick=async()=>{try{const r=await api('admin_export',{},jwt);dl(r.csv,r.filename)}catch(e){alert('CSV 추출 실패: '+e.message)}};
 document.querySelector('#create').onclick=async()=>{
  try{const school=document.querySelector('#school').value,source=document.querySelector('#source').value,count=Number(document.querySelector('#count').value);
  if(!confirm(`${school} / ${count}개 초대코드를 생성하시겠습니까?`))return;
  const r=await api('admin_invites',{school,source,count},jwt);
  const lines=['\ufeff"invite_code","school","source"',...r.codes.map(c=>`"${c}","${school}","${source}"`)];
  dl(lines.join('\r\n'),`survey_invites_${school}_${Date.now()}.csv`);
  alert('초대코드를 발급했습니다. 평문 코드는 지금 다운로드한 CSV에만 있습니다.');await load();
  }catch(e){alert('초대코드 발급 실패: '+e.message)}
 };
}
function statTable(obj={},labels=[]){return `<div class="table-wrap"><table><thead><tr><th>구분</th><th>응답 수</th></tr></thead><tbody>${labels.map((label,i)=>`<tr><td>${esc(label)}</td><td>${Number(obj[String(i+1)]||0)}</td></tr>`).join('')}</tbody></table></div>`}
login();

function numberTable(obj,keys,title){return `<div class="table-wrap"><table><thead><tr><th colspan="2">${esc(title)}</th></tr></thead><tbody>${keys.map(k=>`<tr><td>${esc(k)}</td><td>${Number(obj?.[k]||0)}명</td></tr>`).join('')}</tbody></table></div>`}
