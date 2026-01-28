# API 500 에러 트러블슈팅 가이드

## 🔍 문제 상황

선물보내기 페이지에서 조직도 API 호출 시 지속적으로 500 Internal Server Error 발생

### 에러 로그
```
GET http://localhost:9999/api/gifts/organization-tree 500 (Internal Server Error)
✅ 조직도 데이터 로드 성공: {success: false, message: '조직도 데이터를 가져오는 데 실패했습니다.'}
❌ 조직도 데이터 로드 실패: 조직도 데이터를 가져오는 데 실패했습니다.
```

## 🧪 문제 분석 과정

### 1. 클라이언트 문제 확인
- ✅ API 요청 URL: `/api/gifts/organization-tree?adminRole=1&userId=admin@aspnc.com`
- ✅ 헤더: `X-Admin-Role: 1`, `X-User-ID: admin@aspnc.com`
- ✅ localStorage: `{adminRole: '1', userId: 'admin@aspnc.com', username: 'admin@aspnc.com'}`

### 2. 서버 라우트 확인
- ✅ 라우트 존재: `router.get('/organization-tree', organizationController.getOrganizationTree);`
- ✅ 컨트롤러 존재: `organizationController.getOrganizationTree`
- ✅ 모델 존재: `Organization.getOrganizationTree()`

### 3. 서버 실행 상태 확인
```bash
npm start
# 결과: 서버가 http://localhost:9999 에서 실행 중입니다.
# PostgreSQL 데이터베이스에 성공적으로 연결되었습니다.
```

### 4. 직접 API 테스트
```bash
curl -s "http://localhost:9999/api/gifts/organization-tree?adminRole=1&userId=admin@aspnc.com" -H "X-Admin-Role: 1" -H "X-User-ID: admin@aspnc.com"
```

## 🎯 핵심 문제 발견

### PostgreSQL 쿼리 결과 구조 문제

**예상 구조 (MySQL 스타일):**
```javascript
const [rows] = await db.query(query);
// 예상: rows = [{email: '...', dept: '...', name: '...'}, ...]
```

**실제 구조 (PostgreSQL 스타일):**
```javascript
const result = await db.query(query);
console.log(result);
// 실제: {
//   command: 'SELECT',
//   rowCount: 340,
//   rows: [{email: '...', dept: '...', name: '...'}, ...],
//   fields: [...],
//   ...
// }
```

### 에러 메시지
```
TypeError: (intermediate value) is not iterable
at Object.getOrganizationTree (/server/models/organization.model.js:23:22)
```

## 🔧 해결 방법

### 1. PostgreSQL 응답 구조 처리

**수정 전:**
```javascript
const [rows] = await db.query(query); // ❌ 에러 발생
console.log('📊 쿼리 결과 행 수:', rows.length);
```

**수정 후:**
```javascript
const result = await db.query(query);
console.log('📊 쿼리 결과 전체:', result);
console.log('📊 쿼리 결과 타입:', typeof result);
console.log('📊 쿼리 결과 구조:', Object.keys(result));

const rows = result.rows || result; // ✅ PostgreSQL 구조 처리
console.log('📊 쿼리 결과 행 수:', rows ? rows.length : 0);
```

### 2. 권한 처리 로직 개선

**수정 전:**
```javascript
// 토큰 기반 인증 의존
console.log('👤 요청 사용자:', req.user ? {
  id: req.user.id,
  username: req.user.username
} : 'null');
```

**수정 후:**
```javascript
// 헤더/쿼리 파라미터 기반 권한 처리
const adminRole = req.headers['x-admin-role'] || req.query.adminRole;
const userId = req.headers['x-user-id'] || req.query.userId;

console.log('👤 요청 권한 정보:', { adminRole, userId });

// 기본적인 권한 체크
if (!adminRole) {
  return res.status(401).json({ 
    success: false, 
    message: '권한 정보가 필요합니다.' 
  });
}
```

### 3. 에러 처리 강화

```javascript
// DB 연결 문제인 경우 구체적 메시지
if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
  throw new Error('데이터베이스 연결에 실패했습니다. 네트워크 연결을 확인해주세요.');
}

// 테이블/뷰 존재하지 않는 경우
if (error.code === '42P01' || error.message.includes('does not exist')) {
  throw new Error('hr.view_hr 테이블/뷰가 존재하지 않습니다. 데이터베이스 설정을 확인해주세요.');
}

// 권한 문제인 경우
if (error.code === '42501' || error.message.includes('permission denied')) {
  throw new Error('데이터베이스 접근 권한이 없습니다. 권한 설정을 확인해주세요.');
}
```

## ✅ 해결 결과

### 성공적인 API 응답
```json
{
  "success": true,
  "data": [
    {
      "name": "경영관리실",
      "members": [
        {"email": "noey13@aspnc.com", "name": "김서연"},
        {"email": "sunny@aspnc.com", "name": "박정선"},
        ...
      ]
    },
    ...
  ]
}
```

### 서버 로그
```
🏢 조직도 컨트롤러 시작
👤 요청 권한 정보: { adminRole: '1', userId: 'admin@aspnc.com' }
🗄️ 조직도 모델 getOrganizationTree 시작
📊 DB 쿼리 실행 시작...
📊 쿼리 결과 행 수: 340
✅ 조직도 트리 생성 완료. 부서 수: 19
  부서 1: 경영관리실 (6명)
  부서 2: 남부지사 (25명)
  ...
  부서 19: SCM사업부 (51명)
✅ 조직도 데이터 조회 성공. 부서 수: 19
```

## 📋 학습 포인트

### 1. 데이터베이스 드라이버별 응답 구조 차이
- **MySQL**: `[rows, fields]` 배열 형태로 반환
- **PostgreSQL**: `{rows: [...], command: '...', ...}` 객체 형태로 반환

### 2. JavaScript Destructuring 주의사항
```javascript
// ❌ PostgreSQL에서 에러 발생
const [rows] = await db.query(query);

// ✅ 안전한 방법
const result = await db.query(query);
const rows = result.rows || result;
```

### 3. 에러 디버깅 단계
1. **클라이언트 요청 확인** - 네트워크 탭, 콘솔 로그
2. **서버 실행 상태 확인** - 포트, 프로세스 상태
3. **라우트/컨트롤러 존재 확인** - 파일 구조
4. **직접 API 테스트** - curl, Postman 등
5. **서버 로그 분석** - 실제 에러 메시지 확인
6. **DB 연결/쿼리 확인** - 데이터베이스 접근 권한

### 4. 권한 관리 방식 변경
- **기존**: JWT 토큰 기반 인증
- **변경**: 헤더/쿼리 파라미터 기반 admin_role 권한 체크

## 🚨 예방법

1. **데이터베이스 드라이버 문서 확인**
2. **에러 로깅 강화** - 구체적인 에러 정보 수집
3. **단위 테스트 작성** - DB 쿼리 결과 구조 테스트
4. **타입 체크** - TypeScript 도입 고려
5. **API 문서화** - 요청/응답 형식 명시

---

**최종 해결 시간**: 약 2시간  
**핵심 문제**: PostgreSQL 쿼리 결과 구조 destructuring 에러  
**해결 방법**: `result.rows` 속성 접근으로 변경