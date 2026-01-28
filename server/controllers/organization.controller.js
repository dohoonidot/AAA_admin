const Organization = require('../models/organization.model');

const organizationController = {
  getOrganizationTree: async (req, res) => {
    try {
      console.log('🏢 조직도 컨트롤러 시작');
      
      // 헤더나 쿼리 파라미터에서 권한 정보 확인
      const adminRole = req.headers['x-admin-role'] || req.query.adminRole;
      const userId = req.headers['x-user-id'] || req.query.userId;
      
      console.log('👤 요청 권한 정보:', { adminRole, userId });
      
      // 기본적인 권한 체크 (admin_role이 있으면 허용)
      if (!adminRole) {
        return res.status(401).json({ 
          success: false, 
          message: '권한 정보가 필요합니다.' 
        });
      }
      
      const organizationTree = await Organization.getOrganizationTree();
      console.log('✅ 조직도 데이터 조회 성공. 부서 수:', organizationTree.length);
      
      res.json({ success: true, data: organizationTree });
    } catch (error) {
      console.error('❌ 조직도 API 오류:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        success: false, 
        message: '조직도 데이터를 가져오는 데 실패했습니다.' 
      });
    }
  }
};

module.exports = organizationController;
