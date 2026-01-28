const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// .env 파일 로드
const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('.env 파일 로드 에러:', result.error);
}

// PostgreSQL 데이터베이스 연결 설정
const pool = new Pool({
  // pg 패키지는 PGUSER, PGHOST 등의 환경 변수를 자동으로 인식합니다.
  // 명시적으로 지정할 수도 있습니다.
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT || 5432,
});

// 연결 테스트
pool.connect((err, client, release) => {
  if (err) {
    console.error('PostgreSQL 연결 에러:', err);
    return;
  }
  console.log('PostgreSQL 데이터베이스에 성공적으로 연결되었습니다.');
  release();
});

// 쿼리 실행 유틸리티 함수
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('쿼리 실행 에러:', error);
    throw error;
  }
};

module.exports = {
  pool,
  query
};
