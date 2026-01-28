const MainModel = require('../models/main.model');

const MainController = {
  // 메인 대시보드 데이터 조회
  getDashboardData: async (req, res) => {
    try {
      console.log('메인 대시보드 데이터 조회 요청');
      
      // adminRole 확인 (헤더나 쿼리에서 가져올 수 있음)
      const adminRole = req.query.adminRole || req.headers['admin-role'];
      const userId = req.query.userId || req.headers['user-id'];
      
      console.log('사용자 adminRole:', adminRole, 'userId:', userId);
      
      if (adminRole === '0' || adminRole === '1') {
        // 최고 관리자인 경우 실제 DB 데이터 조회
        console.log('최고 관리자 - 실제 DB 데이터 조회 시작');
        const dashboardData = await MainModel.getAdminDashboardData(adminRole);

        console.log('메인 대시보드 데이터 조회 완료:', dashboardData);

        res.json({
          success: true,
          data: dashboardData,
          role: adminRole
        });
      } else if (adminRole === '2') {
        // 중간 관리자인 경우 실제 DB 데이터 조회 (role 3, 4 활동만)
        console.log('중간 관리자 - 실제 DB 데이터 조회 시작');
        const dashboardData = await MainModel.getAdminDashboardData(adminRole);
        
        console.log('메인 대시보드 데이터 조회 완료:', dashboardData);
        
        res.json({
          success: true,
          data: dashboardData,
          role: adminRole
        });
      } else if (adminRole === '3' || adminRole === '4') {
        // 본부장, 사업부장인 경우 소속 부서 데이터만 조회
        console.log(`관리자 role ${adminRole} - 부서별 DB 데이터 조회 시작`);
        
        // userId가 없는 경우 에러 반환
        if (!userId) {
          console.error(`role ${adminRole}이지만 userId가 제공되지 않았습니다.`);
          return res.status(400).json({
            success: false,
            message: '사용자 ID가 필요합니다. 다시 로그인해주세요.',
            error: 'userId is required for role 3,4'
          });
        }
        
        const dashboardData = await MainModel.getAdminDashboardData(adminRole, userId);
        
        console.log('메인 대시보드 데이터 조회 완료:', dashboardData);
        
        res.json({
          success: true,
          data: dashboardData,
          role: adminRole
        });
      } else {
        // 다른 권한인 경우 기본 데이터 반환
        console.log('일반 사용자 - 기본 데이터 반환');
        res.json({
          success: true,
          data: {
            totalUsers: 0,
            todayConversations: 0,
            activeUsers: 0
          },
          role: adminRole
        });
      }
      
    } catch (error) {
      console.error('메인 대시보드 데이터 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '대시보드 데이터를 조회하는 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // 관리자 활동 기록 컨트롤러
  recordActivity: async (req, res) => {
    try {
      const { userId, userName, action, targetUser, changes } = req.body;
      
      console.log('관리자 활동 기록 요청:', { userId, userName, action, targetUser, changes });
      
      // 변경 사항을 기반으로 상세한 action 메시지 생성
      let detailedAction = action;
      if (changes && Object.keys(changes).length > 0) {
        const changeDetails = [];
        
        for (const [field, change] of Object.entries(changes)) {
          const fieldName = getFieldKoreanName(field);
          changeDetails.push(`${fieldName}을(를) '${change.from}'에서 '${change.to}'로 변경`);
        }
        
        detailedAction = `${userName}이(가) ${targetUser}의 ${changeDetails.join(', ')}하였습니다.`;
      }
      
      // admin_history 테이블에 기록
      await MainModel.recordAdminActivity(userId, userName, detailedAction);
      
      res.json({
        success: true,
        message: '관리자 활동이 기록되었습니다.'
      });
      
    } catch (error) {
      console.error('관리자 활동 기록 실패:', error);
      res.status(500).json({
        success: false,
        message: '관리자 활동 기록 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // CSR 이상내역 목록 조회
  getCSRAbnormalList: async (req, res) => {
    try {
      const { page = 1, limit = 10, filter = 'all' } = req.query;
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];
      
      console.log('CSR 이상내역 조회 요청:', { page, limit, filter, adminRole, userId });
      
      const result = await MainModel.getCSRAbnormalList({
        page: parseInt(page),
        limit: parseInt(limit),
        filter,
        adminRole,
        userId
      });
      
      res.json(result);
    } catch (error) {
      console.error('CSR 이상내역 조회 오류:', error);
      res.status(500).json({ 
        message: 'CSR 이상내역 조회에 실패했습니다.',
        error: error.message 
      });
    }
  },

  // CSR 이상내역 개수 조회
  getCSRAbnormalCount: async (req, res) => {
    try {
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];
      
      console.log('CSR 이상내역 개수 조회 요청:', { adminRole, userId });
      
      const count = await MainModel.getCSRAbnormalCount(adminRole, userId);
      
      res.json({ count });
    } catch (error) {
      console.error('CSR 이상내역 개수 조회 오류:', error);
      res.status(500).json({ 
        message: 'CSR 이상내역 개수 조회에 실패했습니다.',
        error: error.message 
      });
    }
  },

  // CSR 상세 정보 조회
  getCSRDetailById: async (req, res) => {
    try {
      const { csrId } = req.params;
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];
      
      console.log('CSR 상세 정보 조회 요청:', { csrId, adminRole, userId });
      
      const result = await MainModel.getCSRDetailById(csrId, adminRole, userId);
      
      console.log('모델에서 받은 결과:', result);
      
      // 모델에서 이미 success 래퍼를 반환하므로 그대로 전달
      res.json(result);
    } catch (error) {
      console.error('CSR 상세 정보 조회 오류:', error);
      
      if (error.message.includes('찾을 수 없거나 접근 권한이 없습니다')) {
        res.status(404).json({ 
          success: false,
          message: 'CSR 정보를 찾을 수 없거나 접근 권한이 없습니다.',
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: 'CSR 상세 정보 조회에 실패했습니다.',
          error: error.message 
        });
      }
    }
  },

  // AAA 미사용자 목록 조회
  getUnusedUsersList: async (req, res) => {
    try {
      const { page = 1, limit = 30, days = 30, dept = null } = req.query;
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];
      
      console.log('AAA 미사용자 목록 조회 요청:', { page, limit, days, adminRole, userId, dept });
      
      // 권한 5는 AAA 미사용자 목록 조회 불가
      if (adminRole === '5') {
        return res.status(403).json({
          success: false,
          message: 'AAA 미사용자 목록 조회 권한이 없습니다.',
          error: '권한 부족'
        });
      }
      
      const result = await MainModel.getUnusedUsersList({
        page: parseInt(page),
        limit: parseInt(limit),
        days: parseInt(days),
        adminRole,
        userId,
        deptFilter: dept
      });
      
      res.json(result);
    } catch (error) {
      console.error('AAA 미사용자 목록 조회 오류:', error);
      res.status(500).json({ 
        success: false,
        message: 'AAA 미사용자 목록 조회에 실패했습니다.',
        error: error.message 
      });
    }
  },

  // AAA 미사용자 개수 조회
  getUnusedUsersCount: async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];
      
      console.log('AAA 미사용자 개수 조회 요청:', { days, adminRole, userId });
      
      // 권한 5는 AAA 미사용자 개수 조회 불가
      if (adminRole === '5') {
        return res.status(403).json({
          success: false,
          message: 'AAA 미사용자 개수 조회 권한이 없습니다.',
          error: '권한 부족'
        });
      }
      
      const count = await MainModel.getUnusedUsersCount(parseInt(days), adminRole, userId);
      
      res.json({ count });
    } catch (error) {
      console.error('AAA 미사용자 개수 조회 오류:', error);
      res.status(500).json({ 
        success: false,
        message: 'AAA 미사용자 개수 조회에 실패했습니다.',
        error: error.message 
      });
    }
  },

  // AAA 미사용자가 있는 부서 목록 조회
  getUnusedUsersDepartments: async (req, res) => {
    try {
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];
      
      console.log('AAA 미사용자 부서 목록 조회 요청:', { adminRole, userId });
      
      // 권한 5는 AAA 미사용자 부서 목록 조회 불가
      if (adminRole === '5') {
        return res.status(403).json({
          success: false,
          message: 'AAA 미사용자 부서 목록 조회 권한이 없습니다.',
          error: '권한 부족'
        });
      }
      
      const departments = await MainModel.getUnusedUsersDepartments(adminRole, userId);
      
      res.json({ departments });
    } catch (error) {
      console.error('AAA 미사용자 부서 목록 조회 오류:', error);
      res.status(500).json({ 
        success: false,
        message: 'AAA 미사용자 부서 목록 조회에 실패했습니다.',
        error: error.message 
      });
    }
  },

  // 사용자 앱 버전 내역 목록 조회
  getAppVersionList: async (req, res) => {
    try {
      const { page = 1, limit = 30, version = null, dept = null, consent = null } = req.query;
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];
      
      console.log('사용자 앱 버전 내역 목록 조회 요청:', { page, limit, adminRole, userId, version, dept, consent });
      
      // 권한 5는 사용자 앱 버전 내역 조회 불가
      if (adminRole === '5') {
        return res.status(403).json({
          success: false,
          message: '사용자 앱 버전 내역 조회 권한이 없습니다.',
          error: '권한 부족'
        });
      }
      
      const result = await MainModel.getAppVersionList({
        page: parseInt(page),
        limit: parseInt(limit),
        adminRole,
        userId,
        versionFilter: version,
        deptFilter: dept,
        consentFilter: consent
      });
      
      res.json(result);
    } catch (error) {
      console.error('사용자 앱 버전 내역 목록 조회 오류:', error);
      res.status(500).json({ 
        success: false,
        message: '사용자 앱 버전 내역 조회에 실패했습니다.',
        error: error.message 
      });
    }
  },

  // 사용자 앱 버전 요약 정보 조회 (대시보드 카드용)
  getAppVersionSummary: async (req, res) => {
    try {
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];
      
      console.log('사용자 앱 버전 요약 정보 조회 요청:', { adminRole, userId });
      
      // 권한 5는 사용자 앱 버전 요약 정보 조회 불가
      if (adminRole === '5') {
        return res.status(403).json({
          success: false,
          message: '사용자 앱 버전 요약 정보 조회 권한이 없습니다.',
          error: '권한 부족'
        });
      }
      
      const summaryData = await MainModel.getAppVersionSummary(adminRole, userId);
      
      res.json(summaryData);
    } catch (error) {
      console.error('사용자 앱 버전 요약 정보 조회 오류:', error);
      res.status(500).json({ 
        success: false,
        message: '사용자 앱 버전 요약 정보 조회에 실패했습니다.',
        error: error.message 
      });
    }
  },

  // 생일자 개인정보 동의 현황 목록 조회
  getPrivacyConsentList: async (req, res) => {
    try {
      const { page = 1, limit = 30, consent = null, dept = null, month = null, sort = null, senior_employee = null } = req.query;
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];
      
      console.log('생일자 개인정보 동의 현황 목록 조회 요청:', { page, limit, adminRole, userId, consent, dept, month, sort, senior_employee });
      
      // 권한 5는 생일자 개인정보 동의 현황 조회 불가
      if (adminRole === '5') {
        return res.status(403).json({
          success: false,
          message: '생일자 개인정보 동의 현황 조회 권한이 없습니다.',
          error: '권한 부족'
        });
      }
      
      const result = await MainModel.getPrivacyConsentList({
        page: parseInt(page),
        limit: parseInt(limit),
        adminRole,
        userId,
        consentFilter: consent,
        deptFilter: dept,
        monthFilter: month,
        sortOrder: sort,
        seniorEmployeeFilter: senior_employee
      });
      
      res.json(result);
    } catch (error) {
      console.error('개인정보 동의 현황 목록 조회 오류:', error);
      res.status(500).json({ 
        success: false,
        message: '개인정보 동의 현황 조회에 실패했습니다.',
        error: error.message 
      });
    }
  },

  // 월별 생일자 인원수 조회
  getBirthdayCountByMonth: async (req, res) => {
    try {
      const { dept = null, consent = null, senior_employee = null } = req.query;
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];
      
      console.log('월별 생일자 인원수 조회 요청:', { adminRole, userId, dept, consent, senior_employee });
      
      // 권한 5는 월별 생일자 인원수 조회 불가
      if (adminRole === '5') {
        return res.status(403).json({
          success: false,
          message: '월별 생일자 인원수 조회 권한이 없습니다.',
          error: '권한 부족'
        });
      }
      
      const monthCounts = await MainModel.getBirthdayCountByMonth(adminRole, userId, dept, consent, senior_employee);
      
      res.json({
        success: true,
        monthCounts
      });
    } catch (error) {
      console.error('월별 생일자 인원수 조회 오류:', error);
      res.status(500).json({ 
        success: false,
        message: '월별 생일자 인원수 조회에 실패했습니다.',
        error: error.message 
      });
    }
  },

  // 생일자 개인정보 동의 현황 요약 정보 조회 (대시보드 카드용)
  getPrivacyConsentSummary: async (req, res) => {
    try {
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];
      
      console.log('개인정보 동의 현황 요약 정보 조회 요청:', { adminRole, userId });
      
      // 권한 5는 개인정보 동의 현황 요약 정보 조회 불가
      if (adminRole === '5') {
        return res.status(403).json({
          success: false,
          message: '개인정보 동의 현황 요약 정보 조회 권한이 없습니다.',
          error: '권한 부족'
        });
      }
      
      const summaryData = await MainModel.getPrivacyConsentSummary(adminRole, userId);
      
      res.json(summaryData);
    } catch (error) {
      console.error('개인정보 동의 현황 요약 정보 조회 오류:', error);
      res.status(500).json({ 
        success: false,
        message: '개인정보 동의 현황 요약 정보 조회에 실패했습니다.',
        error: error.message 
      });
    }
  },

  // v1.2.0 사용자 수 주간 비교 조회
  getV120WeeklyComparison: async (req, res) => {
    try {
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];

      console.log('v1.2.0 사용자 수 주간 비교 조회 요청:', { adminRole, userId });

      // 권한 5는 v1.2.0 사용자 수 주간 비교 조회 불가
      if (adminRole === '5') {
        return res.status(403).json({
          success: false,
          message: 'v1.2.0 사용자 수 주간 비교 조회 권한이 없습니다.',
          error: '권한 부족'
        });
      }

      const comparisonData = await MainModel.getV120WeeklyComparison(adminRole, userId);

      res.json({
        success: true,
        data: comparisonData
      });
    } catch (error) {
      console.error('v1.2.0 사용자 수 주간 비교 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: 'v1.2.0 사용자 수 주간 비교 조회에 실패했습니다.',
        error: error.message
      });
    }
  },

  // v1.2.1 사용자 수 주간 비교 조회
  getV121WeeklyComparison: async (req, res) => {
    try {
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];

      console.log('v1.2.1 사용자 수 주간 비교 조회 요청:', { adminRole, userId });

      // 권한 5는 v1.2.1 사용자 수 주간 비교 조회 불가
      if (adminRole === '5') {
        return res.status(403).json({
          success: false,
          message: 'v1.2.1 사용자 수 주간 비교 조회 권한이 없습니다.',
          error: '권한 부족'
        });
      }

      const comparisonData = await MainModel.getV121WeeklyComparison(adminRole, userId);

      res.json({
        success: true,
        data: comparisonData
      });
    } catch (error) {
      console.error('v1.2.1 사용자 수 주간 비교 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: 'v1.2.1 사용자 수 주간 비교 조회에 실패했습니다.',
        error: error.message
      });
    }
  },

  // v1.3.0 사용자 수 주간 비교 조회
  getV130WeeklyComparison: async (req, res) => {
    try {
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];

      console.log('v1.3.0 사용자 수 주간 비교 조회 요청:', { adminRole, userId });

      // 권한 5는 v1.3.0 사용자 수 주간 비교 조회 불가
      if (adminRole === '5') {
        return res.status(403).json({
          success: false,
          message: 'v1.3.0 사용자 수 주간 비교 조회 권한이 없습니다.',
          error: '권한 부족'
        });
      }

      const comparisonData = await MainModel.getV130WeeklyComparison(adminRole, userId);

      res.json({
        success: true,
        data: comparisonData
      });
    } catch (error) {
      console.error('v1.3.0 사용자 수 주간 비교 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: 'v1.3.0 사용자 수 주간 비교 조회에 실패했습니다.',
        error: error.message
      });
    }
  },

  // v1.3.1 사용자 수 주간 비교 조회
  getV131WeeklyComparison: async (req, res) => {
    try {
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];

      console.log('v1.3.1 사용자 수 주간 비교 조회 요청:', { adminRole, userId });

      // 권한 5는 v1.3.1 사용자 수 주간 비교 조회 불가
      if (adminRole === '5') {
        return res.status(403).json({
          success: false,
          message: 'v1.3.1 사용자 수 주간 비교 조회 권한이 없습니다.',
          error: '권한 부족'
        });
      }

      const comparisonData = await MainModel.getV131WeeklyComparison(adminRole, userId);

      res.json({
        success: true,
        data: comparisonData
      });
    } catch (error) {
      console.error('v1.3.1 사용자 수 주간 비교 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: 'v1.3.1 사용자 수 주간 비교 조회에 실패했습니다.',
        error: error.message
      });
    }
  },

  // AAA 미사용자 수 주간 비교 조회
  getUnusedUsersWeeklyComparison: async (req, res) => {
    try {
      const adminRole = req.headers['x-admin-role'] || '0';
      const userId = req.headers['x-user-id'];

      console.log('AAA 미사용자 수 주간 비교 조회 요청:', { adminRole, userId });

      // 권한 5는 AAA 미사용자 수 주간 비교 조회 불가
      if (adminRole === '5') {
        return res.status(403).json({
          success: false,
          message: 'AAA 미사용자 수 주간 비교 조회 권한이 없습니다.',
          error: '권한 부족'
        });
      }

      const comparisonData = await MainModel.getUnusedUsersWeeklyComparison(adminRole, userId);

      res.json({
        success: true,
        data: comparisonData
      });
    } catch (error) {
      console.error('AAA 미사용자 수 주간 비교 조회 오류:', error);
      res.status(500).json({
        success: false,
        message: 'AAA 미사용자 수 주간 비교 조회에 실패했습니다.',
        error: error.message
      });
    }
  }
};

// 필드명을 한국어로 변환하는 함수
function getFieldKoreanName(field) {
  const fieldNames = {
    'department': '부서',
    'position': '직급',
    'title': '직책',
    'role': '권한',
    'csr': 'CSR 권한',
    'adminRole': '관리 권한',
    'name': '이름',
    'loginId': '로그인 ID'
  };

  return fieldNames[field] || field;
}

// 추석 선물 모니터링 현황 목록 조회
MainController.getChuseokGiftList = async (req, res) => {
  try {
    console.log('추석 선물 모니터링 현황 목록 조회 요청:', req.query);

    const {
      page = 1,
      limit = 30,
      dept = null,
      gift_status = null
    } = req.query;

    const adminRole = req.headers['x-admin-role'] || req.headers['admin-role'] || '0';
    const userId = req.headers['x-user-id'] || req.headers['user-id'] || null;

    console.log('권한 정보:', { adminRole, userId, gift_status });

    // 권한 5는 추석 선물 모니터링 현황 조회 불가
    if (adminRole === '5') {
      return res.status(403).json({
        success: false,
        message: '추석 선물 모니터링 현황 조회 권한이 없습니다.',
        error: '권한 부족'
      });
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      adminRole,
      userId,
      deptFilter: dept,
      giftStatusFilter: gift_status
    };

    const result = await MainModel.getChuseokGiftList(options);

    console.log('추석 선물 모니터링 현황 목록 조회 완료');

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('추석 선물 모니터링 현황 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '추석 선물 모니터링 현황 조회에 실패했습니다.',
      error: error.message
    });
  }
};

// 추석 선물 모니터링 현황 요약 정보 조회
MainController.getChuseokGiftSummary = async (req, res) => {
  try {
    console.log('추석 선물 모니터링 현황 요약 정보 조회 요청');

    const adminRole = req.headers['x-admin-role'] || req.headers['admin-role'] || '0';
    const userId = req.headers['x-user-id'] || req.headers['user-id'] || null;

    console.log('권한 정보:', { adminRole, userId });

    const result = await MainModel.getChuseokGiftSummary(adminRole, userId);

    console.log('추석 선물 모니터링 현황 요약 정보 조회 완료:', result);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('추석 선물 모니터링 현황 요약 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '추석 선물 모니터링 현황 요약 정보 조회에 실패했습니다.',
      error: error.message
    });
  }
};

module.exports = MainController; 