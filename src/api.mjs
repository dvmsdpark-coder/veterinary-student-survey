const config=window.SURVEY_CONFIG||{};
export async function api(action,payload={},authToken=''){
 if(!config.apiUrl)throw new Error('아직 응답 서버 주소가 설정되지 않았습니다.');
 const res=await fetch(config.apiUrl,{method:'POST',mode:'cors',cache:'no-store',referrerPolicy:'no-referrer',headers:{'content-type':'application/json',...(authToken?{'authorization':'Bearer '+authToken}:{})},body:JSON.stringify({action,...payload})});
 const body=await res.json().catch(()=>({error:'서버 응답을 읽을 수 없습니다.'}));
 if(!res.ok)throw new Error(body.error||'요청을 완료하지 못했습니다.');return body;
}
