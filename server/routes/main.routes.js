const express = require('express');
const router = express.Router();
const MainController = require('../controllers/main.controller');

// 인증 미들웨어
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('메인 라우트 디버깅: Authorization 헤더:', authHeader);
  console.log('메인 라우트 디버깅: 추출된 토큰:', token);

  if (!token || token === 'null') {
    console.log('메인 라우트 디버깅: 토큰이 없거나 null - 401 반환');
    return res.status(401).json({ message: '액세스 토큰이 필요합니다.' });
  }

  // 임시로 'auth-token' 문자열도 허용 (현재 로그인 시스템과 호환)
  if (token === 'auth-token') {
    console.log('메인 라우트 디버깅: auth-token 문자열 인증 성공');
    req.user = { username: 'admin' };
    return next();
  }

  console.log('메인 라우트 디버깅: JWT 토큰 검증 시도');
  // 실제 JWT 토큰 검증
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('메인 라우트 디버깅: JWT 검증 실패:', err.message);
      return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
    console.log('메인 라우트 디버깅: JWT 검증 성공:', user);
    req.user = user;
    next();
  });
};

// 메인 대시보드 라우트
router.get('/dashboard', MainController.getDashboardData);

// 관리자 활동 기록 라우트
router.post('/admin-activity', MainController.recordActivity);

// CSR 이상내역 관련 라우트
router.get('/csr-abnormal', MainController.getCSRAbnormalList);
router.get('/csr-abnormal/count', MainController.getCSRAbnormalCount);

// CSR 상세 정보 라우트 (디버깅 추가)
router.get('/csr-detail/:csrId', (req, res, next) => {
  console.log('=== CSR 상세 라우트 호출됨 ===');
  console.log('요청 경로:', req.path);
  console.log('csrId 파라미터:', req.params.csrId);
  console.log('전체 URL:', req.originalUrl);
  next();
}, MainController.getCSRDetailById);

// AAA 미사용자 명단 관련 라우트
router.get('/unused-users', MainController.getUnusedUsersList);
router.get('/unused-users/count', MainController.getUnusedUsersCount);
router.get('/unused-users/departments', MainController.getUnusedUsersDepartments);

// AAA 미사용자 수 주간 비교 조회 라우트
router.get('/unused-users/weekly-comparison', (req, res, next) => {
  console.log('=== AAA 미사용자 주간 비교 라우트 호출됨 ===');
  console.log('요청 경로:', req.path);
  console.log('전체 URL:', req.originalUrl);
  console.log('헤더:', req.headers);
  next();
}, MainController.getUnusedUsersWeeklyComparison);

// 사용자 앱 버전 내역 관련 라우트 (디버깅 추가)
router.get('/app-version', (req, res, next) => {
  console.log('=== 앱 버전 목록 라우트 호출됨 ===');
  console.log('요청 경로:', req.path);
  console.log('전체 URL:', req.originalUrl);
  console.log('쿼리:', req.query);
  console.log('헤더:', req.headers);
  next();
}, MainController.getAppVersionList);

router.get('/app-version/summary', (req, res, next) => {
  console.log('=== 앱 버전 요약 라우트 호출됨 ===');
  console.log('요청 경로:', req.path);
  console.log('전체 URL:', req.originalUrl);
  console.log('쿼리:', req.query);
  console.log('헤더:', req.headers);
  next();
}, MainController.getAppVersionSummary);

// v1.2.0 사용자 수 주간 비교 조회 라우트
router.get('/app-version/weekly-comparison', (req, res, next) => {
  console.log('=== v1.2.0 주간 비교 라우트 호출됨 ===');
  console.log('요청 경로:', req.path);
  console.log('전체 URL:', req.originalUrl);
  console.log('헤더:', req.headers);
  next();
}, MainController.getV120WeeklyComparison);

// v1.2.1 사용자 수 주간 비교 조회 라우트
router.get('/app-version/weekly-comparison-v121', (req, res, next) => {
  console.log('=== v1.2.1 주간 비교 라우트 호출됨 ===');
  console.log('요청 경로:', req.path);
  console.log('전체 URL:', req.originalUrl);
  console.log('헤더:', req.headers);
  next();
}, MainController.getV121WeeklyComparison);

// v1.3.0 사용자 수 주간 비교 조회 라우트
router.get('/app-version/weekly-comparison-v130', (req, res, next) => {
  console.log('=== v1.3.0 주간 비교 라우트 호출됨 ===');
  console.log('요청 경로:', req.path);
  console.log('전체 URL:', req.originalUrl);
  console.log('헤더:', req.headers);
  next();
}, MainController.getV130WeeklyComparison);

// v1.3.1 사용자 수 주간 비교 조회 라우트
router.get('/app-version/weekly-comparison-v131', (req, res, next) => {
  console.log('=== v1.3.1 주간 비교 라우트 호출됨 ===');
  console.log('요청 경로:', req.path);
  console.log('전체 URL:', req.originalUrl);
  console.log('헤더:', req.headers);
  next();
}, MainController.getV131WeeklyComparison);

// 개인정보 동의 현황 관련 라우트 (디버깅 추가)
router.get('/privacy-consent', (req, res, next) => {
  console.log('=== 개인정보 동의 현황 목록 라우트 호출됨 ===');
  console.log('요청 경로:', req.path);
  console.log('전체 URL:', req.originalUrl);
  console.log('쿼리:', req.query);
  console.log('헤더:', req.headers);
  next();
}, MainController.getPrivacyConsentList);

router.get('/privacy-consent/summary', (req, res, next) => {
  console.log('=== 개인정보 동의 현황 요약 라우트 호출됨 ===');
  console.log('요청 경로:', req.path);
  console.log('전체 URL:', req.originalUrl);
  console.log('쿼리:', req.query);
  console.log('헤더:', req.headers);
  next();
}, MainController.getPrivacyConsentSummary);

// 월별 생일자 인원수 조회 라우트 (디버깅 추가)
router.get('/birthday-count-by-month', (req, res, next) => {
  console.log('=== 월별 생일자 인원수 라우트 호출됨 ===');
  console.log('요청 경로:', req.path);
  console.log('전체 URL:', req.originalUrl);
  console.log('쿼리:', req.query);
  console.log('헤더:', req.headers);
  next();
}, MainController.getBirthdayCountByMonth);

// 추석 선물 모니터링 현황 관련 라우트 (디버깅 추가)
router.get('/chuseok-gift', (req, res, next) => {
  console.log('=== 추석 선물 모니터링 현황 목록 라우트 호출됨 ===');
  console.log('요청 경로:', req.path);
  console.log('전체 URL:', req.originalUrl);
  console.log('쿼리:', req.query);
  console.log('헤더:', req.headers);
  next();
}, MainController.getChuseokGiftList);

router.get('/chuseok-gift/summary', (req, res, next) => {
  console.log('=== 추석 선물 모니터링 현황 요약 라우트 호출됨 ===');
  console.log('요청 경로:', req.path);
  console.log('전체 URL:', req.originalUrl);
  console.log('쿼리:', req.query);
  console.log('헤더:', req.headers);
  next();
}, MainController.getChuseokGiftSummary);

module.exports = router; 