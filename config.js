// 공개 설정만 포함합니다. 관리자 비밀번호, service_role/secret 키를 절대 넣지 마십시오.
window.SURVEY_CONFIG = {
  apiUrl: 'https://ieuekoeqnlxyntamvfio.supabase.co/functions/v1/survey-api', // 배포 후: https://<project-ref>.supabase.co/functions/v1/survey-api
  supabaseUrl: 'https://ieuekoeqnlxyntamvfio.supabase.co', // 관리자 인증에만 사용. 공개 가능한 프로젝트 URL
  supabasePublishableKey: 'sb_publishable_CpyNO_hLTT1NoCxB0i7IcQ_GH6WkHTr', // 공개 가능한 sb_publishable_... (service_role 키 금지)
  owner: '대한수의사회',
  contact: '031-702-8686',     // 담당자 이메일 또는 전화
  privacyNotice: '쿠폰 추첨에 참여하는 경우 휴대전화 번호를 별도로 수집하며, 대한수의사회에서 추첨·당첨 안내·쿠폰 발송에 사용하고 발송 완료 후 즉시 파기합니다. 추첨 참여는 선택사항입니다.',
  ethicsNotice: '', // 승인/면제/기관 확인 결과 안내문
  collectionEnabled: true, // 학생용 공통 링크 응답 접수 활성화
};
