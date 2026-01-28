const db = require('../config/db');

// 대화 목록 조회 (페이지네이션, 필터링 적용)
const getConversations = async (page, limit, filters) => {
  try {
    const offset = (page - 1) * limit;
    let values = [limit, offset];
    let paramCounter = 3; // 시작 파라미터 인덱스
    
    // 기본 WHERE 절 (삭제 여부)
    let whereClause = '';
    if (filters.is_deleted === 'true') {
      whereClause = 'a.is_deleted = true';
    } else {
      whereClause = 'a.is_deleted = false';
    }
    
    // 권한별 필터링 추가
    if (filters.adminRole === '5' && filters.userId) {
      // 권한 5 (일반위원): 본인의 대화만 조회
      whereClause += ` AND u.user_id = $${paramCounter}`;
      values.push(filters.userId);
      paramCounter++;
    } else if (filters.adminRole === '3' && filters.userId) {
      // 권한 3 (본부장): 같은 부서의 대화만 조회
      whereClause += ` AND u.dept = (
        SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramCounter}
      )`;
      values.push(filters.userId);
      paramCounter++;
    } else if (filters.adminRole === '4' && filters.userId) {
      // 권한 4 (사업부장): 같은 부서의 대화만 조회
      whereClause += ` AND u.dept = (
        SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramCounter}
      )`;
      values.push(filters.userId);
      paramCounter++;
    }
    // 권한 0, 1, 2는 모든 대화 조회 가능 (추가 필터링 없음)
    
    // 기존 필터링 조건 추가
    if (filters.userName) {
      whereClause += ` AND u.name ILIKE $${paramCounter}`;
      values.push(`%${filters.userName}%`);
      paramCounter++;
    }
    
    if (filters.department) {
      whereClause += ` AND u.dept = $${paramCounter}`;
      values.push(filters.department);
      paramCounter++;
    }
    
    if (filters.category) {
      whereClause += ` AND ad.category = $${paramCounter}`;
      values.push(filters.category);
      paramCounter++;
    }
    
    // 메인 쿼리 - 세 테이블을 JOIN
    const query = `
      SELECT 
        a.id AS "id",
        a.archive_id AS "archiveId",
        a.archive_name AS "roomTitle",
        ad.category AS "category",
        ad.message AS "lastMessage",
        ad.chat_time AS "lastMessageTime",
        u.dept AS "department", 
        u.name AS "userName"
      FROM 
        aiagent_schema.archive a
      LEFT JOIN 
        aiagent_schema.archive_detail ad ON a.archive_id = ad.archive_id
      LEFT JOIN 
        aiagent_schema.user u ON a.user_id = u.user_id
      WHERE 
        ${whereClause}
        AND (ad.is_csr = false OR ad.is_csr IS NULL)
        AND ad.chat_time = (
          SELECT MAX(chat_time)
          FROM aiagent_schema.archive_detail
          WHERE archive_id = a.archive_id
            AND (is_csr = false OR is_csr IS NULL)
        )
      ORDER BY 
        ad.chat_time DESC
      LIMIT $1 OFFSET $2
    `;
    
    // 총 항목 수 조회를 위한 쿼리 (카운트용 파라미터 인덱스 재조정)
    let countWhereClause = '';
    let countValues = [];
    let countParamIndex = 1;
    
    // 카운트 쿼리를 위한 WHERE 절 재구성
    if (filters.is_deleted === 'true') {
      countWhereClause = 'a.is_deleted = true';
    } else {
      countWhereClause = 'a.is_deleted = false';
    }
    
    // 권한별 필터링 추가 (카운트 쿼리용)
    if (filters.adminRole === '5' && filters.userId) {
      // 권한 5 (일반위원): 본인의 대화만 조회
      countWhereClause += ` AND u.user_id = $${countParamIndex}`;
      countValues.push(filters.userId);
      countParamIndex++;
    } else if (filters.adminRole === '3' && filters.userId) {
      // 권한 3 (본부장): 같은 부서의 대화만 조회
      countWhereClause += ` AND u.dept = (
        SELECT dept FROM aiagent_schema.user WHERE user_id = $${countParamIndex}
      )`;
      countValues.push(filters.userId);
      countParamIndex++;
    } else if (filters.adminRole === '4' && filters.userId) {
      // 권한 4 (사업부장): 같은 부서의 대화만 조회
      countWhereClause += ` AND u.dept = (
        SELECT dept FROM aiagent_schema.user WHERE user_id = $${countParamIndex}
      )`;
      countValues.push(filters.userId);
      countParamIndex++;
    }
    // 권한 0, 1, 2는 모든 대화 조회 가능 (추가 필터링 없음)
    
    // 필터링 조건 추가 (인덱스 재조정)
    if (filters.userName) {
      countWhereClause += ` AND u.name ILIKE $${countParamIndex}`;
      countValues.push(`%${filters.userName}%`);
      countParamIndex++;
    }
    
    if (filters.department) {
      countWhereClause += ` AND u.dept = $${countParamIndex}`;
      countValues.push(filters.department);
      countParamIndex++;
    }
    
    if (filters.category) {
      countWhereClause += ` AND ad.category = $${countParamIndex}`;
      countValues.push(filters.category);
      countParamIndex++;
    }
    
    const countQuery = `
      SELECT COUNT(DISTINCT a.id) 
      FROM 
        aiagent_schema.archive a
      LEFT JOIN 
        aiagent_schema.archive_detail ad ON a.archive_id = ad.archive_id
      LEFT JOIN 
        aiagent_schema.user u ON a.user_id = u.user_id
      WHERE ${countWhereClause}
        AND (ad.is_csr = false OR ad.is_csr IS NULL)
    `;
    
    // 쿼리 실행
    const result = await db.query(query, values);
    const countResult = await db.query(countQuery, countValues);
    
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);
    
    return {
      conversations: result.rows,
      totalItems,
      totalPages,
      currentPage: page
    };
  } catch (error) {
    console.error('대화 목록 조회 실패:', error);
    throw error;
  }
};

// 대화 상세 정보 조회
const getConversationById = async (id, adminRole = '0', userId = null) => {
  try {
    let whereClause = 'a.id = $1';
    let values = [id];
    let paramCounter = 2;
    
    // 권한별 필터링 추가
    if (adminRole === '5' && userId) {
      // 권한 5 (일반위원): 본인의 대화만 조회
      whereClause += ` AND u.user_id = $${paramCounter}`;
      values.push(userId);
      paramCounter++;
    } else if (adminRole === '3' && userId) {
      // 권한 3 (본부장): 같은 부서의 대화만 조회
      whereClause += ` AND u.dept = (
        SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramCounter}
      )`;
      values.push(userId);
      paramCounter++;
    } else if (adminRole === '4' && userId) {
      // 권한 4 (사업부장): 같은 부서의 대화만 조회
      whereClause += ` AND u.dept = (
        SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramCounter}
      )`;
      values.push(userId);
      paramCounter++;
    }
    // 권한 0, 1, 2는 모든 대화 조회 가능 (추가 필터링 없음)
    
    const query = `
      SELECT 
        a.id AS "id",
        a.archive_id AS "archiveId",
        a.archive_name AS "roomTitle",
        ad.category AS "category",
        ad.message AS "lastMessage",
        ad.chat_time AS "lastMessageTime",
        u.dept AS "department", 
        u.name AS "userName",
        a.is_deleted AS "isDeleted"
      FROM 
        aiagent_schema.archive a
      LEFT JOIN 
        aiagent_schema.archive_detail ad ON a.archive_id = ad.archive_id
      LEFT JOIN 
        aiagent_schema.user u ON a.user_id = u.user_id
      WHERE 
        ${whereClause}
        AND (ad.is_csr = false OR ad.is_csr IS NULL)
      ORDER BY 
        ad.chat_time DESC
      LIMIT 1
    `;
    
    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('대화 상세 정보 조회 실패:', error);
    throw error;
  }
};

// 대화 내역 조회
const getConversationMessages = async (archiveId, showDeleted = false, adminRole = '0', userId = null) => {
  try {
    let whereClause = 'ad.archive_id = $1';
    let values = [archiveId];
    let paramCounter = 2;
    
    // 삭제된 메시지 표시 여부 (showDeleted가 true이면 삭제된 메시지도 표시)
    if (!showDeleted) {
      whereClause += ' AND ad.is_deleted = false';
    }
    
    // CSR 관련 메시지 제외
    whereClause += ' AND (ad.is_csr = false OR ad.is_csr IS NULL)';
    
    // 권한별 필터링 추가
    if (adminRole === '5' && userId) {
      // 권한 5 (일반위원): 본인의 대화만 조회
      whereClause += ` AND a.user_id = $${paramCounter}`;
      values.push(userId);
      paramCounter++;
    } else if (adminRole === '3' && userId) {
      // 권한 3 (본부장): 같은 부서의 대화만 조회
      whereClause += ` AND a.user_id IN (
        SELECT user_id FROM aiagent_schema.user WHERE dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramCounter}
        )
      )`;
      values.push(userId);
      paramCounter++;
    } else if (adminRole === '4' && userId) {
      // 권한 4 (사업부장): 같은 부서의 대화만 조회
      whereClause += ` AND a.user_id IN (
        SELECT user_id FROM aiagent_schema.user WHERE dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramCounter}
        )
      )`;
      values.push(userId);
      paramCounter++;
    }
    // 권한 0, 1, 2는 모든 대화 조회 가능 (추가 필터링 없음)
    
    const query = `
      SELECT 
        ad.chat_id AS "chatId",
        ad.archive_id AS "archiveId",
        ad.message,
        ad.role,
        ad.chat_time AS "chatTime",
        ad.category,
        ad.is_deleted AS "isDeleted"
      FROM 
        aiagent_schema.archive_detail ad
      INNER JOIN 
        aiagent_schema.archive a ON ad.archive_id = a.archive_id
      WHERE 
        ${whereClause}
      ORDER BY 
        ad.chat_id ASC
    `;
    
    const result = await db.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('대화 내역 조회 실패:', error);
    throw error;
  }
};

module.exports = {
  getConversations,
  getConversationById,
  getConversationMessages
};
