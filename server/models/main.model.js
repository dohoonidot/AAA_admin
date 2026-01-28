const db = require('../config/db');

const MainModel = {
  // 총 사용자 수 조회 (aiagent_schema.user와 hr.organization 조인)
  getTotalUsersCount: async (adminRole = '0', department = null) => {
    try {
      console.log('총 사용자 수 조회 시작, role:', adminRole, 'department:', department);
      
      let query = `
        SELECT COUNT(*) as total_count 
        FROM aiagent_schema.user u
        JOIN hr.organization o ON u.user_id = o.email
        WHERE u.dept != 'admin' 
          AND o.is_worked = '재직'
          AND o.dept != '관리자 주소'
      `;
      let params = [];
      
      // role 3, 4인 경우 부서별 필터링
      if ((adminRole === '3' || adminRole === '4') && department) {
        query += ` AND u.dept = $1`;
        params = [department];
        console.log('부서별 필터링 적용:', department);
      }
      
      const result = await db.query(query, params);
      const totalCount = parseInt(result.rows[0].total_count) || 0;
      console.log('총 사용자 수 조회 결과:', totalCount);
      return totalCount;
    } catch (error) {
      console.error('총 사용자 수 조회 오류:', error);
      throw error;
    }
  },

  // 오늘의 대화 수 조회 (aiagent_schema.archive_detail, 오늘 날짜)
  getTodayConversations: async (adminRole = '0', department = null) => {
    try {
      console.log('오늘의 대화 수 조회 시작, role:', adminRole, 'department:', department);
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      let query = `
        SELECT COUNT(*) as today_conversations
        FROM aiagent_schema.archive_detail ad
        JOIN aiagent_schema.user u ON ad.user_id = u.user_id
      `;
      let params = [todayStart, todayEnd];
      
      // role 3, 4인 경우 부서별 필터링 (사용자 테이블과 조인)
      if ((adminRole === '3' || adminRole === '4') && department) {
        query += `
          WHERE ad.chat_time >= $1 AND ad.chat_time < $2 
          AND u.dept = $3
          AND u.dept NOT IN ('admin', 'Biz AI사업부')
          AND ad.message IS NOT NULL
          AND (ad.is_csr = false OR ad.is_csr IS NULL)
        `;
        params.push(department);
        console.log('부서별 대화 필터링 적용:', department);
      } else {
        query += `
          WHERE ad.chat_time >= $1 AND ad.chat_time < $2
          AND u.dept NOT IN ('admin', 'Biz AI사업부')
          AND ad.message IS NOT NULL
          AND (ad.is_csr = false OR ad.is_csr IS NULL)
        `;
      }
      
      const result = await db.query(query, params);
      const todayConversations = parseInt(result.rows[0].today_conversations) || 0;
      console.log('오늘의 대화 수 조회 결과:', todayConversations, '(조회 기간:', todayStart.toISOString(), '~', todayEnd.toISOString(), ')');
      return todayConversations;
    } catch (error) {ㅜㅜ
      console.error('오늘의 대화 수 조회 오류:', error);
      throw error;
    }
  },

  // 활성 사용자 수 조회 (aiagent_schema.login_history, 오늘 날짜에 로그인한 사용자)
  getActiveUsers: async (adminRole = '0', department = null) => {
    try {
      console.log('활성 사용자 수 조회 시작 (오늘 로그인한 사용자), role:', adminRole, 'department:', department);
      
      // 오늘 날짜 범위 설정 (한국 시간 기준)
      const now = new Date(); // 현재 시간
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 오늘 00:00:00
      
      // UTC로 변환 (DB는 UTC로 저장되므로)
      const todayStartUTC = new Date(todayStart.getTime() - (9 * 60 * 60 * 1000));
      const nowUTC = new Date(now.getTime() - (9 * 60 * 60 * 1000)); // 현재 시간을 UTC로 변환
      
      console.log('오늘 시작 (한국 시간):', todayStart.toLocaleString('ko-KR'));
      console.log('현재 시간 (한국 시간):', now.toLocaleString('ko-KR'));
      console.log('오늘 시작 (UTC, DB 비교용):', todayStartUTC.toISOString());
      console.log('현재 시간 (UTC, DB 비교용):', nowUTC.toISOString());
      
      // 디버깅용: 최근 로그인 기록 확인
      const debugQuery = `
        SELECT user_id, login_time, error, 
               login_time + INTERVAL '9 hours' as korea_time
        FROM aiagent_schema.login_history
        ORDER BY login_time DESC
        LIMIT 10
      `;
      
      const debugResult = await db.query(debugQuery);
      console.log('최근 로그인 기록 (최신 10개):');
      debugResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. user_id: ${row.user_id}, UTC: ${row.login_time}, 한국시간: ${row.korea_time}, error: ${row.error}`);
      });
      
      // 오늘 로그인한 활성 사용자 조회 (중복 제거)
      let query = `
        SELECT COUNT(DISTINCT lh.user_id) as active_users
        FROM aiagent_schema.login_history lh
      `;
      let params = [todayStartUTC, nowUTC];
      
      // role 3, 4인 경우 부서별 필터링 (사용자 테이블과 조인)
      if ((adminRole === '3' || adminRole === '4') && department) {
        query += `
          INNER JOIN aiagent_schema.user u ON lh.user_id = u.user_id
          WHERE lh.login_time >= $1 AND lh.login_time < $2
            AND (lh.error IS NULL OR lh.error = '')
            AND u.dept = $3
        `;
        params.push(department);
        console.log('부서별 활성 사용자 필터링 적용:', department);
      } else {
        query += `
          WHERE lh.login_time >= $1 AND lh.login_time < $2
            AND (lh.error IS NULL OR lh.error = '')
        `;
      }
      
      const result = await db.query(query, params);
      const activeUsers = parseInt(result.rows[0].active_users) || 0;
      
      // 추가 디버깅: 오늘 로그인 기록 확인
      const todayDebugQuery = `
        SELECT user_id, login_time, error,
               login_time + INTERVAL '9 hours' as korea_time
        FROM aiagent_schema.login_history
        WHERE login_time >= $1 AND login_time < $2
          AND (error IS NULL OR error = '')
        ORDER BY login_time DESC
      `;
      
      const todayDebugResult = await db.query(todayDebugQuery, [todayStartUTC, nowUTC]);
      console.log(`오늘 로그인 기록 (${todayDebugResult.rows.length}개):`);
      todayDebugResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. user_id: ${row.user_id}, UTC: ${row.login_time}, 한국시간: ${row.korea_time}, error: ${row.error}`);
      });
      
      // 전체 로그인 기록 수 확인 (테스트용)
      const totalLoginQuery = `
        SELECT COUNT(*) as total_logins,
               COUNT(DISTINCT user_id) as unique_users
        FROM aiagent_schema.login_history
        WHERE (error IS NULL OR error = '')
      `;
      
      const totalLoginResult = await db.query(totalLoginQuery);
      console.log('전체 로그인 기록:', totalLoginResult.rows[0]);
      
      console.log('오늘 활성 사용자 수 조회 결과:', activeUsers);
      
      return activeUsers;
    } catch (error) {
      console.error('활성 사용자 수 조회 오류:', error);
      throw error;
    }
  },

  // 최근 관리자 활동 조회 (aiagent_schema.admin_history)
  getRecentAdminActivities: async (adminRole = '0') => {
    try {
      console.log('최근 관리자 활동 조회 시작, 요청자 role:', adminRole);
      
      // role에 따른 필터링 조건 설정
      let roleFilter = '';
      if (adminRole === '1') {
        // role 1: role 2, 3, 4의 모든 활동 조회
        roleFilter = `
          AND ah.user_id IN (
            SELECT user_id FROM aiagent_schema.user 
            WHERE admin_role IN ('2', '3', '4')
          )
        `;
      } else if (adminRole === '2') {
        // role 2: role 3, 4의 활동만 조회
        roleFilter = `
          AND ah.user_id IN (
            SELECT user_id FROM aiagent_schema.user 
            WHERE admin_role IN ('3', '4')
          )
        `;
      } else {
        // 다른 role은 활동 조회 불가
        return [];
      }
      
      const query = `
        SELECT ah.user_id, ah.name, ah.action, ah.error, ah.action_time,
               ah.action_time + INTERVAL '9 hours' as korea_time,
               u.admin_role
        FROM aiagent_schema.admin_history ah
        LEFT JOIN aiagent_schema.user u ON ah.user_id = u.user_id
        WHERE 1=1 ${roleFilter}
        ORDER BY ah.action_time DESC
        LIMIT 10
      `;
      
      const result = await db.query(query);
      const activities = result.rows.map(row => {
        const koreaTime = new Date(row.korea_time);
        const timeAgo = getTimeAgo(koreaTime);
        
        return {
          text: row.action || '활동 내용 없음',
          time: timeAgo,
          user: row.name || row.user_id,
          userRole: row.admin_role,
          hasError: !!row.error
        };
      });
      
      console.log(`최근 관리자 활동 조회 결과 (role ${adminRole}):`, activities.length, '개');
      return activities;
    } catch (error) {
      console.error('최근 관리자 활동 조회 오류:', error);
      throw error;
    }
  },

  // 관리자 대시보드 데이터 전체 조회
  getAdminDashboardData: async (adminRole = '0', userId = null) => {
    try {
      console.log('=== getAdminDashboardData 시작 ===');
      console.log('입력 파라미터 - role:', adminRole, 'userId:', userId);
      
      let department = null;
      
      // role 3, 4인 경우 사용자 부서 정보 조회
      if (adminRole === '3' || adminRole === '4') {
        console.log('role 3 또는 4 감지됨 - 부서 정보 조회 시작');
        
        if (!userId) {
          console.error('userId가 없습니다!');
          throw new Error(`role ${adminRole}은 userId가 필수입니다.`);
        }
        
        try {
          console.log('부서 정보 조회 함수 호출 시작...');
          department = await MainModel.getUserDepartment(userId);
          console.log('부서 정보 조회 완료. 결과:', department);
          
          if (!department) {
            console.error('부서 정보가 null입니다!');
            throw new Error(`사용자 ${userId}의 부서 정보를 찾을 수 없습니다.`);
          }
        } catch (deptError) {
          console.error('부서 정보 조회 중 예외 발생:', deptError);
          throw new Error(`부서 정보 조회 실패: ${deptError.message}`);
        }
      }
      
      console.log('데이터 조회 함수들 호출 시작...');
      
      const [
        totalUsers,
        todayConversations,
        activeUsers,
        recentActivities
      ] = await Promise.all([
        MainModel.getTotalUsersCount(adminRole, department),
        MainModel.getTodayConversations(adminRole, department),
        MainModel.getActiveUsers(adminRole, department),
        MainModel.getRecentAdminActivities(adminRole)
      ]);

      const dashboardData = {
        totalUsers,
        todayConversations,
        activeUsers,
        recentActivities,
        department: department // 디버깅용
      };

      console.log('=== getAdminDashboardData 완료 ===');
      console.log('최종 결과:', dashboardData);
      return dashboardData;
    } catch (error) {
      console.error('=== getAdminDashboardData 에러 ===');
      console.error('에러 메시지:', error.message);
      console.error('에러 스택:', error.stack);
      throw error;
    }
  },

  // 관리자 활동 기록 함수
  recordAdminActivity: async (userId, userName, action, error = null) => {
    return await recordAdminActivity(userId, userName, action, error);
  },

  // 사용자 부서 정보 조회
  getUserDepartment: async (userId) => {
    try {
      console.log('=== getUserDepartment 시작 ===');
      console.log('조회할 userId:', userId, 'type:', typeof userId);
      
      if (!userId) {
        throw new Error('userId가 null 또는 undefined입니다.');
      }
      
      const query = `
        SELECT dept
        FROM aiagent_schema.user
        WHERE user_id = $1
      `;
      
      console.log('실행할 쿼리:', query);
      console.log('쿼리 파라미터:', [userId]);
      
      const result = await db.query(query, [userId]);
      console.log('DB 쿼리 결과:', result.rows);
      console.log('결과 행 수:', result.rows.length);
      
      const department = result.rows[0]?.dept || null;
      console.log('추출된 dept:', department);
      console.log('=== getUserDepartment 완료 ===');
      
      return department;
    } catch (error) {
      console.error('=== getUserDepartment 에러 ===');
      console.error('에러 메시지:', error.message);
      console.error('에러 스택:', error.stack);
      console.error('userId:', userId);
      throw error;
    }
  },

  // CSR 이상내역 조회 (csr.abnormal_master와 csr.csr_master 조인)
  getCSRAbnormalList: async (options = {}) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        filter = 'all',
        adminRole = '1',
        userId = null
      } = options;
      
      console.log('CSR 이상내역 조회 시작:', { page, limit, filter, adminRole, userId });
      
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      let params = [];
      let paramIndex = 1;
      
      // 날짜 필터 적용
      if (filter === 'today') {
        whereClause += ` AND DATE(am.detect_date) = CURRENT_DATE`;
      } else if (filter === 'week') {
        whereClause += ` AND am.detect_date >= NOW() - INTERVAL '7 days'`;
      } else if (filter === 'month') {
        whereClause += ` AND am.detect_date >= NOW() - INTERVAL '30 days'`;
      }
      
      // 권한별 필터링
      if (adminRole === '5' && userId) {
        // 일반 위원은 본인 관련 CSR만 조회 (담당자 이름으로 필터링)
        whereClause += ` AND am.csm_nm = (
          SELECT name FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      } else if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장은 해당 부서 관련 CSR만 조회
        whereClause += ` AND am.csm_nm IN (
          SELECT name FROM aiagent_schema.user 
          WHERE dept = (
            SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
          )
        )`;
        params.push(userId);
      }
      
      // 전체 개수 조회
      const countQuery = `
        SELECT COUNT(*) as total
        FROM csr.abnormal_master am
        LEFT JOIN csr.csr_master cm ON am.csr_id = cm.csr_id
        ${whereClause}
      `;
      
      console.log('카운트 쿼리:', countQuery);
      console.log('카운트 파라미터:', params);
      
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);
      
      console.log('총 이상내역 개수:', total);
      
      // 데이터 조회 (최신 순으로 정렬)
      const dataQuery = `
        SELECT 
          am.csr_id,
          am.csm_nm,
          am.proc_user_name,
          am.abnormal_type,
          am.req_title,
          am.abnormal_detail,
          am.detect_date,
          COALESCE(cm.next_status, '처리중') as next_status
        FROM csr.abnormal_master am
        LEFT JOIN csr.csr_master cm ON am.csr_id = cm.csr_id
        ${whereClause}
        ORDER BY am.detect_date DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      params.push(limit, offset);
      
      console.log('데이터 쿼리:', dataQuery);
      console.log('데이터 파라미터:', params);
      
      const dataResult = await db.query(dataQuery, params);
      
      // 번호를 최신이 가장 큰 수가 되도록 계산
      const abnormalList = dataResult.rows.map((row, index) => ({
        ...row,
        display_number: total - offset - index // 최신 데이터가 가장 큰 번호
      }));
      
      console.log('조회된 이상내역 수:', abnormalList.length);
      
      return {
        abnormalList,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        limit: parseInt(limit)
      };
      
    } catch (error) {
      console.error('CSR 이상내역 조회 오류:', error);
      throw error;
    }
  },

  // CSR 상세 정보 조회 (csr.csr_master와 csr.csr_master_new 조인)
  getCSRDetailById: async (csrId, adminRole = '0', userId = null) => {
    try {
      console.log('CSR 상세 정보 조회 시작:', { csrId, adminRole, userId });
      
      if (!csrId) {
        throw new Error('CSR ID가 필요합니다.');
      }
      
      // 권한별 접근 제어를 위한 WHERE 절 구성
      let accessCondition = '';
      let params = [csrId];
      let paramIndex = 2;
      
      if (adminRole === '5' && userId) {
        // 일반 위원: 본인이 담당하는 CSR만 조회 가능
        accessCondition = ` AND EXISTS (
          SELECT 1 FROM aiagent_schema.user u 
          WHERE u.user_id = $${paramIndex++} 
          AND (cm.req_user_name = u.name OR cmn.req_user_name = u.name)
        )`;
        params.push(userId);
      } else if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 관련 CSR만 조회 가능
        accessCondition = ` AND EXISTS (
          SELECT 1 FROM aiagent_schema.user u1, aiagent_schema.user u2
          WHERE u1.user_id = $${paramIndex++}
          AND u2.dept = u1.dept
          AND (cm.req_user_name = u2.name OR cmn.req_user_name = u2.name)
        )`;
        params.push(userId);
      }
      
             // CSR 상세 정보 조회 쿼리 (csr_master와 csr_master_new 조인)
       const query = `
         SELECT 
           COALESCE(cm.csr_id, cmn.csr_id) as csr_id,
           COALESCE(cm.req_title, cmn.req_title) as req_title,
           COALESCE(cm.req_user_name, cmn.req_user_name) as req_user_name,
           COALESCE(cm.company_name, cmn.company_name) as company_name,
           COALESCE(cm.reg_date, cmn.reg_date) as reg_date,
           COALESCE(cm.comp_hope_date, cmn.comp_hope_date) as comp_hope_date,
           COALESCE(cm.comp_date, cmn.comp_date) as comp_date,
           COALESCE(cm.div_name, cmn.div_name) as div_name,
           COALESCE(cm.req_content, cmn.req_content) as req_content,
           COALESCE(cm.next_status, cmn.next_status, 'PROCESS') as next_status,
           COALESCE(cm.csm_nm, cmn.csm_nm) as csm_nm,
           COALESCE(cm.proc_user_name, cmn.proc_user_name) as proc_user_name,
           COALESCE(cm.dept, cmn.dept) as dept,
           COALESCE(cm.depth1, cmn.depth1) as depth1,
           COALESCE(cm.depth2, cmn.depth2) as depth2,
           COALESCE(cm.plan_content, cmn.plan_content) as plan_content
         FROM csr.csr_master cm
         FULL OUTER JOIN csr.csr_master_new cmn ON cm.csr_id = cmn.csr_id
         WHERE (cm.csr_id = $1 OR cmn.csr_id = $1)
         ${accessCondition}
       `;
      
      console.log('CSR 상세정보 쿼리:', query);
      console.log('쿼리 파라미터:', params);
      
      const result = await db.query(query, params);
      
      if (result.rows.length === 0) {
        console.log('CSR 정보를 찾을 수 없음 - csrId:', csrId);
        throw new Error('해당 CSR 정보를 찾을 수 없거나 접근 권한이 없습니다.');
      }
      
             const csrDetail = result.rows[0];
       console.log('조회된 CSR 상세정보:', csrDetail);
       
       // 3번 컨테이너: 이상 탐지 내역 조회
       const abnormalQuery = `
         SELECT 
           abnormal_detail,
           detect_date
         FROM csr.abnormal_master
         WHERE csr_id = $1
         ORDER BY detect_date DESC
       `;
       
       console.log('이상 탐지 내역 쿼리:', abnormalQuery);
       
       const abnormalResult = await db.query(abnormalQuery, [csrId]);
       const abnormalList = abnormalResult.rows || [];
       
       console.log('조회된 이상 탐지 내역:', abnormalList);
       
       return {
         success: true,
         data: {
           ...csrDetail,
           abnormalList: abnormalList
         }
       };
      
    } catch (error) {
      console.error('CSR 상세 정보 조회 오류:', error);
      throw error;
    }
  },

  // CSR 이상내역 개수 조회 (미처리 건수)
  getCSRAbnormalCount: async (adminRole = '0', userId = null) => {
    try {
      console.log('CSR 이상내역 개수 조회:', { adminRole, userId });
      
      let whereClause = 'WHERE 1=1';
      let params = [];
      let paramIndex = 1;
      
      // 권한별 필터링
      if (adminRole === '5' && userId) {
        whereClause += ` AND am.csm_nm = (
          SELECT name FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      } else if (['3', '4'].includes(adminRole) && userId) {
        whereClause += ` AND am.csm_nm IN (
          SELECT name FROM aiagent_schema.user 
          WHERE dept = (
            SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
          )
        )`;
        params.push(userId);
      }
      
      // 미처리 상태만 카운트 (next_status가 '완료'가 아닌 경우)
      whereClause += ` AND (cm.next_status IS NULL OR cm.next_status != '완료')`;
      
      const query = `
        SELECT COUNT(*) as count
        FROM csr.abnormal_master am
        LEFT JOIN csr.csr_master cm ON am.csr_id = cm.csr_id
        ${whereClause}
      `;
      
      console.log('개수 조회 쿼리:', query);
      console.log('개수 조회 파라미터:', params);
      
      const result = await db.query(query, params);
      const count = parseInt(result.rows[0].count) || 0;
      
      console.log('미처리 이상내역 개수:', count);
      
      return count;
      
    } catch (error) {
      console.error('CSR 이상내역 개수 조회 오류:', error);
      throw error;
    }
  },

  // AAA 미사용자 목록 조회 (archive_detail에 대화 기록이 없고 재직 중인 사용자)
  getUnusedUsersList: async ({ page = 1, limit = 30, days = 30, adminRole = '0', userId = null, deptFilter = null }) => {
    try {
      console.log('AAA 미사용자 목록 조회 시작:', { page, limit, days, adminRole, userId, deptFilter });
      console.log('판단 기준: archive_detail 테이블에 대화 기록이 없고 재직 중인 사용자');
      
      // 권한별 필터링 조건
      let roleFilter = '';
      let params = [];
      let paramIndex = 1;
      
      if (adminRole === '5' && userId) {
        // 일반위원: 자신의 데이터만 조회
        roleFilter = ` AND u.user_id = $${paramIndex++}`;
        params.push(userId);
      } else if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 사용자만 조회
        roleFilter = ` AND u.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }
      
      // 부서 필터링 조건 추가
      let specificDeptFilter = '';
      if (deptFilter && deptFilter !== '전체') {
        specificDeptFilter = ` AND u.dept = $${paramIndex++}`;
        params.push(deptFilter);
      }
      
      // 페이지네이션을 위한 OFFSET 계산
      const offset = (page - 1) * limit;
      
      // 미사용자 목록 조회 쿼리 (hr.view_hr과 조인하여 재직자만 필터링)
      const query = `
        SELECT 
          numbered_users.user_id,
          numbered_users.name,
          numbered_users.dept,
          numbered_users.last_chat_date,
          numbered_users.inactive_days,
          numbered_users.row_num as display_number
        FROM (
          SELECT 
            u.user_id,
            u.name,
            u.dept,
            ad.last_chat_date,
            CASE 
              WHEN ad.last_chat_date IS NULL THEN '대화 기록 없음'
              ELSE '대화 기록 있음'
            END as inactive_days,
            ROW_NUMBER() OVER (ORDER BY u.user_id) as row_num
          FROM aiagent_schema.user u
          INNER JOIN hr.view_hr hr ON u.user_id = hr.email
          LEFT JOIN (
            SELECT 
              user_id, 
              MAX(chat_time) as last_chat_date
            FROM aiagent_schema.archive_detail
            WHERE role = 0
              AND (is_csr = false OR is_csr IS NULL)
            GROUP BY user_id
          ) ad ON u.user_id = ad.user_id
          WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
            AND ad.last_chat_date IS NULL
            AND hr.is_worked = '재직'
            ${roleFilter}
            ${specificDeptFilter}
        ) numbered_users
        ORDER BY numbered_users.row_num
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      params.push(limit, offset);
      
      console.log('미사용자 목록 쿼리:', query);
      console.log('쿼리 파라미터:', params);
      
      const result = await db.query(query, params);
      
      // 전체 개수 조회 (같은 조건)
      const countQuery = `
        SELECT COUNT(*) as total
        FROM aiagent_schema.user u
        INNER JOIN hr.view_hr hr ON u.user_id = hr.email
        LEFT JOIN (
          SELECT 
            user_id, 
            MAX(chat_time) as last_chat_date
          FROM aiagent_schema.archive_detail
          WHERE role = 0
            AND (is_csr = false OR is_csr IS NULL)
          GROUP BY user_id
        ) ad ON u.user_id = ad.user_id
        WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
          AND ad.last_chat_date IS NULL
          AND hr.is_worked = '재직'
          ${roleFilter}
          ${specificDeptFilter}
      `;
      
      const countParams = [];
      if (['3', '4'].includes(adminRole) && userId) {
        countParams.push(userId);
      }
      if (deptFilter && deptFilter !== '전체') {
        countParams.push(deptFilter);
      }
      
      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total) || 0;
      
      console.log('미사용자 목록 조회 결과:', result.rows.length, '개');
      console.log('전체 미사용자 수:', total, '명', deptFilter ? `(부서: ${deptFilter})` : '');
      
      return {
        success: true,
        unusedUsers: result.rows,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        limit: parseInt(limit),
        deptFilter: deptFilter || '전체'
      };
      
    } catch (error) {
      console.error('AAA 미사용자 목록 조회 오류:', error);
      throw error;
    }
  },

  // AAA 미사용자 개수 조회 (archive_detail에 대화 기록이 없고 재직 중인 사용자 수)
  getUnusedUsersCount: async (days = 30, adminRole = '0', userId = null) => {
    try {
      console.log('AAA 미사용자 개수 조회 시작:', { days, adminRole, userId });
      console.log('판단 기준: archive_detail 테이블에 대화 기록이 없고 재직 중인 사용자');
      
      // 권한별 필터링 조건
      let deptFilter = '';
      let params = [];
      let paramIndex = 1;
      
      if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 사용자만 조회
        deptFilter = ` AND u.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }
      
      // 미사용자 개수 조회 쿼리 (hr.view_hr과 조인하여 재직자만 필터링)
      const query = `
        SELECT COUNT(*) as count
        FROM aiagent_schema.user u
        INNER JOIN hr.view_hr hr ON u.user_id = hr.email
        LEFT JOIN (
          SELECT 
            user_id, 
            MAX(chat_time) as last_chat_date
          FROM aiagent_schema.archive_detail
          WHERE role = 0
            AND (is_csr = false OR is_csr IS NULL)
          GROUP BY user_id
        ) ad ON u.user_id = ad.user_id
        WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
          AND ad.last_chat_date IS NULL
          AND hr.is_worked = '재직'
          ${deptFilter}
      `;
      
      console.log('미사용자 개수 쿼리:', query);
      console.log('쿼리 파라미터:', params);
      
      const result = await db.query(query, params);
      const count = parseInt(result.rows[0].count) || 0;
      
      console.log('AAA 미사용자 수:', count, '명 (대화 기록 없고 재직 중)');
      
      return count;
      
    } catch (error) {
      console.error('AAA 미사용자 개수 조회 오류:', error);
      throw error;
    }
  },

  // AAA 미사용자가 있는 부서 목록 조회
  getUnusedUsersDepartments: async (adminRole = '0', userId = null) => {
    try {
      console.log('미사용자 부서 목록 조회 시작:', { adminRole, userId });
      
      // 권한별 필터링 조건
      let roleFilter = '';
      let params = [];
      let paramIndex = 1;
      
      if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 사용자만 조회
        roleFilter = ` AND u.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }
      
      // 미사용자가 있는 부서 목록 조회
      const query = `
        SELECT DISTINCT u.dept
        FROM aiagent_schema.user u
        LEFT JOIN (
          SELECT 
            user_id, 
            MAX(chat_time) as last_chat_date
          FROM aiagent_schema.archive_detail
          WHERE role = 0
            AND (is_csr = false OR is_csr IS NULL)
          GROUP BY user_id
        ) ad ON u.user_id = ad.user_id
        WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
          AND ad.last_chat_date IS NULL
          ${roleFilter}
        ORDER BY u.dept
      `;
      
      console.log('부서 목록 쿼리:', query);
      console.log('쿼리 파라미터:', params);
      
      const result = await db.query(query, params);
      const departments = result.rows.map(row => row.dept).filter(dept => dept);
      
      console.log('미사용자가 있는 부서 목록:', departments);
      
      return departments;
      
    } catch (error) {
      console.error('미사용자 부서 목록 조회 오류:', error);
      throw error;
    }
  },

  // 사용자 앱 버전 내역 조회 (모든 사용자 표시)
  getAppVersionList: async ({ page = 1, limit = 30, adminRole = '0', userId = null, versionFilter = null, deptFilter = null, consentFilter = null }) => {
    try {
      console.log('사용자 앱 버전 내역 조회 시작:', { page, limit, adminRole, userId, versionFilter, deptFilter });
      console.log('조회 기준: 모든 사용자 표시 (로그인 기록이 있는 사용자는 최신 version_info, 없는 사용자는 1.1.0)');
      
      // 권한별 필터링 조건
      let roleFilter = '';
      let versionWhereClause = '';
      let deptWhereClause = '';
      let consentWhereClause = '';
      let params = [];
      let paramIndex = 1;
      
      if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 사용자만 조회
        roleFilter = ` AND u.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }

      // 버전 필터링 조건
      if (versionFilter && versionFilter !== '전체') {
        versionWhereClause = ` AND ll.version_info = '${versionFilter}'`;
      }

      // 부서 필터링 조건
      if (deptFilter && deptFilter !== '전체') {
        deptWhereClause = ` AND u.dept = $${paramIndex++}`;
        params.push(deptFilter);
        console.log('부서 필터 조건 추가됨:', deptFilter, 'paramIndex:', paramIndex-1);
      } else {
        console.log('부서 필터 없음 또는 전체 선택됨:', deptFilter);
      }

      // 개인정보 동의 필터링 조건
      if (consentFilter !== null && consentFilter !== '전체' && consentFilter !== '') {
        consentWhereClause = ` AND u.is_agreed = $${paramIndex++}`;
        params.push(parseInt(consentFilter));
        console.log('개인정보 동의 필터 조건 추가됨:', consentFilter, 'paramIndex:', paramIndex-1);
      } else {
        console.log('개인정보 동의 필터 없음 또는 전체 선택됨:', consentFilter);
      }
      
      // 페이지네이션을 위한 OFFSET 계산
      const offset = (page - 1) * limit;
      
      // 모든 사용자 조회 (로그인 기록이 있으면 최신 version_info, 없으면 1.1.0)
      const query = `
        WITH latest_login AS (
          SELECT 
            lh.user_id,
            lh.version_info,
            lh.login_time,
            ROW_NUMBER() OVER (PARTITION BY lh.user_id ORDER BY lh.login_time DESC) as rn
          FROM aiagent_schema.login_history lh
          WHERE lh.version_info IS NOT NULL
            AND lh.version_info != ''
            AND lh.error IS NULL 
        ),
        numbered_users AS (
          SELECT 
            u.user_id,
            u.name,
            u.dept,
            u.is_agreed,
            COALESCE(ll.version_info, '1.1.0') as version_info,
            ROW_NUMBER() OVER (ORDER BY u.user_id) as row_num
          FROM aiagent_schema.user u
          JOIN hr.organization o ON u.user_id = o.email
          LEFT JOIN latest_login ll ON u.user_id = ll.user_id AND ll.rn = 1
          WHERE u.dept NOT IN ('admin')
            AND o.is_worked = '재직'
            AND o.dept != '관리자 주소'
            ${roleFilter}
            ${versionWhereClause}
            ${deptWhereClause}
            ${consentWhereClause}
        )
        SELECT 
          user_id,
          name,
          dept,
          is_agreed,
          version_info,
          row_num as display_number
        FROM numbered_users
        ORDER BY row_num
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      params.push(limit, offset);
      
      console.log('=== 앱 버전 목록 쿼리 실행 ===');
      console.log('쿼리:', query);
      console.log('파라미터:', params);
      console.log('적용된 필터:');
      console.log('  - roleFilter:', roleFilter);
      console.log('  - versionWhereClause:', versionWhereClause);
      console.log('  - deptWhereClause:', deptWhereClause);
      console.log('  - consentWhereClause:', consentWhereClause);
      
      const result = await db.query(query, params);
      console.log('쿼리 결과 행 수:', result.rows.length);
      
      // 전체 개수 조회 (같은 조건)
      const countQuery = `
        WITH latest_login AS (
          SELECT 
            lh.user_id,
            lh.version_info,
            lh.login_time,
            ROW_NUMBER() OVER (PARTITION BY lh.user_id ORDER BY lh.login_time DESC) as rn
          FROM aiagent_schema.login_history lh
          WHERE lh.version_info IS NOT NULL
            AND lh.version_info != ''
            AND lh.error IS NULL 
        )
        SELECT COUNT(*) as total
        FROM aiagent_schema.user u
        JOIN hr.organization o ON u.user_id = o.email
        LEFT JOIN latest_login ll ON u.user_id = ll.user_id AND ll.rn = 1
        WHERE u.dept NOT IN ('admin')
          AND o.is_worked = '재직'
          AND o.dept != '관리자 주소'
          ${roleFilter}
          ${versionWhereClause}
          ${deptWhereClause}
          ${consentWhereClause}
      `;
      
      const countParams = [];
      if (['3', '4'].includes(adminRole) && userId) {
        countParams.push(userId);
      }
      if (deptFilter && deptFilter !== '전체') {
        countParams.push(deptFilter);
      }
      if (consentFilter !== null && consentFilter !== '전체' && consentFilter !== '') {
        countParams.push(parseInt(consentFilter));
      }
      
      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total) || 0;

      // 부서 목록 조회 (첫 페이지일 때만)
      let departmentList = null;
      if (page === 1) {
        try {
          let deptQuery = `
            SELECT DISTINCT u.dept
            FROM aiagent_schema.user u
            JOIN hr.organization o ON u.user_id = o.email
            WHERE u.dept NOT IN ('admin')
              AND u.dept IS NOT NULL
              AND u.dept != ''
              AND o.is_worked = '재직'
              AND o.dept != '관리자 주소'
          `;
          
          let deptParams = [];
          let deptParamIndex = 1;
          
          // 권한별 부서 필터링
          if (['3', '4'].includes(adminRole) && userId) {
            deptQuery += ` AND u.dept = (
              SELECT dept FROM aiagent_schema.user WHERE user_id = $${deptParamIndex++}
            )`;
            deptParams.push(userId);
          }
          
          deptQuery += ` ORDER BY u.dept`;
          
          const deptResult = await db.query(deptQuery, deptParams);
          departmentList = deptResult.rows.map(row => row.dept).filter(dept => dept);
          
          console.log('조회된 부서 목록:', departmentList);
        } catch (deptError) {
          console.error('부서 목록 조회 오류:', deptError);
        }
      }
      
      console.log('앱 버전 목록 조회 결과:', result.rows.length, '개');
      console.log('전체 사용자 수:', total, '명');
      
      const response = {
        success: true,
        versionList: result.rows,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        limit: parseInt(limit)
      };

      if (departmentList) {
        response.departmentList = departmentList;
      }

      return response;
      
    } catch (error) {
      console.error('사용자 앱 버전 내역 조회 오류:', error);
      throw error;
    }
  },

  // 사용자 앱 버전 요약 정보 조회 (모든 사용자 포함)
  getAppVersionSummary: async (adminRole = '0', userId = null) => {
    try {
      console.log('사용자 앱 버전 요약 정보 조회 시작:', { adminRole, userId });
      console.log('조회 기준: 모든 사용자 포함 (로그인 기록이 있는 사용자는 최신 version_info, 없는 사용자는 1.1.0)');
      
      // 권한별 필터링 조건
      let roleFilter = '';
      let params = [];
      let paramIndex = 1;
      
      if (adminRole === '5' && userId) {
        // 일반위원: 자신의 데이터만 조회
        roleFilter = ` AND u.user_id = $${paramIndex++}`;
        params.push(userId);
      } else if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 사용자만 조회
        roleFilter = ` AND u.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }
      
      // 버전별 사용자 수 조회 (모든 사용자 포함)
      const query = `
        WITH latest_login AS (
          SELECT 
            lh.user_id,
            lh.version_info,
            lh.login_time,
            ROW_NUMBER() OVER (PARTITION BY lh.user_id ORDER BY lh.login_time DESC) as rn
          FROM aiagent_schema.login_history lh
          WHERE lh.version_info IS NOT NULL
            AND lh.version_info != ''
            AND lh.error IS NULL 
        )
        SELECT
          SUM(CASE WHEN ll.version_info = '1.3.1' THEN 1 ELSE 0 END) as v131_count,
          SUM(CASE WHEN ll.version_info = '1.3.0' THEN 1 ELSE 0 END) as v130_count,
          SUM(CASE WHEN ll.version_info = '1.2.1' THEN 1 ELSE 0 END) as v121_count,
          SUM(CASE WHEN ll.version_info = '1.2.0' THEN 1 ELSE 0 END) as v120_count,
          SUM(CASE WHEN ll.version_info = '1.1.0' OR ll.version_info IS NULL THEN 1 ELSE 0 END) as v110_count,
          COUNT(*) as total_count
        FROM aiagent_schema.user u
        JOIN hr.organization o ON u.user_id = o.email
        LEFT JOIN latest_login ll ON u.user_id = ll.user_id AND ll.rn = 1
        WHERE u.dept NOT IN ('admin')
          AND o.is_worked = '재직'
          AND o.dept != '관리자 주소'
          ${roleFilter}
      `;

      console.log('앱 버전 요약 쿼리:', query);
      console.log('쿼리 파라미터:', params);

      const result = await db.query(query, params);
      const summary = result.rows[0];

      const summaryData = {
        v131_count: parseInt(summary.v131_count) || 0,
        v130_count: parseInt(summary.v130_count) || 0,
        v121_count: parseInt(summary.v121_count) || 0,
        v120_count: parseInt(summary.v120_count) || 0,
        v110_count: parseInt(summary.v110_count) || 0,
        total_count: parseInt(summary.total_count) || 0
      };
      
      console.log('앱 버전 요약 조회 결과:', summaryData);
      
      return summaryData;
      
    } catch (error) {
      console.error('사용자 앱 버전 요약 조회 오류:', error);
      throw error;
    }
  },

  // 월별 생일자 인원수 조회 (hr.organization + hr.employee_info + aiagent_schema.user 조인)
  getBirthdayCountByMonth: async (adminRole = '0', userId = null, deptFilter = null, consentFilter = null, seniorEmployeeFilter = null) => {
    try {
      console.log('월별 생일자 인원수 조회 시작:', { adminRole, userId, deptFilter, consentFilter, seniorEmployeeFilter });
      
      // 권한별 필터링 조건
      let roleFilter = '';
      let consentWhereClause = '';
      let deptWhereClause = '';
      let seniorEmployeeWhereClause = '';
      let params = [];
      let paramIndex = 1;
      
      if (['3', '4'].includes(adminRole) && userId) {
        roleFilter = ` AND o.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }

      if (consentFilter !== null && consentFilter !== '전체' && consentFilter !== '') {
        consentWhereClause = ` AND u.is_agreed = $${paramIndex++}`;
        params.push(parseInt(consentFilter));
      }

      if (deptFilter && deptFilter !== '전체') {
        deptWhereClause = ` AND o.dept = $${paramIndex++}`;
        params.push(deptFilter);
      }
      
      // 3개월 이상 근무자 필터링 조건 (입사일 기준)
      if (seniorEmployeeFilter === 'true') {
        seniorEmployeeWhereClause = ` AND ei.join_date <= NOW() - INTERVAL '3 months'`;
        console.log('3개월 이상 근무자 필터 조건 추가됨 (입사 3개월 미만 제외)');
      }
      
      const query = `
        SELECT 
          EXTRACT(MONTH FROM ei.birthday) as birth_month,
          COUNT(*) as count
        FROM hr.organization o
        LEFT JOIN hr.employee_info ei ON REPLACE(o.phone_num, '-', '') = REPLACE(ei.phone, '-', '')
        LEFT JOIN aiagent_schema.user u ON o.email = u.user_id
        WHERE o.is_worked = '재직'
          AND o.dept NOT IN ('TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin')
          AND o.name IS NOT NULL
          AND o.name != ''
          AND ei.birthday IS NOT NULL
          ${roleFilter}
          ${consentWhereClause}
          ${deptWhereClause}
          ${seniorEmployeeWhereClause}
        GROUP BY EXTRACT(MONTH FROM ei.birthday)
        ORDER BY birth_month
      `;
      
      console.log('월별 생일자 인원수 쿼리:', query);
      console.log('쿼리 파라미터:', params);
      
      const result = await db.query(query, params);
      
      // 1월부터 12월까지 초기화 (0명으로 설정)
      const monthCounts = {};
      for (let i = 1; i <= 12; i++) {
        monthCounts[i] = 0;
      }
      
      // 실제 데이터로 업데이트
      result.rows.forEach(row => {
        if (row.birth_month) {
          monthCounts[parseInt(row.birth_month)] = parseInt(row.count);
        }
      });
      
      console.log('월별 생일자 인원수 결과:', monthCounts);
      
      return monthCounts;
      
    } catch (error) {
      console.error('월별 생일자 인원수 조회 오류:', error);
      throw error;
    }
  },

  // 생일자 개인정보 동의 현황 목록 조회 (hr.organization + hr.employee_info + aiagent_schema.user 조인)
  getPrivacyConsentList: async ({ page = 1, limit = 30, adminRole = '0', userId = null, consentFilter = null, deptFilter = null, monthFilter = null, sortOrder = null, seniorEmployeeFilter = null }) => {
    try {
      console.log('생일자 개인정보 동의 현황 조회 시작:', { page, limit, adminRole, userId, consentFilter, deptFilter, monthFilter, sortOrder, seniorEmployeeFilter });
      console.log('조회 기준: hr.organization + hr.employee_info + aiagent_schema.user 조인');
      
      // 권한별 필터링 조건
      let roleFilter = '';
      let consentWhereClause = '';
      let deptWhereClause = '';
      let monthWhereClause = '';
      let seniorEmployeeWhereClause = '';
      let params = [];
      let paramIndex = 1;
      
      if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 사용자만 조회
        roleFilter = ` AND o.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }

      // 동의 현황 필터링 조건
      if (consentFilter !== null && consentFilter !== '전체' && consentFilter !== '') {
        consentWhereClause = ` AND u.is_agreed = $${paramIndex++}`;
        params.push(parseInt(consentFilter));
        console.log('동의 현황 필터 조건 추가됨:', consentFilter, 'paramIndex:', paramIndex-1);
      } else {
        console.log('동의 현황 필터 없음 또는 전체 선택됨:', consentFilter);
      }

      // 부서 필터링 조건
      if (deptFilter && deptFilter !== '전체') {
        deptWhereClause = ` AND o.dept = $${paramIndex++}`;
        params.push(deptFilter);
        console.log('부서 필터 조건 추가됨:', deptFilter, 'paramIndex:', paramIndex-1);
      } else {
        console.log('부서 필터 없음 또는 전체 선택됨:', deptFilter);
      }

      // 월 필터링 조건 (생일 월로 필터링)
      if (monthFilter && monthFilter !== '전체') {
        monthWhereClause = ` AND EXTRACT(MONTH FROM ei.birthday) = $${paramIndex++}`;
        params.push(parseInt(monthFilter));
        console.log('월 필터 조건 추가됨:', monthFilter, 'paramIndex:', paramIndex-1);
      } else {
        console.log('월 필터 없음 또는 전체 선택됨:', monthFilter);
      }

      // 3개월 이상 근무자 필터링 조건 (입사일 기준)
      if (seniorEmployeeFilter === 'true') {
        seniorEmployeeWhereClause = ` AND ei.join_date <= NOW() - INTERVAL '3 months'`;
        console.log('3개월 이상 근무자 필터 조건 추가됨 (입사 3개월 미만 제외)');
      } else {
        console.log('3개월 이상 근무자 필터 없음:', seniorEmployeeFilter);
      }
      
      // 페이지네이션을 위한 OFFSET 계산
      const offset = (page - 1) * limit;
      
      // 생일자 개인정보 동의 현황 조회 (hr.organization 기준으로 조인, birthday_message 테이블 추가)
      const query = `
      SELECT 
       ROW_NUMBER() OVER (ORDER BY o.email) as display_number,
       o.name,
       o.dept,
       o.email as user_id,
       CASE 
         WHEN ei.birthday IS NULL THEN '인사기록카드 미작성'
         ELSE TO_CHAR(ei.birthday, 'YYYY-MM-DD')
       END as birthday,
       COALESCE(u.is_agreed, 0) as is_agreed,
       bm_gift.queue_name as gift_queue_name,
       bm_gift.send_time as gift_send_time,
       bm_gift.coupons,
       bm_birthday.queue_name as birthday_queue_name,
       bm_birthday.send_time as birthday_send_time,
       bm_birthday.is_read as birthday_is_read
     FROM hr.organization o
     LEFT JOIN hr.employee_info ei ON REPLACE(o.phone_num, '-', '') = REPLACE(ei.phone, '-', '')
     LEFT JOIN aiagent_schema.user u ON o.email = u.user_id
     LEFT JOIN aiagent_schema.birthday_message bm_gift ON o.email = bm_gift.user_id AND bm_gift.queue_name = 'gift'  AND EXISTS (SELECT 1 FROM json_array_elements(bm_gift.coupons) AS e WHERE (e->> 'tr_id') LIKE '%\_b%' ESCAPE '\')
     LEFT JOIN aiagent_schema.birthday_message bm_birthday ON o.email = bm_birthday.user_id AND bm_birthday.queue_name = 'birthday'
     WHERE o.is_worked = '재직'
       AND o.dept NOT IN ('TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin')
       AND o.name IS NOT NULL
       AND o.name != ''
       ${roleFilter}
       ${consentWhereClause}
       ${deptWhereClause}
       ${monthWhereClause}
       ${seniorEmployeeWhereClause}
     ORDER BY ${sortOrder === 'birthday_asc' ? 'ei.birthday ASC' : sortOrder === 'birthday_desc' ? 'ei.birthday DESC' : 'ei.birthday ASC NULLS LAST'}
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}
   `;
      params.push(limit, offset);
      
      console.log('=== 생일자 개인정보 동의 현황 쿼리 실행 ===');
      console.log('쿼리:', query);
      console.log('파라미터:', params);
      console.log('적용된 필터:');
      console.log('  - roleFilter:', roleFilter);
      console.log('  - consentWhereClause:', consentWhereClause);
      console.log('  - deptWhereClause:', deptWhereClause);
      console.log('  - monthWhereClause:', monthWhereClause);
      console.log('  - seniorEmployeeWhereClause:', seniorEmployeeWhereClause);
      
      const result = await db.query(query, params);
      console.log('쿼리 결과 행 수:', result.rows.length);
      
      // 전체 개수 조회 (같은 조건)
      const countQuery = `
        SELECT COUNT(*) as total
        FROM hr.organization o
        LEFT JOIN hr.employee_info ei ON REPLACE(o.phone_num, '-', '') = REPLACE(ei.phone, '-', '')
        LEFT JOIN aiagent_schema.user u ON o.email = u.user_id
        WHERE o.is_worked = '재직'
          AND o.dept NOT IN ('TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin')
          AND o.name IS NOT NULL
          AND o.name != ''
          ${roleFilter}
          ${consentWhereClause}
          ${deptWhereClause}
          ${monthWhereClause}
          ${seniorEmployeeWhereClause}
      `;
      
      const countParams = [];
      if (['3', '4'].includes(adminRole) && userId) {
        countParams.push(userId);
      }
      if (consentFilter !== null && consentFilter !== '전체' && consentFilter !== '') {
        countParams.push(parseInt(consentFilter));
      }
      if (deptFilter && deptFilter !== '전체') {
        countParams.push(deptFilter);
      }
      if (monthFilter && monthFilter !== '전체') {
        countParams.push(parseInt(monthFilter));
      }
      
      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total) || 0;

      // 부서 목록 조회 (첫 페이지일 때만)
      let departmentList = null;
      if (page === 1) {
        try {
          let deptQuery = `
            SELECT DISTINCT o.dept
            FROM hr.organization o
            WHERE o.is_worked = '재직'
              AND o.dept NOT IN ('TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin')
              AND o.dept IS NOT NULL
              AND o.dept != ''
          `;
          
          let deptParams = [];
          let deptParamIndex = 1;
          
          // 권한별 부서 필터링
          if (['3', '4'].includes(adminRole) && userId) {
            deptQuery += ` AND o.dept = (
              SELECT dept FROM aiagent_schema.user WHERE user_id = $${deptParamIndex++}
            )`;
            deptParams.push(userId);
          }
          
          deptQuery += ` ORDER BY o.dept`;
          
          const deptResult = await db.query(deptQuery, deptParams);
          departmentList = deptResult.rows.map(row => row.dept).filter(dept => dept);
          
          console.log('조회된 부서 목록:', departmentList);
        } catch (deptError) {
          console.error('부서 목록 조회 오류:', deptError);
        }
      }
      
      console.log('생일자 개인정보 동의 현황 조회 결과:', result.rows.length, '개');
      console.log('전체 사용자 수:', total, '명');
      
      const response = {
        success: true,
        consentList: result.rows,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        limit: parseInt(limit)
      };

      if (departmentList) {
        response.departmentList = departmentList;
      }

      return response;

    } catch (error) {
      console.error('생일자 개인정보 동의 현황 조회 오류:', error);
      throw error;
    }
  },

  // 추석 선물 모니터링 현황 목록 조회
  getChuseokGiftList: async ({ page = 1, limit = 30, adminRole = '0', userId = null, giftStatusFilter = null, deptFilter = null }) => {
    try {
      console.log('추석 선물 모니터링 현황 조회 시작:', { page, limit, adminRole, userId, giftStatusFilter, deptFilter });
      console.log('조회 기준: hr.organization + aiagent_schema.birthday_message (queue_name=gift, tr_id에 _e 포함) 조인');

      // 권한별 필터링 조건
      let roleFilter = '';
      let giftStatusWhereClause = '';
      let deptWhereClause = '';
      let params = [];
      let paramIndex = 1;

      if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 사용자만 조회
        roleFilter = ` AND o.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }

      // 부서 필터링 조건
      if (deptFilter && deptFilter !== '전체') {
        deptWhereClause = ` AND o.dept = $${paramIndex++}`;
        params.push(deptFilter);
        console.log('부서 필터 조건 추가됨:', deptFilter);
      }

      // 발송 상태 필터링 조건
      if (giftStatusFilter === '발송') {
        giftStatusWhereClause = ` AND bm_gift.send_time IS NOT NULL`;
      } else if (giftStatusFilter === '미발송') {
        giftStatusWhereClause = ` AND bm_gift.send_time IS NULL`;
      }

      // 페이지네이션을 위한 OFFSET 계산
      const offset = (page - 1) * limit;

      // 추석 선물 모니터링 현황 조회
      const query = `
        SELECT
          ROW_NUMBER() OVER (ORDER BY o.email) as display_number,
          o.name,
          o.dept,
          o.email as user_id,
          bm_gift.send_time,
          bm_gift.coupons
        FROM hr.organization o
        LEFT JOIN aiagent_schema.user u ON o.email = u.user_id
        LEFT JOIN aiagent_schema.birthday_message bm_gift
          ON o.email = bm_gift.user_id
          AND bm_gift.queue_name = 'gift'
          AND EXISTS (
            SELECT 1
            FROM json_array_elements(bm_gift.coupons) AS e
            WHERE e->>'tr_id' LIKE '%\\_e%' ESCAPE '\\'
          )
        WHERE o.is_worked = '재직'
          AND o.dept NOT IN ('TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin')
          AND o.name IS NOT NULL
          AND o.name != ''
          ${roleFilter}
          ${deptWhereClause}
          ${giftStatusWhereClause}
        ORDER BY o.email
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      params.push(limit, offset);

      console.log('=== 추석 선물 모니터링 현황 쿼리 실행 ===');
      console.log('쿼리:', query);
      console.log('파라미터:', params);

      const result = await db.query(query, params);
      console.log('쿼리 결과 행 수:', result.rows.length);

      // 전체 개수 조회
      const countQuery = `
        SELECT COUNT(*) as total
        FROM hr.organization o
        LEFT JOIN aiagent_schema.user u ON o.email = u.user_id
        LEFT JOIN aiagent_schema.birthday_message bm_gift
          ON o.email = bm_gift.user_id
          AND bm_gift.queue_name = 'gift'
          AND EXISTS (
            SELECT 1
            FROM json_array_elements(bm_gift.coupons) AS e
            WHERE e->>'tr_id' LIKE '%\\_e%' ESCAPE '\\'
          )
        WHERE o.is_worked = '재직'
          AND o.dept NOT IN ('TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin')
          AND o.name IS NOT NULL
          AND o.name != ''
          ${roleFilter}
          ${deptWhereClause}
          ${giftStatusWhereClause}
      `;

      const countParams = [];
      if (['3', '4'].includes(adminRole) && userId) {
        countParams.push(userId);
      }
      if (deptFilter && deptFilter !== '전체') {
        countParams.push(deptFilter);
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total) || 0;

      // 부서 목록 조회 (첫 페이지일 때만)
      let departmentList = null;
      if (page === 1) {
        try {
          let deptQuery = `
            SELECT DISTINCT o.dept
            FROM hr.organization o
            WHERE o.is_worked = '재직'
              AND o.dept NOT IN ('TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin')
              AND o.name IS NOT NULL
              AND o.name != ''
              ${roleFilter}
            ORDER BY o.dept
          `;

          const deptParams = [];
          if (['3', '4'].includes(adminRole) && userId) {
            deptParams.push(userId);
          }

          const deptResult = await db.query(deptQuery, deptParams);
          departmentList = deptResult.rows.map(row => row.dept).filter(dept => dept);

          console.log('부서 목록:', departmentList);
        } catch (deptError) {
          console.error('부서 목록 조회 오류:', deptError);
        }
      }

      console.log('추석 선물 모니터링 현황 조회 완료:', {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      });

      const response = {
        data: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      };

      if (departmentList) {
        response.departmentList = departmentList;
      }

      return response;

    } catch (error) {
      console.error('추석 선물 모니터링 현황 조회 오류:', error);
      throw error;
    }
  },

  // 생일자 개인정보 동의 현황 요약 정보 조회 (대시보드 카드용)
  getPrivacyConsentSummary: async (adminRole = '0', userId = null) => {
    try {
      console.log('생일자 개인정보 동의 현황 요약 정보 조회 시작:', { adminRole, userId });
      console.log('조회 기준: hr.organization + aiagent_schema.user 조인');
      
      // 권한별 필터링 조건
      let roleFilter = '';
      let params = [];
      let paramIndex = 1;
      
      if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 사용자만 조회
        roleFilter = ` AND o.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }
      
      // 동의/미동의 사용자 수 조회 (hr.organization 기준)
      const query = `
        SELECT 
          SUM(CASE WHEN u.is_agreed = 1 THEN 1 ELSE 0 END) as agreed_count,
          SUM(CASE WHEN u.is_agreed = 0 OR u.is_agreed IS NULL THEN 1 ELSE 0 END) as not_agreed_count,
          COUNT(*) as total_count
        FROM hr.organization o
        LEFT JOIN aiagent_schema.user u ON o.email = u.user_id
        WHERE o.is_worked = '재직'
          AND o.dept NOT IN ('TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin')
          AND o.name IS NOT NULL
          AND o.name != ''
          ${roleFilter}
      `;
      
      console.log('생일자 개인정보 동의 현황 요약 쿼리:', query);
      console.log('쿼리 파라미터:', params);
      
      const result = await db.query(query, params);
      const summary = result.rows[0];
      
      const summaryData = {
        agreed_count: parseInt(summary.agreed_count) || 0,
        not_agreed_count: parseInt(summary.not_agreed_count) || 0,
        total_count: parseInt(summary.total_count) || 0
      };
      
      console.log('생일자 개인정보 동의 현황 요약 조회 결과:', summaryData);
      
      return summaryData;
      
    } catch (error) {
      console.error('생일자 개인정보 동의 현황 요약 조회 오류:', error);
      throw error;
    }
  },

  // v1.2.0 사용자 수 주간 비교 조회 (오늘 vs 일주일 전)
  getV120WeeklyComparison: async (adminRole = '0', userId = null) => {
    try {
      console.log('v1.2.0 사용자 수 주간 비교 조회 시작:', { adminRole, userId });

      // 권한별 필터링 조건
      let roleFilter = '';
      let params = [];
      let paramIndex = 1;

      if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 사용자만 조회
        roleFilter = ` AND u.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }

      // 한국 시간 기준으로 오늘과 일주일 전 날짜 계산
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const weekAgoStart = new Date(todayStart);
      weekAgoStart.setDate(weekAgoStart.getDate() - 7);
      const weekAgoEnd = new Date(weekAgoStart);
      weekAgoEnd.setDate(weekAgoEnd.getDate() + 1);

      // UTC로 변환 (DB는 UTC로 저장되므로)
      const todayStartUTC = new Date(todayStart.getTime() - (9 * 60 * 60 * 1000));
      const todayEndUTC = new Date(todayEnd.getTime() - (9 * 60 * 60 * 1000));
      const weekAgoStartUTC = new Date(weekAgoStart.getTime() - (9 * 60 * 60 * 1000));
      const weekAgoEndUTC = new Date(weekAgoEnd.getTime() - (9 * 60 * 60 * 1000));

      console.log('날짜 범위 (한국시간):');
      console.log('  오늘:', todayStart.toLocaleDateString('ko-KR'), '~', todayEnd.toLocaleDateString('ko-KR'));
      console.log('  일주일전:', weekAgoStart.toLocaleDateString('ko-KR'), '~', weekAgoEnd.toLocaleDateString('ko-KR'));

      // 사용자별 버전 변화 추적 쿼리 (1.1.0 → 1.2.0 업그레이드 감지)
      const query = `
        WITH user_versions AS (
          -- 각 사용자의 일주일 전과 오늘 시점의 최신 버전 정보
          SELECT DISTINCT
            u.user_id,
            -- 일주일 전 시점의 최신 버전 (해당 시점까지의 로그인 기록 중 최신)
            (
              SELECT lh1.version_info
              FROM aiagent_schema.login_history lh1
              WHERE lh1.user_id = u.user_id
                AND lh1.login_time <= $${paramIndex++}
                AND lh1.version_info IS NOT NULL
                AND lh1.version_info != ''
                AND (lh1.error IS NULL OR lh1.error = '')
              ORDER BY lh1.login_time DESC
              LIMIT 1
            ) as week_ago_version,
            -- 오늘 시점의 최신 버전 (현재까지의 로그인 기록 중 최신)
            (
              SELECT lh2.version_info
              FROM aiagent_schema.login_history lh2
              WHERE lh2.user_id = u.user_id
                AND lh2.login_time <= $${paramIndex++}
                AND lh2.version_info IS NOT NULL
                AND lh2.version_info != ''
                AND (lh2.error IS NULL OR lh2.error = '')
              ORDER BY lh2.login_time DESC
              LIMIT 1
            ) as today_version
          FROM aiagent_schema.user u
          JOIN hr.organization o ON u.user_id = o.email
          WHERE u.dept NOT IN ('admin')
            AND o.is_worked = '재직'
            AND o.dept != '관리자 주소'
            ${roleFilter}
        ),
        version_changes AS (
          SELECT
            -- 일주일 전에 1.2.0이었던 사용자 수
            COUNT(CASE WHEN week_ago_version = '1.2.0' THEN 1 END) as week_ago_v120_count,
            -- 현재 1.2.0인 사용자 수
            COUNT(CASE WHEN today_version = '1.2.0' THEN 1 END) as today_v120_count,
            -- 1.1.0에서 1.2.0으로 업그레이드한 사용자 수 (새로 전환)
            COUNT(CASE
              WHEN (week_ago_version != '1.2.0' OR week_ago_version IS NULL)
                AND today_version = '1.2.0'
              THEN 1
            END) as newly_upgraded_count,
            -- 1.2.0에서 1.1.0으로 다운그레이드한 사용자 수 (역전환)
            COUNT(CASE
              WHEN week_ago_version = '1.2.0'
                AND (today_version != '1.2.0' OR today_version IS NULL)
              THEN 1
            END) as downgraded_count
          FROM user_versions
          WHERE week_ago_version IS NOT NULL OR today_version IS NOT NULL
        )
        SELECT
          week_ago_v120_count,
          today_v120_count,
          newly_upgraded_count,
          downgraded_count,
          (today_v120_count - week_ago_v120_count) as net_change,
          CASE
            WHEN week_ago_v120_count = 0 AND today_v120_count > 0 THEN 100.0
            WHEN week_ago_v120_count = 0 THEN 0.0
            ELSE ROUND(((today_v120_count - week_ago_v120_count)::NUMERIC / week_ago_v120_count) * 100, 1)
          END as change_percentage
        FROM version_changes
      `;

      // 파라미터 추가 (일주일 전 시점, 오늘 시점)
      const queryParams = [...params, weekAgoEndUTC, todayEndUTC];
      if (['3', '4'].includes(adminRole) && userId) {
        queryParams.push(userId); // roleFilter용 두 번째 userId
      }

      console.log('v1.2.0 버전 변화 추적 쿼리:', query);
      console.log('쿼리 파라미터:', queryParams);

      const result = await db.query(query, queryParams);
      const comparison = result.rows[0];

      const comparisonData = {
        today_v120_count: parseInt(comparison.today_v120_count) || 0,
        week_ago_v120_count: parseInt(comparison.week_ago_v120_count) || 0,
        newly_upgraded_count: parseInt(comparison.newly_upgraded_count) || 0,
        downgraded_count: parseInt(comparison.downgraded_count) || 0,
        net_change: parseInt(comparison.net_change) || 0,
        change_percentage: parseFloat(comparison.change_percentage) || 0,
        comparison_date: {
          today: todayStart.toLocaleDateString('ko-KR'),
          week_ago: weekAgoStart.toLocaleDateString('ko-KR')
        }
      };

      console.log('v1.2.0 주간 비교 조회 결과:', comparisonData);

      return comparisonData;

    } catch (error) {
      console.error('v1.2.0 사용자 수 주간 비교 조회 오류:', error);
      throw error;
    }
  },

  // v1.2.1 사용자 수 주간 비교 조회 (오늘 vs 일주일 전)
  getV121WeeklyComparison: async (adminRole = '0', userId = null) => {
    try {
      console.log('v1.2.1 사용자 수 주간 비교 조회 시작:', { adminRole, userId });

      // 권한별 필터링 조건
      let roleFilter = '';
      let params = [];
      let paramIndex = 1;

      if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 사용자만 조회
        roleFilter = ` AND u.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }

      // 한국 시간 기준으로 오늘과 일주일 전 날짜 계산
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const weekAgoStart = new Date(todayStart);
      weekAgoStart.setDate(weekAgoStart.getDate() - 7);
      const weekAgoEnd = new Date(weekAgoStart);
      weekAgoEnd.setDate(weekAgoEnd.getDate() + 1);

      // UTC로 변환 (DB는 UTC로 저장되므로)
      const todayStartUTC = new Date(todayStart.getTime() - (9 * 60 * 60 * 1000));
      const todayEndUTC = new Date(todayEnd.getTime() - (9 * 60 * 60 * 1000));
      const weekAgoStartUTC = new Date(weekAgoStart.getTime() - (9 * 60 * 60 * 1000));
      const weekAgoEndUTC = new Date(weekAgoEnd.getTime() - (9 * 60 * 60 * 1000));

      console.log('날짜 범위 (한국시간):');
      console.log('  오늘:', todayStart.toLocaleDateString('ko-KR'), '~', todayEnd.toLocaleDateString('ko-KR'));
      console.log('  일주일전:', weekAgoStart.toLocaleDateString('ko-KR'), '~', weekAgoEnd.toLocaleDateString('ko-KR'));

      // 사용자별 버전 변화 추적 쿼리 (1.2.1 업그레이드 감지)
      const query = `
        WITH user_versions AS (
          -- 각 사용자의 일주일 전과 오늘 시점의 최신 버전 정보
          SELECT DISTINCT
            u.user_id,
            -- 일주일 전 시점의 최신 버전 (해당 시점까지의 로그인 기록 중 최신)
            (
              SELECT lh1.version_info
              FROM aiagent_schema.login_history lh1
              WHERE lh1.user_id = u.user_id
                AND lh1.login_time <= $${paramIndex++}
                AND lh1.version_info IS NOT NULL
                AND lh1.version_info != ''
                AND (lh1.error IS NULL OR lh1.error = '')
              ORDER BY lh1.login_time DESC
              LIMIT 1
            ) as week_ago_version,
            -- 오늘 시점의 최신 버전 (현재까지의 로그인 기록 중 최신)
            (
              SELECT lh2.version_info
              FROM aiagent_schema.login_history lh2
              WHERE lh2.user_id = u.user_id
                AND lh2.login_time <= $${paramIndex++}
                AND lh2.version_info IS NOT NULL
                AND lh2.version_info != ''
                AND (lh2.error IS NULL OR lh2.error = '')
              ORDER BY lh2.login_time DESC
              LIMIT 1
            ) as today_version
          FROM aiagent_schema.user u
          JOIN hr.organization o ON u.user_id = o.email
          WHERE u.dept NOT IN ('admin')
            AND o.is_worked = '재직'
            AND o.dept != '관리자 주소'
            ${roleFilter}
        ),
        version_changes AS (
          SELECT
            -- 일주일 전에 1.2.1이었던 사용자 수
            COUNT(CASE WHEN week_ago_version = '1.2.1' THEN 1 END) as week_ago_v121_count,
            -- 현재 1.2.1인 사용자 수
            COUNT(CASE WHEN today_version = '1.2.1' THEN 1 END) as today_v121_count,
            -- 1.2.1로 업그레이드한 사용자 수 (새로 전환)
            COUNT(CASE
              WHEN (week_ago_version != '1.2.1' OR week_ago_version IS NULL)
                AND today_version = '1.2.1'
              THEN 1
            END) as newly_upgraded_count,
            -- 1.2.1에서 다운그레이드한 사용자 수 (역전환)
            COUNT(CASE
              WHEN week_ago_version = '1.2.1'
                AND (today_version != '1.2.1' OR today_version IS NULL)
              THEN 1
            END) as downgraded_count
          FROM user_versions
          WHERE week_ago_version IS NOT NULL OR today_version IS NOT NULL
        )
        SELECT
          week_ago_v121_count,
          today_v121_count,
          newly_upgraded_count,
          downgraded_count,
          (today_v121_count - week_ago_v121_count) as net_change,
          CASE
            WHEN week_ago_v121_count = 0 THEN 0.0
            ELSE ROUND(((today_v121_count - week_ago_v121_count)::NUMERIC / week_ago_v121_count) * 100, 1)
          END as change_percentage
        FROM version_changes
      `;

      // 파라미터 추가 (일주일 전 시점, 오늘 시점)
      const queryParams = [...params, weekAgoEndUTC, todayEndUTC];
      if (['3', '4'].includes(adminRole) && userId) {
        queryParams.push(userId); // roleFilter용 두 번째 userId
      }

      console.log('v1.2.1 버전 변화 추적 쿼리:', query);
      console.log('쿼리 파라미터:', queryParams);

      const result = await db.query(query, queryParams);
      const comparison = result.rows[0];

      const comparisonData = {
        today_v121_count: parseInt(comparison.today_v121_count) || 0,
        week_ago_v121_count: parseInt(comparison.week_ago_v121_count) || 0,
        newly_upgraded_count: parseInt(comparison.newly_upgraded_count) || 0,
        downgraded_count: parseInt(comparison.downgraded_count) || 0,
        net_change: parseInt(comparison.net_change) || 0,
        change_percentage: parseFloat(comparison.change_percentage) || 0,
        comparison_date: {
          today: todayStart.toLocaleDateString('ko-KR'),
          week_ago: weekAgoStart.toLocaleDateString('ko-KR')
        }
      };

      console.log('v1.2.1 주간 비교 조회 결과:', comparisonData);

      return comparisonData;

    } catch (error) {
      console.error('v1.2.1 사용자 수 주간 비교 조회 오류:', error);
      throw error;
    }
  },

  // v1.3.0 사용자 수 주간 비교 조회 (오늘 vs 일주일 전)
  getV130WeeklyComparison: async (adminRole = '0', userId = null) => {
    try {
      console.log('v1.3.0 사용자 수 주간 비교 조회 시작:', { adminRole, userId });

      // 권한별 필터링 조건
      let roleFilter = '';
      let params = [];
      let paramIndex = 1;

      if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 사용자만 조회
        roleFilter = ` AND u.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }

      // 한국 시간 기준으로 오늘과 일주일 전 날짜 계산
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const weekAgoStart = new Date(todayStart);
      weekAgoStart.setDate(weekAgoStart.getDate() - 7);
      const weekAgoEnd = new Date(weekAgoStart);
      weekAgoEnd.setDate(weekAgoEnd.getDate() + 1);

      // UTC로 변환 (DB는 UTC로 저장되므로)
      const todayStartUTC = new Date(todayStart.getTime() - (9 * 60 * 60 * 1000));
      const todayEndUTC = new Date(todayEnd.getTime() - (9 * 60 * 60 * 1000));
      const weekAgoStartUTC = new Date(weekAgoStart.getTime() - (9 * 60 * 60 * 1000));
      const weekAgoEndUTC = new Date(weekAgoEnd.getTime() - (9 * 60 * 60 * 1000));

      console.log('날짜 범위 (한국시간):');
      console.log('  오늘:', todayStart.toLocaleDateString('ko-KR'), '~', todayEnd.toLocaleDateString('ko-KR'));
      console.log('  일주일전:', weekAgoStart.toLocaleDateString('ko-KR'), '~', weekAgoEnd.toLocaleDateString('ko-KR'));

      // 사용자별 버전 변화 추적 쿼리 (1.3.0 업그레이드 감지)
      const query = `
        WITH user_versions AS (
          -- 각 사용자의 일주일 전과 오늘 시점의 최신 버전 정보
          SELECT DISTINCT
            u.user_id,
            -- 일주일 전 시점의 최신 버전 (해당 시점까지의 로그인 기록 중 최신)
            (
              SELECT lh1.version_info
              FROM aiagent_schema.login_history lh1
              WHERE lh1.user_id = u.user_id
                AND lh1.login_time <= $${paramIndex++}
                AND lh1.version_info IS NOT NULL
                AND lh1.version_info != ''
                AND (lh1.error IS NULL OR lh1.error = '')
              ORDER BY lh1.login_time DESC
              LIMIT 1
            ) as week_ago_version,
            -- 오늘 시점의 최신 버전 (현재까지의 로그인 기록 중 최신)
            (
              SELECT lh2.version_info
              FROM aiagent_schema.login_history lh2
              WHERE lh2.user_id = u.user_id
                AND lh2.login_time <= $${paramIndex++}
                AND lh2.version_info IS NOT NULL
                AND lh2.version_info != ''
                AND (lh2.error IS NULL OR lh2.error = '')
              ORDER BY lh2.login_time DESC
              LIMIT 1
            ) as today_version
          FROM aiagent_schema.user u
          JOIN hr.organization o ON u.user_id = o.email
          WHERE u.dept NOT IN ('admin')
            AND o.is_worked = '재직'
            AND o.dept != '관리자 주소'
            ${roleFilter}
        ),
        version_changes AS (
          SELECT
            -- 일주일 전에 1.3.0이었던 사용자 수
            COUNT(CASE WHEN week_ago_version = '1.3.0' THEN 1 END) as week_ago_v130_count,
            -- 현재 1.3.0인 사용자 수
            COUNT(CASE WHEN today_version = '1.3.0' THEN 1 END) as today_v130_count,
            -- 1.3.0으로 업그레이드한 사용자 수 (새로 전환)
            COUNT(CASE
              WHEN (week_ago_version != '1.3.0' OR week_ago_version IS NULL)
                AND today_version = '1.3.0'
              THEN 1
            END) as newly_upgraded_count,
            -- 1.3.0에서 다운그레이드한 사용자 수 (역전환)
            COUNT(CASE
              WHEN week_ago_version = '1.3.0'
                AND (today_version != '1.3.0' OR today_version IS NULL)
              THEN 1
            END) as downgraded_count
          FROM user_versions
          WHERE week_ago_version IS NOT NULL OR today_version IS NOT NULL
        )
        SELECT
          week_ago_v130_count,
          today_v130_count,
          newly_upgraded_count,
          downgraded_count,
          (today_v130_count - week_ago_v130_count) as net_change,
          CASE
            WHEN week_ago_v130_count = 0 THEN 0.0
            ELSE ROUND(((today_v130_count - week_ago_v130_count)::NUMERIC / week_ago_v130_count) * 100, 1)
          END as change_percentage
        FROM version_changes
      `;

      // 파라미터 추가 (일주일 전 시점, 오늘 시점)
      const queryParams = [...params, weekAgoEndUTC, todayEndUTC];
      if (['3', '4'].includes(adminRole) && userId) {
        queryParams.push(userId); // roleFilter용 두 번째 userId
      }

      console.log('v1.3.0 버전 변화 추적 쿼리:', query);
      console.log('쿼리 파라미터:', queryParams);

      const result = await db.query(query, queryParams);
      const comparison = result.rows[0];

      const comparisonData = {
        today_v130_count: parseInt(comparison.today_v130_count) || 0,
        week_ago_v130_count: parseInt(comparison.week_ago_v130_count) || 0,
        newly_upgraded_count: parseInt(comparison.newly_upgraded_count) || 0,
        downgraded_count: parseInt(comparison.downgraded_count) || 0,
        net_change: parseInt(comparison.net_change) || 0,
        change_percentage: parseFloat(comparison.change_percentage) || 0,
        comparison_date: {
          today: todayStart.toLocaleDateString('ko-KR'),
          week_ago: weekAgoStart.toLocaleDateString('ko-KR')
        }
      };

      console.log('v1.3.0 주간 비교 조회 결과:', comparisonData);

      return comparisonData;

    } catch (error) {
      console.error('v1.3.0 사용자 수 주간 비교 조회 오류:', error);
      throw error;
    }
  },

  // v1.3.1 사용자 수 주간 비교 조회 (오늘 vs 일주일 전)
  getV131WeeklyComparison: async (adminRole = '0', userId = null) => {
    try {
      console.log('v1.3.1 사용자 수 주간 비교 조회 시작:', { adminRole, userId });

      // 권한별 필터링 조건
      let roleFilter = '';
      let params = [];
      let paramIndex = 1;

      if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 사용자만 조회
        roleFilter = ` AND u.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }

      // 한국 시간 기준으로 오늘과 일주일 전 날짜 계산
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const weekAgoStart = new Date(todayStart);
      weekAgoStart.setDate(weekAgoStart.getDate() - 7);
      const weekAgoEnd = new Date(weekAgoStart);
      weekAgoEnd.setDate(weekAgoEnd.getDate() + 1);

      // UTC로 변환 (DB는 UTC로 저장되므로)
      const todayStartUTC = new Date(todayStart.getTime() - (9 * 60 * 60 * 1000));
      const todayEndUTC = new Date(todayEnd.getTime() - (9 * 60 * 60 * 1000));
      const weekAgoStartUTC = new Date(weekAgoStart.getTime() - (9 * 60 * 60 * 1000));
      const weekAgoEndUTC = new Date(weekAgoEnd.getTime() - (9 * 60 * 60 * 1000));

      console.log('날짜 범위 (한국시간):');
      console.log('  오늘:', todayStart.toLocaleDateString('ko-KR'), '~', todayEnd.toLocaleDateString('ko-KR'));
      console.log('  일주일전:', weekAgoStart.toLocaleDateString('ko-KR'), '~', weekAgoEnd.toLocaleDateString('ko-KR'));

      // 사용자별 버전 변화 추적 쿼리 (1.3.1 업그레이드 감지)
      const query = `
        WITH user_versions AS (
          -- 각 사용자의 일주일 전과 오늘 시점의 최신 버전 정보
          SELECT DISTINCT
            u.user_id,
            -- 일주일 전 시점의 최신 버전 (해당 시점까지의 로그인 기록 중 최신)
            (
              SELECT lh1.version_info
              FROM aiagent_schema.login_history lh1
              WHERE lh1.user_id = u.user_id
                AND lh1.login_time <= $${paramIndex++}
                AND lh1.version_info IS NOT NULL
                AND lh1.version_info != ''
                AND (lh1.error IS NULL OR lh1.error = '')
              ORDER BY lh1.login_time DESC
              LIMIT 1
            ) as week_ago_version,
            -- 오늘 시점의 최신 버전 (현재까지의 로그인 기록 중 최신)
            (
              SELECT lh2.version_info
              FROM aiagent_schema.login_history lh2
              WHERE lh2.user_id = u.user_id
                AND lh2.login_time <= $${paramIndex++}
                AND lh2.version_info IS NOT NULL
                AND lh2.version_info != ''
                AND (lh2.error IS NULL OR lh2.error = '')
              ORDER BY lh2.login_time DESC
              LIMIT 1
            ) as today_version
          FROM aiagent_schema.user u
          JOIN hr.organization o ON u.user_id = o.email
          WHERE u.dept NOT IN ('admin')
            AND o.is_worked = '재직'
            AND o.dept != '관리자 주소'
            ${roleFilter}
        ),
        version_changes AS (
          SELECT
            -- 일주일 전에 1.3.1이었던 사용자 수
            COUNT(CASE WHEN week_ago_version = '1.3.1' THEN 1 END) as week_ago_v131_count,
            -- 현재 1.3.1인 사용자 수
            COUNT(CASE WHEN today_version = '1.3.1' THEN 1 END) as today_v131_count,
            -- 1.3.1으로 업그레이드한 사용자 수 (새로 전환)
            COUNT(CASE
              WHEN (week_ago_version != '1.3.1' OR week_ago_version IS NULL)
                AND today_version = '1.3.1'
              THEN 1
            END) as newly_upgraded_count,
            -- 1.3.1에서 다운그레이드한 사용자 수 (역전환)
            COUNT(CASE
              WHEN week_ago_version = '1.3.1'
                AND (today_version != '1.3.1' OR today_version IS NULL)
              THEN 1
            END) as downgraded_count
          FROM user_versions
          WHERE week_ago_version IS NOT NULL OR today_version IS NOT NULL
        )
        SELECT
          week_ago_v131_count,
          today_v131_count,
          newly_upgraded_count,
          downgraded_count,
          (today_v131_count - week_ago_v131_count) as net_change,
          CASE
            WHEN week_ago_v131_count = 0 THEN 0.0
            ELSE ROUND(((today_v131_count - week_ago_v131_count)::NUMERIC / week_ago_v131_count) * 100, 1)
          END as change_percentage
        FROM version_changes
      `;

      // 파라미터 추가 (일주일 전 시점, 오늘 시점)
      const queryParams = [...params, weekAgoEndUTC, todayEndUTC];
      if (['3', '4'].includes(adminRole) && userId) {
        queryParams.push(userId); // roleFilter용 두 번째 userId
      }

      console.log('v1.3.1 버전 변화 추적 쿼리:', query);
      console.log('쿼리 파라미터:', queryParams);

      const result = await db.query(query, queryParams);
      const comparison = result.rows[0];

      const comparisonData = {
        today_v131_count: parseInt(comparison.today_v131_count) || 0,
        week_ago_v131_count: parseInt(comparison.week_ago_v131_count) || 0,
        newly_upgraded_count: parseInt(comparison.newly_upgraded_count) || 0,
        downgraded_count: parseInt(comparison.downgraded_count) || 0,
        net_change: parseInt(comparison.net_change) || 0,
        change_percentage: parseFloat(comparison.change_percentage) || 0,
        comparison_date: {
          today: todayStart.toLocaleDateString('ko-KR'),
          week_ago: weekAgoStart.toLocaleDateString('ko-KR')
        }
      };

      console.log('v1.3.1 주간 비교 조회 결과:', comparisonData);

      return comparisonData;

    } catch (error) {
      console.error('v1.3.1 사용자 수 주간 비교 조회 오류:', error);
      throw error;
    }
  },

  // AAA 미사용자 수 주간 비교 조회 (오늘 vs 일주일 전)
  getUnusedUsersWeeklyComparison: async (adminRole = '0', userId = null) => {
    try {
      console.log('AAA 미사용자 수 주간 비교 조회 시작:', { adminRole, userId });

      // 권한별 필터링 조건
      let roleFilter = '';
      let params = [];
      let paramIndex = 1;

      if (['3', '4'].includes(adminRole) && userId) {
        // 본부장/사업부장: 같은 부서 사용자만 조회
        roleFilter = ` AND u.dept = (
          SELECT dept FROM aiagent_schema.user WHERE user_id = $${paramIndex++}
        )`;
        params.push(userId);
      }

      // 한국 시간 기준으로 오늘과 일주일 전 날짜 계산
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const weekAgoStart = new Date(todayStart);
      weekAgoStart.setDate(weekAgoStart.getDate() - 7);
      const weekAgoEnd = new Date(weekAgoStart);
      weekAgoEnd.setDate(weekAgoEnd.getDate() + 1);

      // UTC로 변환 (DB는 UTC로 저장되므로)
      const todayStartUTC = new Date(todayStart.getTime() - (9 * 60 * 60 * 1000));
      const todayEndUTC = new Date(todayEnd.getTime() - (9 * 60 * 60 * 1000));
      const weekAgoStartUTC = new Date(weekAgoStart.getTime() - (9 * 60 * 60 * 1000));
      const weekAgoEndUTC = new Date(weekAgoEnd.getTime() - (9 * 60 * 60 * 1000));

      console.log('날짜 범위 (한국시간):');
      console.log('  오늘:', todayStart.toLocaleDateString('ko-KR'), '~', todayEnd.toLocaleDateString('ko-KR'));
      console.log('  일주일전:', weekAgoStart.toLocaleDateString('ko-KR'), '~', weekAgoEnd.toLocaleDateString('ko-KR'));

      // 사용자별 대화 상태 변화 추적 쿼리
      const query = `
        WITH user_chat_status AS (
          -- 각 사용자의 일주일 전과 현재 시점의 대화 상태
          SELECT DISTINCT
            u.user_id,
            u.name,
            u.dept,
            -- 일주일 전 시점까지 대화 기록이 있었는지
            (
              SELECT COUNT(*) > 0
              FROM aiagent_schema.archive_detail ad1
              WHERE ad1.user_id = u.user_id
                AND ad1.chat_time <= $${paramIndex++}
                AND ad1.role = 0
                AND (ad1.is_csr = false OR ad1.is_csr IS NULL)
                AND ad1.message IS NOT NULL
                AND ad1.message != ''
            ) as had_chat_week_ago,
            -- 현재 시점까지 대화 기록이 있는지
            (
              SELECT COUNT(*) > 0
              FROM aiagent_schema.archive_detail ad2
              WHERE ad2.user_id = u.user_id
                AND ad2.chat_time <= $${paramIndex++}
                AND ad2.role = 0
                AND (ad2.is_csr = false OR ad2.is_csr IS NULL)
                AND ad2.message IS NOT NULL
                AND ad2.message != ''
            ) as has_chat_today
          FROM aiagent_schema.user u
          INNER JOIN hr.view_hr hr ON u.user_id = hr.email
          WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
            AND hr.is_worked = '재직'
            ${roleFilter}
        ),
        usage_changes AS (
          SELECT
            -- 일주일 전 미사용자 수 (일주일 전 시점까지 대화 기록 없었던 사용자)
            COUNT(CASE WHEN NOT had_chat_week_ago THEN 1 END) as week_ago_unused_count,
            -- 현재 미사용자 수 (현재 시점까지 대화 기록 없는 사용자)
            COUNT(CASE WHEN NOT has_chat_today THEN 1 END) as today_unused_count,
            -- 신규 미사용자 (일주일 전에는 사용했지만 지금까지도 그 이후 대화 없음)
            COUNT(CASE
              WHEN had_chat_week_ago = true
                AND has_chat_today = true
                AND NOT EXISTS (
                  SELECT 1 FROM aiagent_schema.archive_detail ad3
                  WHERE ad3.user_id = user_chat_status.user_id
                    AND ad3.chat_time > $${paramIndex++}
                    AND ad3.chat_time <= $${paramIndex++}
                    AND ad3.role = 0
                    AND (ad3.is_csr = false OR ad3.is_csr IS NULL)
                    AND ad3.message IS NOT NULL
                    AND ad3.message != ''
                )
              THEN 1
            END) as became_inactive_count,
            -- 사용 시작한 사용자 (일주일 전에는 미사용자였지만 이번 주에 대화 시작)
            COUNT(CASE
              WHEN had_chat_week_ago = false
                AND has_chat_today = true
              THEN 1
            END) as became_active_count
          FROM user_chat_status
        )
        SELECT
          week_ago_unused_count,
          today_unused_count,
          became_inactive_count,
          became_active_count,
          (today_unused_count - week_ago_unused_count) as net_change,
          CASE
            WHEN week_ago_unused_count = 0 AND today_unused_count > 0 THEN 100.0
            WHEN week_ago_unused_count = 0 THEN 0.0
            ELSE ROUND(((today_unused_count - week_ago_unused_count)::NUMERIC / week_ago_unused_count) * 100, 1)
          END as change_percentage
        FROM usage_changes
      `;

      // 파라미터 추가 (일주일 전 시점, 현재 시점, 이번 주 시작, 이번 주 끝)
      const queryParams = [...params, weekAgoEndUTC, todayEndUTC, weekAgoEndUTC, todayEndUTC];
      if (['3', '4'].includes(adminRole) && userId) {
        queryParams.push(userId); // roleFilter용 두 번째 userId
      }

      console.log('AAA 미사용자 변화 추적 쿼리:', query);
      console.log('쿼리 파라미터:', queryParams);

      const result = await db.query(query, queryParams);
      const comparison = result.rows[0];

      const comparisonData = {
        today_unused_count: parseInt(comparison.today_unused_count) || 0,
        week_ago_unused_count: parseInt(comparison.week_ago_unused_count) || 0,
        became_inactive_count: parseInt(comparison.became_inactive_count) || 0,
        became_active_count: parseInt(comparison.became_active_count) || 0,
        net_change: parseInt(comparison.net_change) || 0,
        change_percentage: parseFloat(comparison.change_percentage) || 0,
        comparison_date: {
          today: todayStart.toLocaleDateString('ko-KR'),
          week_ago: weekAgoStart.toLocaleDateString('ko-KR')
        }
      };

      console.log('AAA 미사용자 주간 비교 조회 결과:', comparisonData);

      return comparisonData;

    } catch (error) {
      console.error('AAA 미사용자 수 주간 비교 조회 오류:', error);
      throw error;
    }
  },

  // 추석 선물 모니터링 현황 목록 조회 (hr.organization + hr.employee_info + aiagent_schema.user 조인)
  getChuseokGiftList: async ({ page = 1, limit = 30, adminRole = '0', userId = null, deptFilter = null }) => {
    try {
      console.log('추석 선물 모니터링 현황 조회 시작:', { page, limit, adminRole, userId, deptFilter });
      console.log('조회 기준: hr.organization + aiagent_schema.birthday_message 조인 (추석 선물 발송 내역)');
      console.log('권한 필터 없음 - 모든 부서 조회 가능');

      // 부서 필터링 조건만 적용 (권한 필터 제거)
      let deptWhereClause = '';
      let params = [];
      let paramIndex = 1;

      // 부서 필터링 조건
      if (deptFilter && deptFilter !== '전체') {
        deptWhereClause = ` AND o.dept = $${paramIndex++}`;
        params.push(deptFilter);
        console.log('부서 필터 조건 추가됨:', deptFilter, 'paramIndex:', paramIndex-1);
      } else {
        console.log('부서 필터 없음 또는 전체 선택됨:', deptFilter);
      }

      // 페이지네이션을 위한 OFFSET 계산
      const offset = (page - 1) * limit;

      // 추석 선물 모니터링 현황 조회 (hr.organization 기준으로 조인, birthday_message 테이블 추가)
      const query = `
        SELECT
          ROW_NUMBER() OVER (
            ORDER BY
              CASE
                WHEN bm_gift.queue_name = 'gift'
                  AND bm_gift.coupons IS NOT NULL
                  AND EXISTS (
                    SELECT 1
                    FROM json_array_elements(bm_gift.coupons) AS e
                    WHERE e->>'tr_id' LIKE '%_e%'
                  )
                THEN 0
                ELSE 1
              END,
              o.name
          ) as display_number,
          o.name,
          o.dept,
          o.email as user_id,
          bm_gift.send_time as chuseok_send_time,
          bm_gift.queue_name,
          bm_gift.coupons
        FROM hr.organization o
        LEFT JOIN aiagent_schema.birthday_message bm_gift ON o.email = bm_gift.user_id AND bm_gift.queue_name = 'gift'
        WHERE o.is_worked = '재직'
          AND o.dept NOT IN ('TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin')
          AND o.name IS NOT NULL
          AND o.name != ''
          ${deptWhereClause}
        ORDER BY
          CASE
            WHEN bm_gift.queue_name = 'gift'
              AND bm_gift.coupons IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM json_array_elements(bm_gift.coupons) AS e
                WHERE e->>'tr_id' LIKE '%_e%'
              )
            THEN 0
            ELSE 1
          END,
          o.name
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      params.push(limit, offset);

      console.log('=== 추석 선물 모니터링 현황 쿼리 실행 ===');
      console.log('쿼리:', query);
      console.log('파라미터:', params);
      console.log('적용된 필터:');
      console.log('  - deptWhereClause:', deptWhereClause);

      const result = await db.query(query, params);
      console.log('쿼리 결과 행 수:', result.rows.length);

      // 전체 개수 조회 (같은 조건)
      const countQuery = `
        SELECT COUNT(*) as total
        FROM hr.organization o
        WHERE o.is_worked = '재직'
          AND o.dept NOT IN ('TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin')
          AND o.name IS NOT NULL
          AND o.name != ''
          ${deptWhereClause}
      `;

      const countParams = [];
      if (deptFilter && deptFilter !== '전체') {
        countParams.push(deptFilter);
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total) || 0;

      // 부서 목록 조회 (첫 페이지일 때만) - 권한 필터 없이 모든 부서 조회
      let departmentList = null;
      if (page === 1) {
        try {
          // 1. 전체 부서 현황 분석
          const analysisQuery = `
            SELECT
              o.dept,
              o.is_worked,
              COUNT(*) as employee_count,
              COUNT(CASE WHEN o.dept IS NULL THEN 1 END) as null_count,
              COUNT(CASE WHEN o.dept = '' THEN 1 END) as empty_count
            FROM hr.organization o
            GROUP BY o.dept, o.is_worked
            ORDER BY o.dept, o.is_worked
          `;

          const analysisResult = await db.query(analysisQuery);
          console.log('=== 전체 부서 현황 분석 ===');
          console.log('부서별 직원 수 (재직/퇴사 포함):');
          analysisResult.rows.forEach(row => {
            console.log(`  - ${row.dept || '(NULL/빈값)'} [${row.is_worked}]: ${row.employee_count}명`);
          });

          // 2. 제외된 부서 확인
          const excludedDepts = ['TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin'];
          const excludedQuery = `
            SELECT o.dept, COUNT(*) as count
            FROM hr.organization o
            WHERE o.is_worked = '재직'
              AND o.dept IN ('TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin')
            GROUP BY o.dept
            ORDER BY o.dept
          `;

          const excludedResult = await db.query(excludedQuery);
          console.log('=== 제외된 부서 목록 (재직자만) ===');
          excludedResult.rows.forEach(row => {
            console.log(`  - ${row.dept}: ${row.count}명`);
          });

          // 3. 필터에 포함될 부서 목록 조회
          const deptQuery = `
            SELECT DISTINCT o.dept, COUNT(*) as count
            FROM hr.organization o
            WHERE o.is_worked = '재직'
              AND o.dept NOT IN ('TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin')
              AND o.dept IS NOT NULL
              AND o.dept != ''
            GROUP BY o.dept
            ORDER BY o.dept
          `;

          const deptResult = await db.query(deptQuery);
          departmentList = deptResult.rows.map(row => row.dept).filter(dept => dept);

          console.log('=== 필터에 포함된 부서 목록 (재직자만) ===');
          deptResult.rows.forEach(row => {
            console.log(`  ✓ ${row.dept}: ${row.count}명`);
          });
          console.log(`총 ${departmentList.length}개 부서가 필터에 표시됩니다.`);

        } catch (deptError) {
          console.error('부서 목록 조회 오류:', deptError);
        }
      }

      console.log('추석 선물 모니터링 현황 조회 결과:', result.rows.length, '개');
      console.log('전체 사용자 수:', total, '명');

      const response = {
        success: true,
        chuseokGiftList: result.rows,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        limit: parseInt(limit)
      };

      if (departmentList) {
        response.departmentList = departmentList;
      }

      return response;

    } catch (error) {
      console.error('추석 선물 모니터링 현황 조회 오류:', error);
      throw error;
    }
  },

  // 추석 선물 모니터링 현황 요약 정보 조회 (대시보드 카드용)
  getChuseokGiftSummary: async (adminRole = '0', userId = null) => {
    try {
      console.log('추석 선물 모니터링 현황 요약 정보 조회 시작:', { adminRole, userId });
      console.log('조회 기준: hr.organization + aiagent_schema.birthday_message 조인 (추석 선물 수령 현황)');
      console.log('수령: tr_id에 _e 포함 + queue_name=gift');

      // 추석 선물 수령/미수령 사용자 수 조회
      const query = `
        SELECT
          COUNT(*) as total_count,
          SUM(CASE
            WHEN bm_gift.queue_name = 'gift'
              AND bm_gift.coupons IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM json_array_elements(bm_gift.coupons) AS e
                WHERE e->>'tr_id' LIKE '%\\_e%' ESCAPE '\\'
              )
            THEN 1
            ELSE 0
          END) as received_count
        FROM hr.organization o
        LEFT JOIN aiagent_schema.birthday_message bm_gift
          ON o.email = bm_gift.user_id
          AND bm_gift.queue_name = 'gift'
        WHERE o.is_worked = '재직'
          AND o.dept NOT IN ('TD팀', 'AMS팀', '총경리', '경영관리팀', '외부인력', '관리자 주소', 'admin')
          AND o.name IS NOT NULL
          AND o.name != ''
      `;

      console.log('추석 선물 모니터링 현황 요약 쿼리:', query);

      const result = await db.query(query);
      const summary = result.rows[0];

      const receivedCount = parseInt(summary.received_count) || 0;
      const totalCount = parseInt(summary.total_count) || 0;
      const notReceivedCount = totalCount - receivedCount;

      const summaryData = {
        received_count: receivedCount,
        not_received_count: notReceivedCount,
        total_count: totalCount
      };

      console.log('추석 선물 모니터링 현황 요약 조회 결과:', summaryData);

      return summaryData;

    } catch (error) {
      console.error('추석 선물 모니터링 현황 요약 조회 오류:', error);
      throw error;
    }
  },

};

// 시간 경과 계산 함수
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
}

// 관리자 활동 기록 함수
async function recordAdminActivity(userId, userName, action, error = null) {
  try {
    const query = `
      INSERT INTO aiagent_schema.admin_history (user_id, name, action, error, action_time)
      VALUES ($1, $2, $3, $4, NOW())
    `;
    
    await db.query(query, [userId, userName, action, error]);
    console.log('관리자 활동 기록 완료:', { userId, userName, action });
  } catch (err) {
    console.error('관리자 활동 기록 실패:', err);
    // 기록 실패해도 원래 작업에는 영향을 주지 않음
  }
}

module.exports = MainModel; 