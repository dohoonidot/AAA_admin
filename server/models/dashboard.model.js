const db = require('../config/db');

const Dashboard = {
  // 총 메시지 수 조회 - 전체 대화량 (사용자 질문 + AI 응답)
  getTotalMessages: async (startDate, endDate) => {
    try {
      console.log('=== 총 메시지 수 조회 디버깅 ===');
      console.log('조회 기간:', startDate, '~', endDate);
      
      // 🔍 DB 실제 데이터 날짜 범위 확인
      const dateRangeQuery = `
        SELECT 
          MIN(chat_time) as earliest_date,
          MAX(chat_time) as latest_date,
          COUNT(*) as total_records
        FROM aiagent_schema.archive_detail
        WHERE (is_csr = false OR is_csr IS NULL)
      `;
      const dateRangeResult = await db.query(dateRangeQuery);
      console.log('📅 DB 실제 데이터 범위:', dateRangeResult.rows[0]);
      
      // 최근 10개 데이터의 날짜 확인
      const recentDataQuery = `
        SELECT chat_time, user_id, role
        FROM aiagent_schema.archive_detail 
        WHERE (is_csr = false OR is_csr IS NULL)
        ORDER BY chat_time DESC 
        LIMIT 10
      `;
      const recentDataResult = await db.query(recentDataQuery);
      console.log('📋 최근 10개 데이터의 chat_time:');
      recentDataResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.chat_time} (user: ${row.user_id}, role: ${row.role})`);
      });
      
      // 1. 전체 archive_detail 데이터 수 확인
      const totalQuery = `SELECT COUNT(*) as total FROM aiagent_schema.archive_detail WHERE (is_csr = false OR is_csr IS NULL)`;
      const totalResult = await db.query(totalQuery);
      console.log('전체 archive_detail 레코드 수:', totalResult.rows[0].total);
      
      // 2. 해당 기간의 모든 데이터 확인
      const periodQuery = `
        SELECT COUNT(*) as period_total 
        FROM aiagent_schema.archive_detail 
        WHERE chat_time BETWEEN $1 AND $2
          AND (is_csr = false OR is_csr IS NULL)
      `;
      const periodResult = await db.query(periodQuery, [startDate, endDate]);
      console.log('해당 기간 전체 레코드 수:', periodResult.rows[0].period_total);
      
      // 3. 사용자 조인 후 데이터 확인
      const joinQuery = `
        SELECT COUNT(*) as join_total 
        FROM aiagent_schema.archive_detail ad
        JOIN aiagent_schema.user u ON ad.user_id = u.user_id
        WHERE ad.chat_time BETWEEN $1 AND $2
          AND (ad.is_csr = false OR ad.is_csr IS NULL)
      `;
      const joinResult = await db.query(joinQuery, [startDate, endDate]);
      console.log('사용자 조인 후 레코드 수:', joinResult.rows[0].join_total);
      
      // 4. 부서 필터 후 데이터 확인
      const deptQuery = `
        SELECT COUNT(*) as dept_total 
        FROM aiagent_schema.archive_detail ad
        JOIN aiagent_schema.user u ON ad.user_id = u.user_id
        WHERE ad.chat_time BETWEEN $1 AND $2
          AND u.dept NOT IN ('admin', 'Biz AI사업부')
          AND (ad.is_csr = false OR ad.is_csr IS NULL)
      `;
      const deptResult = await db.query(deptQuery, [startDate, endDate]);
      console.log('부서 필터 후 레코드 수:', deptResult.rows[0].dept_total);
      
      // 최종 쿼리 - 전체 대화량 (사용자 + AI 메시지)
      const query = `
        SELECT COUNT(*) as total_messages
        FROM aiagent_schema.archive_detail ad
        JOIN aiagent_schema.user u ON ad.user_id = u.user_id
        WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
          AND ad.chat_time BETWEEN $1 AND $2
          AND ad.message IS NOT NULL
          AND (ad.is_csr = false OR ad.is_csr IS NULL)
      `;
      
      const result = await db.query(query, [startDate, endDate]);
      const totalMessages = parseInt(result.rows[0].total_messages) || 0;
      console.log('최종 총 메시지 수 (사용자+AI):', totalMessages);
      console.log('=== 총 메시지 수 조회 완료 ===');
      
      return totalMessages;
    } catch (error) {
      console.error('총 메시지 수 조회 오류:', error);
      throw error;
    }
  },

  // 기간 접속자 수 조회 - 실제 질문한 사용자만 (사용자 메시지 기준)
  getTotalUsers: async (startDate, endDate) => {
    try {
      console.log('=== 기간 접속자 수 조회 디버깅 ===');
      console.log('조회 기간:', startDate, '~', endDate);
      
      // 시작일과 종료일이 같은 경우 해당 날짜의 접속자 수만 조회 (DB 형식 기준)
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // 현재 한국시간을 DB 저장 형식으로 변환
      const now = new Date();
      const koreaOffset = 9 * 60 * 60 * 1000;
      const koreaTime = new Date(now.getTime() + koreaOffset);
      
      const currentTimeAsUTC = new Date(
        koreaTime.getFullYear(),
        koreaTime.getMonth(), 
        koreaTime.getDate(),
        koreaTime.getHours(),
        koreaTime.getMinutes(),
        koreaTime.getSeconds(),
        koreaTime.getMilliseconds()
      );
      
      const todayStr = currentTimeAsUTC.toISOString().split('T')[0];
      const startDateStr = start.toISOString().split('T')[0];
      const endDateStr = end.toISOString().split('T')[0];
      
      console.log('🔍 getTotalUsers DB 형식 디버깅:');
      console.log('  현재 한국시간:', koreaTime.toISOString());
      console.log('  DB 형식 현재시간:', currentTimeAsUTC.toISOString());
      console.log('  오늘 날짜:', todayStr);
      console.log('  조회 날짜:', endDateStr);
      
      if (startDateStr === endDateStr) {
        console.log('하루 조회 모드');
        // 해당 날짜의 접속자 수 - 실제 질문한 사용자만
        const query = `
          SELECT COUNT(DISTINCT ad.user_id) as total_users
          FROM aiagent_schema.archive_detail ad
          JOIN aiagent_schema.user u ON ad.user_id = u.user_id
          WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
            AND ad.role = 0
            AND ad.chat_time BETWEEN $1 AND $2
            AND (ad.is_csr = false OR ad.is_csr IS NULL)
        `;
        
        const result = await db.query(query, [startDate, endDate]);
        const totalUsers = parseInt(result.rows[0].total_users) || 0;
        console.log('하루 기간 접속자 수 (질문한 사용자만):', totalUsers);
        console.log('=== 기간 접속자 수 조회 완료 ===');
        
        return totalUsers;
      } else {
        console.log('기간 범위 조회 모드');
        // 기간 범위의 고유 사용자 수 - 실제 질문한 사용자만
        const query = `
          SELECT COUNT(DISTINCT ad.user_id) as total_users
          FROM aiagent_schema.archive_detail ad
          JOIN aiagent_schema.user u ON ad.user_id = u.user_id
          WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
            AND ad.role = 0
            AND ad.chat_time BETWEEN $1 AND $2
            AND (ad.is_csr = false OR ad.is_csr IS NULL)
        `;
        
        const result = await db.query(query, [startDate, endDate]);
        const totalUsers = parseInt(result.rows[0].total_users) || 0;
        console.log('기간 범위 접속자 수 (질문한 사용자만):', totalUsers);
        console.log('=== 기간 접속자 수 조회 완료 ===');
        
        return totalUsers;
      }
    } catch (error) {
      console.error('누적 접속자 수 조회 오류:', error);
      throw error;
    }
  },

  // 오늘 접속자 수 조회 (중복 제거) - getTotalUsers와 완전히 동일한 시간대 처리 방식
  getTodayUsers: async () => {
    try {
      console.log('=== 오늘 접속자 수 조회 디버깅 ===');
      
      // getTotalUsers와 동일한 시간대 처리 방식
      const now = new Date();
      const koreaOffset = 9 * 60 * 60 * 1000;
      const koreaTime = new Date(now.getTime() + koreaOffset);
      const todayStr = koreaTime.toISOString().split('T')[0];
      
      // getTotalUsers와 동일한 방식: 한국시간을 UTC로 변환
      const startUTC = new Date(new Date(todayStr).getTime() - koreaOffset);
      const endDateTime = new Date(koreaTime.getTime() - koreaOffset);
      
      console.log('🔍 getTodayUsers UTC 변환 디버깅 (getTotalUsers 방식):');
      console.log('  현재 한국시간:', koreaTime.toISOString());
      console.log('  오늘 날짜 문자열:', todayStr);
      console.log('  시작 시간 (UTC):', startUTC.toISOString());
      console.log('  종료 시간 (UTC):', endDateTime.toISOString());
      console.log('  📌 getTotalUsers와 동일한 시간대 처리 방식 적용');

      // 오늘 접속자 수 조회 - 실제 질문한 사용자만 (getTotalUsers와 동일한 쿼리)
      const query = `
        SELECT COUNT(DISTINCT ad.user_id) as today_users
        FROM aiagent_schema.archive_detail ad
        JOIN aiagent_schema.user u ON ad.user_id = u.user_id
        WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
          AND ad.role = 0
          AND ad.chat_time BETWEEN $1 AND $2
          AND (ad.is_csr = false OR ad.is_csr IS NULL)
      `;
      
      const result = await db.query(query, [startUTC, endDateTime]);
      const todayUsers = parseInt(result.rows[0].today_users) || 0;
      console.log('오늘 접속자 수 (질문한 사용자만, UTC 기준):', todayUsers);
      console.log('=== 오늘 접속자 수 조회 완료 (getTotalUsers 방식) ===');
      
      return todayUsers;
    } catch (error) {
      console.error('오늘 접속자 수 조회 오류:', error);
      throw error;
    }
  },

  // 카테고리별 질문 횟수 조회
  getCategoryQuestions: async (startDate, endDate) => {
    try {
      const query = `
        SELECT 
          ad.category,
          COUNT(ad.message) as question_count
        FROM aiagent_schema.archive_detail ad
        JOIN aiagent_schema.user u ON ad.user_id = u.user_id
        WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
          AND ad.chat_time BETWEEN $1 AND $2
          AND (ad.is_csr = false OR ad.is_csr IS NULL)
        GROUP BY ad.category
        ORDER BY question_count DESC
      `;
      
      const result = await db.query(query, [startDate, endDate]);
      
      // 객체 형태로 변환
      const categoryData = {};
      result.rows.forEach(row => {
        if (row.category) {
          categoryData[row.category] = parseInt(row.question_count);
        }
      });
      
      return categoryData;
    } catch (error) {
      console.error('카테고리별 질문 횟수 조회 오류:', error);
      throw error;
    }
  },

  // 사용자별 채팅 횟수 조회 (모든 사용자)
  getUserChatCount: async (startDate, endDate) => {
    try {
      const query = `
        SELECT 
          u.name,
          u.dept,
          COUNT(ad.message) as chat_count
        FROM aiagent_schema.archive_detail ad
        JOIN aiagent_schema.user u ON ad.user_id = u.user_id
        WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
          AND ad.role = 0
          AND ad.chat_time BETWEEN $1 AND $2
          AND (ad.is_csr = false OR ad.is_csr IS NULL)
        GROUP BY u.name, u.dept
        ORDER BY chat_count DESC
      `;
      
      const result = await db.query(query, [startDate, endDate]);
      
      // 객체 형태로 변환 (클라이언트 기대 형식에 맞춤)
      const userChatData = {};
      result.rows.forEach(row => {
        userChatData[row.name] = {
          chatCount: parseInt(row.chat_count),
          department: row.dept
        };
      });
      
      return userChatData;
    } catch (error) {
      console.error('사용자별 채팅 횟수 조회 오류:', error);
      throw error;
    }
  },

  // 연령별 사용량 조회
  getAgeGroupUsage: async (startDate, endDate) => {
    try {
      console.log('=== 연령별 사용량 조회 시작 ===');
      console.log('조회 기간:', startDate, '~', endDate);
      
      const query = `
        SELECT 
          CASE 
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 20 AND 29 THEN '20-29세'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 30 AND 39 THEN '30-39세'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 40 AND 49 THEN '40-49세'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 50 AND 59 THEN '50-59세'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 60 AND 69 THEN '60-69세'
            ELSE '기타'
          END as age_group,
          COUNT(ad.message) as usage_count
        FROM aiagent_schema.archive_detail ad
        JOIN aiagent_schema.user u ON ad.user_id = u.user_id
        JOIN hr.view_hr hr ON u.user_id = hr.email
        WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
          AND ad.chat_time BETWEEN $1 AND $2
          AND hr.birth_date IS NOT NULL
          AND hr.is_worked = '재직'
          AND ad.message IS NOT NULL
          AND (ad.is_csr = false OR ad.is_csr IS NULL)
        GROUP BY age_group
        ORDER BY age_group
      `;
      
      const result = await db.query(query, [startDate, endDate]);
      console.log('연령별 사용량 쿼리 결과:', result.rows);
      
      // 객체 형태로 변환
      const ageGroupData = {};
      result.rows.forEach(row => {
        if (row.age_group && row.age_group !== '기타') {
          ageGroupData[row.age_group] = parseInt(row.usage_count) || 0;
        }
      });
      
      console.log('연령별 사용량 데이터:', ageGroupData);
      console.log('=== 연령별 사용량 조회 완료 ===');
      
      // 데이터가 비어있는 경우 기본값 반환
      if (Object.keys(ageGroupData).length === 0) {
        console.log('연령별 데이터가 없어 기본값을 반환합니다.');
        return {
          '20-29세': 0,
          '30-39세': 0,
          '40-49세': 0,
          '50-59세': 0,
          '60-69세': 0
        };
      }
      
      return ageGroupData;
    } catch (error) {
      console.error('연령별 사용량 조회 오류:', error);
      console.log('오류 발생으로 기본값을 반환합니다.');
      // 오류 발생 시 기본값 반환
      return {
        '20-29세': 0,
        '30-39세': 0,
        '40-49세': 0,
        '50-59세': 0,
        '60-69세': 0
      };
    }
  },

  // 연령별 전체 사용자 수 조회
  getAgeGroupTotalUsers: async () => {
    try {
      console.log('=== 연령별 전체 사용자 수 조회 시작 ===');

      const query = `
        SELECT
          CASE
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 20 AND 29 THEN '20-29세'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 30 AND 39 THEN '30-39세'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 40 AND 49 THEN '40-49세'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 50 AND 59 THEN '50-59세'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 60 AND 69 THEN '60-69세'
            ELSE '기타'
          END as age_group,
          COUNT(DISTINCT hr.email) as total_users
        FROM hr.view_hr hr
        WHERE hr.birth_date IS NOT NULL
          AND hr.is_worked = '재직'
        GROUP BY age_group
        ORDER BY age_group
      `;

      const result = await db.query(query);
      console.log('연령별 전체 사용자 수 쿼리 결과:', result.rows);

      const ageGroupTotalUsers = {};
      result.rows.forEach(row => {
        if (row.age_group && row.age_group !== '기타') {
          ageGroupTotalUsers[row.age_group] = parseInt(row.total_users) || 0;
        }
      });

      console.log('연령별 전체 사용자 수 데이터:', ageGroupTotalUsers);
      console.log('=== 연령별 전체 사용자 수 조회 완료 ===');

      return ageGroupTotalUsers;
    } catch (error) {
      console.error('연령별 전체 사용자 수 조회 오류:', error);
      throw error;
    }
  },

  // 연령별 활성 사용자 수 조회 (기간 내 1회 이상 메시지 보낸 사용자)
  getAgeGroupActiveUsers: async (startDate, endDate) => {
    try {
      console.log('=== 연령별 활성 사용자 수 조회 시작 ===');
      console.log('조회 기간:', startDate, '~', endDate);

      const query = `
        SELECT
          CASE
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 20 AND 29 THEN '20-29세'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 30 AND 39 THEN '30-39세'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 40 AND 49 THEN '40-49세'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 50 AND 59 THEN '50-59세'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 60 AND 69 THEN '60-69세'
            ELSE '기타'
          END as age_group,
          COUNT(DISTINCT ad.user_id) as active_users
        FROM aiagent_schema.archive_detail ad
        JOIN aiagent_schema.user u ON ad.user_id = u.user_id
        JOIN hr.view_hr hr ON u.user_id = hr.email
        WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
          AND ad.chat_time BETWEEN $1 AND $2
          AND hr.birth_date IS NOT NULL
          AND hr.is_worked = '재직'
          AND ad.message IS NOT NULL
          AND ad.role = 0 -- 사용자 메시지 기준
          AND (ad.is_csr = false OR ad.is_csr IS NULL)
        GROUP BY age_group
        ORDER BY age_group
      `;

      const result = await db.query(query, [startDate, endDate]);
      console.log('연령별 활성 사용자 수 쿼리 결과:', result.rows);

      const ageGroupActiveUsers = {};
      result.rows.forEach(row => {
        if (row.age_group && row.age_group !== '기타') {
          ageGroupActiveUsers[row.age_group] = parseInt(row.active_users) || 0;
        }
      });

      console.log('연령별 활성 사용자 수 데이터:', ageGroupActiveUsers);
      console.log('=== 연령별 활성 사용자 수 조회 완료 ===');

      return ageGroupActiveUsers;
    } catch (error) {
      console.error('연령별 활성 사용자 수 조회 오류:', error);
      throw error;
    }
  },

  // 연령별 평균 사용량 조회
  getAgeGroupAverageUsage: async (startDate, endDate) => {
    try {
      console.log('=== 연령별 평균 사용량 조회 시작 ===');
      const ageGroupUsage = await Dashboard.getAgeGroupUsage(startDate, endDate);
      const ageGroupTotalUsers = await Dashboard.getAgeGroupTotalUsers();

      const ageGroupAverageUsage = {};
      for (const ageGroup in ageGroupUsage) {
        if (ageGroupTotalUsers[ageGroup] && ageGroupTotalUsers[ageGroup] > 0) {
          ageGroupAverageUsage[ageGroup] = (ageGroupUsage[ageGroup] / ageGroupTotalUsers[ageGroup]).toFixed(2);
        } else {
          ageGroupAverageUsage[ageGroup] = 0;
        }
      }
      console.log('연령별 평균 사용량 데이터:', ageGroupAverageUsage);
      console.log('=== 연령별 평균 사용량 조회 완료 ===');
      return ageGroupAverageUsage;
    } catch (error) {
      console.error('연령별 평균 사용량 조회 오류:', error);
      throw error;
    }
  },

  // 연령별 사용률 조회
  getAgeGroupUsageRate: async (startDate, endDate) => {
    try {
      console.log('=== 연령별 사용률 조회 시작 ===');
      const ageGroupTotalUsers = await Dashboard.getAgeGroupTotalUsers();
      const ageGroupActiveUsers = await Dashboard.getAgeGroupActiveUsers(startDate, endDate);

      const ageGroupUsageRate = {};
      for (const ageGroup in ageGroupTotalUsers) {
        if (ageGroupTotalUsers[ageGroup] && ageGroupTotalUsers[ageGroup] > 0) {
          const activeUsers = ageGroupActiveUsers[ageGroup] || 0;
          ageGroupUsageRate[ageGroup] = ((activeUsers / ageGroupTotalUsers[ageGroup]) * 100).toFixed(2);
        } else {
          ageGroupUsageRate[ageGroup] = 0;
        }
      }
      console.log('연령별 사용률 데이터:', ageGroupUsageRate);
      console.log('=== 연령별 사용률 조회 완료 ===');
      return ageGroupUsageRate;
    } catch (error) {
      console.error('연령별 사용률 조회 오류:', error);
      throw error;
    }
  },

  // 오늘의 대화 수 조회 (main.model.js의 getTodayConversations와 동일한 로직)
  getTodayConversations: async () => {
    try {
      console.log('=== 오늘의 대화 수 조회 (dashboard) ===');
      
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const query = `
        SELECT COUNT(*) as today_conversations
        FROM aiagent_schema.archive_detail ad
        JOIN aiagent_schema.user u ON ad.user_id = u.user_id
        WHERE ad.chat_time >= $1 AND ad.chat_time < $2
          AND u.dept NOT IN ('admin', 'Biz AI사업부')
          AND ad.message IS NOT NULL
          AND (ad.is_csr = false OR ad.is_csr IS NULL)
      `;
      
      const result = await db.query(query, [todayStart, todayEnd]);
      const todayConversations = parseInt(result.rows[0].today_conversations) || 0;
      
      console.log('오늘의 대화 수 조회 결과:', todayConversations);
      console.log('=== 오늘의 대화 수 조회 완료 ===');
      
      return todayConversations;
    } catch (error) {
      console.error('오늘의 대화 수 조회 오류:', error);
      throw error;
    }
  },

  // 전체 대시보드 데이터 조회
  getDashboardData: async (startDate, endDate) => {
    try {
      const [
        totalMessages,
        totalUsers,
        todayUsers,
        todayConversations,
        categoryCount,
        userChatCount,
        ageGroupUsageData
      ] = await Promise.all([
        Dashboard.getTotalMessages(startDate, endDate),
        Dashboard.getTotalUsers(startDate, endDate),
        Dashboard.getTodayUsers(),
        Dashboard.getTodayConversations(),
        Dashboard.getCategoryQuestions(startDate, endDate),
        Dashboard.getUserChatCount(startDate, endDate),
        Dashboard.getAgeGroupUsage(startDate, endDate)
      ]);

      return {
        totalMessages,
        totalUsers,
        todayUsers,
        todayConversations,
        categoryCount,
        topUserChatCount: userChatCount,
        ageGroupUsageData
      };
    } catch (error) {
      console.error('대시보드 데이터 조회 오류:', error);
      throw error;
    }
  }
};

module.exports = Dashboard;
