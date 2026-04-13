// ─────────────────────────────────────────
//  sample-data.js  —  오프라인 / 테스트용
// ─────────────────────────────────────────

const SAMPLE = {
  brands: [
    { id: 'skx',  label: '스케쳐스', color: '#7F77DD' },
    { id: 'hd',   label: '현대약품', color: '#378ADD' },
    { id: 'cb',   label: '커리어벗', color: '#1D9E75' },
    { id: 'hyp',  label: '하이퍼',   color: '#D85A30' },
    { id: 'emk',  label: 'EMK',      color: '#BA7517' },
  ],

  members: [
    { name: '성수', color: '#7F77DD', status: 'active' },
    { name: '재영', color: '#1D9E75', status: 'active' },
    { name: '지연', color: '#D85A30', status: 'active' },
    { name: '경주', color: '#378ADD', status: 'active' },
  ],

  campaign: [
    { id:1,  brand:'skx', title:'4월 Meta 캠페인 소재',       step:'소재제작', status:'진행중',   media:'Meta',        hasBid:false, assignee:'지연',      due:'2026-04-13', startDate:'2026-04-10', driveUrl:'', driveLabel:'' },
    { id:2,  brand:'skx', title:'봄 시즌 GFA 기획',           step:'소재기획', status:'컨펌대기', media:'GFA',         hasBid:false, assignee:'성수',      due:'2026-04-14', startDate:'2026-04-12', driveUrl:'', driveLabel:'기획서.pptx' },
    { id:3,  brand:'skx', title:'스케쳐스 네이버 PL',         step:'Live',    status:'진행중',   media:'네이버 PL',   hasBid:true,  assignee:'성수',      due:'2026-04-30', startDate:'2026-04-01', driveUrl:'', driveLabel:'' },
    { id:4,  brand:'hd',  title:'건강기능식품 네이버 BSA',     step:'소재등록', status:'진행중',   media:'네이버 BSA',  hasBid:false, assignee:'재영',      due:'2026-04-15', startDate:'2026-04-13', driveUrl:'', driveLabel:'' },
    { id:5,  brand:'hd',  title:'비타민 구글 캠페인',         step:'소재기획', status:'진행중',   media:'구글',        hasBid:false, assignee:'경주',      due:'2026-04-18', startDate:'2026-04-14', driveUrl:'', driveLabel:'' },
    { id:6,  brand:'hd',  title:'현대약품 네이버 쇼검',       step:'Live',    status:'진행중',   media:'네이버 쇼검', hasBid:true,  assignee:'재영',      due:'2026-04-30', startDate:'2026-04-01', driveUrl:'', driveLabel:'' },
    { id:7,  brand:'cb',  title:'취준생 타겟 Meta',           step:'소재검수', status:'완료',     media:'Meta',        hasBid:false, assignee:'성수',      due:'2026-04-13', startDate:'2026-04-11', driveUrl:'', driveLabel:'' },
    { id:8,  brand:'cb',  title:'네이버 PL 소재 세트',        step:'소재제작', status:'컨펌대기', media:'네이버 PL',   hasBid:false, assignee:'지연',      due:'2026-04-10', startDate:'2026-04-08', driveUrl:'', driveLabel:'PL소재_최종.ai' },
    { id:9,  brand:'cb',  title:'커리어벗 네이버 쇼검',       step:'Live',    status:'진행중',   media:'네이버 쇼검', hasBid:true,  assignee:'경주',      due:'2026-04-30', startDate:'2026-04-01', driveUrl:'', driveLabel:'' },
    { id:10, brand:'hyp', title:'에너지드링크 카카오',        step:'소재제작', status:'진행중',   media:'카카오',      hasBid:false, assignee:'재영',      due:'2026-04-16', startDate:'2026-04-13', driveUrl:'', driveLabel:'' },
    { id:11, brand:'hyp', title:'쇼핑검색 시즌 광고',         step:'소재기획', status:'진행중',   media:'네이버 쇼검', hasBid:false, assignee:'경주',      due:'2026-04-17', startDate:'2026-04-14', driveUrl:'', driveLabel:'기획안_초안.docx' },
    { id:12, brand:'emk', title:'공연 Meta 소재 등록',         step:'소재등록', status:'진행중',   media:'Meta',        hasBid:false, assignee:'성수',      due:'2026-04-13', startDate:'2026-04-13', driveUrl:'', driveLabel:'' },
    { id:13, brand:'emk', title:'구글 디스플레이 세팅',       step:'소재기획', status:'컨펌대기', media:'구글',        hasBid:false, assignee:'재영',      due:'2026-04-14', startDate:'2026-04-12', driveUrl:'', driveLabel:'세팅가이드.xlsx' },
    { id:14, brand:'emk', title:'EMK 네이버 PL',             step:'Live',    status:'진행중',   media:'네이버 PL',   hasBid:true,  assignee:'지연',      due:'2026-04-30', startDate:'2026-04-01', driveUrl:'', driveLabel:'' },
    { id:15, brand:'skx', title:'5월 Meta 소재 기획',         step:'소재기획', status:'진행중',   media:'Meta',        hasBid:false, assignee:'지연,경주', due:'2026-04-20', startDate:'2026-04-16', driveUrl:'', driveLabel:'' },
  ],

  common: [
    { id:201, type:'미디어믹스',  title:'스케쳐스 5월 미디어믹스',          media:'',           assignee:'성수', due:'2026-04-18', done:false, driveUrl:'', driveLabel:'미디어믹스안.xlsx' },
    { id:202, type:'미디어믹스',  title:'현대약품 5월 미디어믹스',          media:'',           assignee:'경주', due:'2026-04-18', done:false, driveUrl:'', driveLabel:'' },
    { id:203, type:'정산',        title:'4월 정산서 취합',                  media:'',           assignee:'경주', due:'2026-04-15', done:false, driveUrl:'', driveLabel:'정산서_4월.xlsx' },
    { id:204, type:'정산',        title:'스케쳐스 견적서 작성',             media:'',           assignee:'성수', due:'2026-04-14', done:false, driveUrl:'', driveLabel:'' },
    { id:205, type:'정산',        title:'EMK 3월 최종 정산',                media:'',           assignee:'경주', due:'2026-04-11', done:true,  driveUrl:'', driveLabel:'EMK_3월정산.xlsx' },
    { id:206, type:'광고비 확인', title:'전 브랜드 4월 광고비 확인',        media:'',           assignee:'성수', due:'2026-04-13', done:false, driveUrl:'', driveLabel:'' },
    { id:207, type:'광고비 충전', title:'스케쳐스 Meta 광고비 충전',        media:'Meta',       assignee:'재영', due:'2026-04-13', done:true,  driveUrl:'', driveLabel:'' },
    { id:208, type:'광고비 충전', title:'현대약품 구글 광고비 충전',        media:'구글',       assignee:'재영', due:'2026-04-14', done:false, driveUrl:'', driveLabel:'' },
    { id:209, type:'입찰가 관리', title:'커리어벗 네이버 PL 입찰가 조정',   media:'네이버 PL',  assignee:'지연', due:'2026-04-13', done:false, driveUrl:'', driveLabel:'' },
    { id:210, type:'입찰가 관리', title:'스케쳐스 네이버 쇼검 입찰가 점검', media:'네이버 쇼검',assignee:'경주', due:'2026-04-14', done:false, driveUrl:'', driveLabel:'' },
    { id:211, type:'입찰가 관리', title:'하이퍼 쇼핑검색 입찰가 최적화',    media:'네이버 쇼검',assignee:'성수', due:'2026-04-15', done:false, driveUrl:'', driveLabel:'' },
  ],

  report: [
    { id:301, brand:'skx', type:'데일리', title:'스케쳐스 데일리 리포트', assignee:'성수', due:'2026-04-13', done:false, driveUrl:'', driveLabel:'daily_0413.xlsx' },
    { id:302, brand:'hd',  type:'주간',   title:'현대약품 주간 리포트',   assignee:'재영', due:'2026-04-14', done:false, driveUrl:'', driveLabel:'weekly_w15.pptx' },
    { id:303, brand:'cb',  type:'분기',   title:'커리어벗 분기 보고',     assignee:'성수', due:'2026-04-20', done:false, driveUrl:'', driveLabel:'Q1_report.pptx' },
    { id:304, brand:'hyp', type:'미팅',   title:'하이퍼 미팅자료',        assignee:'지연', due:'2026-04-15', done:false, driveUrl:'', driveLabel:'미팅자료_0415.pptx' },
    { id:305, brand:'emk', type:'데일리', title:'EMK 데일리 리포트',      assignee:'재영', due:'2026-04-13', done:false, driveUrl:'', driveLabel:'' },
    { id:306, brand:'skx', type:'미팅',   title:'스케쳐스 미팅자료',      assignee:'경주', due:'2026-04-16', done:false, driveUrl:'', driveLabel:'미팅_0416.pptx' },
  ],
};
