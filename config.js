// 공개 설정만 포함합니다. 관리자 비밀번호, service_role/secret 키를 절대 넣지 마십시오.
window.SURVEY_CONFIG = {
  apiUrl: '', // 배포 후: https://<project-ref>.supabase.co/functions/v1/survey-api
  supabaseUrl: '', // 관리자 인증에만 사용. 공개 가능한 프로젝트 URL
  supabasePublishableKey: '', // 공개 가능한 sb_publishable_... (service_role 키 금지)
  owner: '',       // 실제 조사책임기관
  contact: '',     // 담당자 이메일 또는 전화
  privacyNotice: '', // 승인된 개인정보·보존·파기·철회 안내문 전체
  ethicsNotice: '', // 승인/면제/기관 확인 결과 안내문
  approvedForRecruitment: false, // 실제 고지와 승인 절차 완료 후 true
};
