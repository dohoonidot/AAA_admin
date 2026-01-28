const db = require('../config/db');

// User 모델 정의
const User = {
  // 사용자 목록 조회 (페이지네이션, 필터링 포함)
  findAll: async (options = {}) => {
    const {
      page = 1,
      limit = 10,
      dept,
      job_grade,
      job_position,
      permission,
      csr_search_div,
      search,
      is_worked
    } = options;
    
    console.log('사용자 목록 조회 옵션:', options);
    
    const offset = (page - 1) * limit;
    console.log(`페이지: ${page}, 한 페이지당 항목 수: ${limit}, offset: ${offset}`);
    
    // 기본 쿼리 준비 - hr.organization과 hr.employee_info 테이블 JOIN하여 입사일 기준 정렬
    let queryText = `
      SELECT u.*, o.resign_date
      FROM "aiagent_schema"."user" u
      LEFT JOIN hr.organization o ON u.user_id = o.email
      LEFT JOIN hr.employee_info ei ON REPLACE(o.phone_num, '-', '') = REPLACE(ei.phone, '-', '')
      WHERE 1=1`;
    const queryParams = [];
    let paramIndex = 1;
    
    // 필터링 조건 추가 (테이블 별칭 u 사용)
    if (dept) {
      queryText += ` AND u.dept = $${paramIndex++}`;
      queryParams.push(dept);
    }

    if (job_grade) {
      queryText += ` AND u.job_grade = $${paramIndex++}`;
      queryParams.push(job_grade);
    }

    if (job_position) {
      queryText += ` AND u.job_position = $${paramIndex++}`;
      queryParams.push(job_position);
    }

    if (permission !== undefined) {
      queryText += ` AND u.permission = $${paramIndex++}`;
      queryParams.push(permission);
    }

    if (csr_search_div !== undefined) {
      queryText += ` AND u.csr_search_div = $${paramIndex++}`;
      queryParams.push(csr_search_div);
    }

    // 재직여부 필터 추가 (organization 테이블의 is_worked 컬럼 사용)
    if (is_worked) {
      // organization 테이블의 is_worked로 필터링
      queryText += ` AND o.is_worked = $${paramIndex++}`;
      queryParams.push(is_worked);
      console.log(`is_worked 필터 적용: ${is_worked}`);
    }

    // 검색 조건 추가 (테이블 별칭 u 사용)
    if (search) {
      queryText += ` AND (u.user_id ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex} OR u.dept ILIKE $${paramIndex})`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern);
      paramIndex++;
    }
    
    // 전체 개수 조회 쿼리 (resign_date 제거)
    const countQuery = queryText.replace('SELECT u.*, o.resign_date', 'SELECT COUNT(*) as total');

    // 데이터 조회 쿼리 (입사일 기준 오름차순 정렬 - 오래된 사원이 앞으로, 신입이 뒤로)
    queryText += ` ORDER BY COALESCE(ei.join_date, '9999-12-31') ASC, u.user_id ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(parseInt(limit), offset);
    
    console.log('실행할 쿼리:', { countQuery, queryText, queryParams });
    
    try {
      // 전체 개수 조회
      console.log('전체 개수 조회 시작...');
      const countResult = await db.query(countQuery, queryParams.slice(0, paramIndex - 3));
      console.log('전체 개수 조회 결과:', countResult.rows);
      
      const total = parseInt(countResult.rows[0].total);
      
      // 페이지가 범위를 벗어나는지 확인
      const maxPage = Math.ceil(total / limit) || 1;
      const validPage = Math.min(maxPage, Math.max(1, page));
      
      // 원래 요청 페이지와 유효 페이지가 다르면 오프셋 재계산
      if (validPage !== page) {
        console.log(`요청 페이지(${page})가 유효 범위를 벗어남. 유효 페이지(${validPage})로 조정.`);
        const newOffset = (validPage - 1) * limit;
        // 쿼리 파라미터의 마지막 값(offset)을 업데이트
        queryParams[queryParams.length - 1] = newOffset;
      }
      
      // 데이터 조회
      console.log('데이터 조회 시작...');
      const result = await db.query(queryText, queryParams);
      console.log(`데이터 조회 결과: ${result.rows.length}건 조회됨`);
      
      const response = {
        users: result.rows,
        total,
        page: validPage, // 유효한 페이지 번호 반환
        totalPages: maxPage
      };
      
      console.log('응답 데이터 생성 완료:', { 
        total, 
        totalPages: maxPage, 
        page: validPage,
        resultCount: result.rows.length
      });
      
      return response;
    } catch (error) {
      console.error('사용자 목록 조회 오류 상세정보:', error);
      console.error('실행 중이던 쿼리:', queryText);
      console.error('쿼리 파라미터:', queryParams);
      throw error;
    }
  },
  
  // 특정 ID로 사용자 조회
  findById: async (userId) => {
    console.log(`ID로 사용자 조회: ${userId}`);
    try {
      const result = await db.query(
        'SELECT * FROM "aiagent_schema"."user" WHERE user_id = $1',
        [userId]
      );
      
      console.log('사용자 조회 결과:', result.rows.length ? '사용자 찾음' : '사용자 없음');
      
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error(`ID ${userId}로 사용자 조회 오류:`, error);
      throw error;
    }
  }
};

module.exports = User;
