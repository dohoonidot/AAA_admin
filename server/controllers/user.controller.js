const User = require('../models/user.model');

// 사용자 관련 컨트롤러 함수
const userController = {
  // 사용자 목록 조회
  getUsers: async (req, res) => {
    try {
      console.log('사용자 목록 요청 수신:', req.query);
      
      const {
        page = 1,
        limit = 50,
        dept,
        job_grade,
        job_position,
        permission,
        csr_search_div,
        search,
        is_worked
      } = req.query;

      // 필터링 옵션
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        dept,
        job_grade,
        job_position,
        search,
        is_worked  // 재직여부 필터 추가
      };

      // 숫자형 데이터는 문자열에서 숫자로 변환
      if (permission !== undefined) {
        options.permission = parseInt(permission);
      }

      if (csr_search_div !== undefined) {
        options.csr_search_div = parseInt(csr_search_div);
      }
      
      console.log('사용자 데이터 조회 시작:', options);
      
      const result = await User.findAll(options);
      
      console.log(`사용자 데이터 조회 성공: ${result.users.length}명 반환`);
      
      res.json(result);
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error);
      
      // 오류 세부 정보 로깅
      if (error.stack) {
        console.error('스택 트레이스:', error.stack);
      }
      
      res.status(500).json({ 
        message: '서버 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  // 사용자 상세 정보 조회
  getUserById: async (req, res) => {
    try {
      const userId = req.params.id;
      console.log(`사용자 상세 정보 요청: ID=${userId}`);
      
      const user = await User.findById(userId);
      
      if (!user) {
        console.log(`사용자 없음: ID=${userId}`);
        return res.status(404).json({ message: '해당 사용자를 찾을 수 없습니다.' });
      }
      
      console.log(`사용자 정보 조회 성공: ID=${userId}`);
      res.json(user);
    } catch (error) {
      console.error('사용자 상세 정보 조회 오류:', error);
      res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  }
};

module.exports = userController;
