const Dashboard = require('../models/dashboard.model');

// 종료일 처리 공통 함수 - DB UTC 저장 방식에 맞춘 처리
function getEndDateTime(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // 현재 한국시간 계산
  const now = new Date();
  const koreaOffset = 9 * 60 * 60 * 1000;
  const koreaTime = new Date(now.getTime() + koreaOffset);
  
  // 한국시간을 UTC로 변환 (DB 저장 방식)
  const currentTimeUTC = new Date(koreaTime.getTime() - koreaOffset);
  const todayKoreaStr = koreaTime.toISOString().split('T')[0];
  
  const startDateStr = start.toISOString().split('T')[0];
  const endDateStr = end.toISOString().split('T')[0];
  
  console.log('🔍 DB UTC 기준 디버깅:');
  console.log('  현재 한국시간:', koreaTime.toISOString());
  console.log('  현재 UTC 시간:', currentTimeUTC.toISOString());
  console.log('  오늘 날짜 (한국 기준):', todayKoreaStr);
  console.log('  조회 날짜:', endDateStr);
  console.log('  날짜 비교 결과:', endDateStr === todayKoreaStr);
  
  // 시작일과 종료일이 같은 경우
  if (startDateStr === endDateStr) {
    if (endDateStr === todayKoreaStr) {
      // 🕐 오늘인 경우: 한국시간 현재시간을 UTC로 변환
      console.log('🕐 오늘 하루 조회 모드: 한국시간 기준으로 UTC 변환');
      return currentTimeUTC; // 한국시간을 UTC로 변환한 현재 시간
    } else {
      // 🕐 과거 날짜인 경우: 해당 날짜의 23:59:59까지 (UTC로 변환)
      console.log('🕐 과거 하루 조회 모드: 한국시간 23:59:59를 UTC로 변환');
      const endDateTime = new Date(end);
      endDateTime.setHours(23, 59, 59, 999);
      // 한국시간을 UTC로 변환
      return new Date(endDateTime.getTime() - koreaOffset);
    }
  } else {
    // 🕐 기간 범위 조회: 종료일의 23:59:59까지 (UTC로 변환)
    console.log('🕐 기간 범위 조회 모드: 한국시간을 UTC로 변환');
    const endDateTime = new Date(end);
    endDateTime.setHours(23, 59, 59, 999);
    return new Date(endDateTime.getTime() - koreaOffset);
  }
}

const DashboardController = {
  // 대시보드 데이터 조회
  getDashboardData: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // 날짜 파라미터 검증
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '시작일과 종료일을 모두 제공해야 합니다.'
        });
      }
      
      // 날짜 형식 검증
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: '올바른 날짜 형식을 사용해주세요. (YYYY-MM-DD)'
        });
      }
      
      if (start > end) {
        return res.status(400).json({
          success: false,
          message: '시작일은 종료일보다 이전이어야 합니다.'
        });
      }
      
      // 시작일과 종료일을 UTC로 변환
      const koreaOffset = 9 * 60 * 60 * 1000;
      const startUTC = new Date(start.getTime() - koreaOffset);
      const endDateTime = getEndDateTime(startDate, endDate);
      
      // 처리된 시간 범위 로그 (UTC 기준)
      const now = new Date();
      const koreaTime = new Date(now.getTime() + koreaOffset);
      const todayKoreaStr = koreaTime.toISOString().split('T')[0];
      
      if (startDate === endDate) {
        if (endDate === todayKoreaStr) {
          console.log(`📊 오늘(${startDate}) 하루 데이터 조회: ${startUTC.toISOString()} ~ ${endDateTime.toISOString()} [UTC 기준]`);
        } else {
          console.log(`📊 ${startDate} 하루 데이터 조회: ${startUTC.toISOString()} ~ ${endDateTime.toISOString()} [UTC 기준]`);
        }
      } else {
        console.log(`📊 기간 데이터 조회: ${startUTC.toISOString()} ~ ${endDateTime.toISOString()} [UTC 기준]`);
      }
      
      // 대시보드 데이터 조회 (UTC 시간으로)
      const dashboardData = await Dashboard.getDashboardData(startUTC, endDateTime);
      
      console.log('대시보드 데이터 조회 완료:', {
        totalMessages: dashboardData.totalMessages,
        totalUsers: dashboardData.totalUsers,
        todayUsers: dashboardData.todayUsers,
        categoryCount: Object.keys(dashboardData.categoryCount).length,
        userChatCount: Object.keys(dashboardData.topUserChatCount).length,
        ageGroupUsage: Object.keys(dashboardData.ageGroupUsageData || {}).length
      });
      
      console.log('🔍 서버 응답 데이터 구조 확인:', {
        hasAgeGroupUsageData: !!dashboardData.ageGroupUsageData,
        ageGroupUsageData: dashboardData.ageGroupUsageData
      });
      
      res.json({
        success: true,
        data: dashboardData,
        period: {
          startDate,
          endDate
        }
      });
      
    } catch (error) {
      console.error('대시보드 데이터 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '대시보드 데이터를 조회하는 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // 개별 통계 조회 API들
  getTotalMessages: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '시작일과 종료일을 모두 제공해야 합니다.'
        });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // 종료일 처리
      const endDateTime = getEndDateTime(startDate, endDate);
      
      const totalMessages = await Dashboard.getTotalMessages(start, endDateTime);
      
      res.json({
        success: true,
        data: { totalMessages }
      });
      
    } catch (error) {
      console.error('총 메시지 수 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '총 메시지 수를 조회하는 중 오류가 발생했습니다.'
      });
    }
  },

  getCategoryQuestions: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '시작일과 종료일을 모두 제공해야 합니다.'
        });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // 종료일 처리
      const endDateTime = getEndDateTime(startDate, endDate);
      
      const categoryCount = await Dashboard.getCategoryQuestions(start, endDateTime);
      
      res.json({
        success: true,
        data: { categoryCount }
      });
      
    } catch (error) {
      console.error('카테고리별 질문 횟수 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '카테고리별 질문 횟수를 조회하는 중 오류가 발생했습니다.'
      });
    }
  },

  getUserChatCount: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '시작일과 종료일을 모두 제공해야 합니다.'
        });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // 종료일 처리
      const endDateTime = getEndDateTime(startDate, endDate);
      
      const userChatCount = await Dashboard.getUserChatCount(start, endDateTime);
      
      res.json({
        success: true,
        data: { userChatCount }
      });
      
    } catch (error) {
      console.error('사용자별 채팅 횟수 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '사용자별 채팅 횟수를 조회하는 중 오류가 발생했습니다.'
      });
    }
  },

  getAgeGroupUsage: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '시작일과 종료일을 모두 제공해야 합니다.'
        });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // 종료일 처리
      const endDateTime = getEndDateTime(startDate, endDate);
      
      const ageGroupUsageData = await Dashboard.getAgeGroupUsage(start, endDateTime);
      
      res.json({
        success: true,
        data: { ageGroupUsageData }
      });
      
    } catch (error) {
      console.error('연령별 사용량 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '연령별 사용량을 조회하는 중 오류가 발생했습니다.'
      });
    }
  },

  // 연령별 평균 사용량 조회
  getAgeGroupAverageUsageData: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '시작일과 종료일을 모두 제공해야 합니다.'
        });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // 종료일 처리
      const endDateTime = getEndDateTime(startDate, endDate);
      
      const ageGroupAverageUsageData = await Dashboard.getAgeGroupAverageUsage(start, endDateTime);
      
      res.json({
        success: true,
        data: { ageGroupAverageUsageData }
      });
      
    } catch (error) {
      console.error('연령별 평균 사용량 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '연령별 평균 사용량을 조회하는 중 오류가 발생했습니다.'
      });
    }
  },

  // 연령별 사용률 조회
  getAgeGroupUsageRateData: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '시작일과 종료일을 모두 제공해야 합니다.'
        });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // 종료일 처리
      const endDateTime = getEndDateTime(startDate, endDate);
      
      const ageGroupUsageRateData = await Dashboard.getAgeGroupUsageRate(start, endDateTime);
      
      res.json({
        success: true,
        data: { ageGroupUsageRateData }
      });
      
    } catch (error) {
      console.error('연령별 사용률 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '연령별 사용률을 조회하는 중 오류가 발생했습니다.'
      });
    }
  }
};

module.exports = DashboardController;
