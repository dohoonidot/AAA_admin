const db = require('../config/db');

const Organization = {
  getOrganizationTree: async () => {
    try {
      console.log('🗄️ 조직도 모델 getOrganizationTree 시작');
      
      // DB 연결 상태 확인
      console.log('🔍 DB 연결 상태 확인 중...');
      
      // view_hr 뷰에서 재직 중인 인원의 부서와 이름을 조회
      // email 컬럼을 사용하여 사용자를 식별합니다.
      const query = `
        SELECT email, dept, name
        FROM hr.view_hr
        WHERE is_worked = '재직'
        ORDER BY dept, name;
      `;
      
      console.log('📊 실행할 쿼리:', query);
      console.log('📊 DB 쿼리 실행 시작...');
      
      const result = await db.query(query);
      console.log('📊 쿼리 결과 전체:', result);
      console.log('📊 쿼리 결과 타입:', typeof result);
      console.log('📊 쿼리 결과 구조:', Object.keys(result));
      
      const rows = result.rows || result;
      console.log('📊 쿼리 결과 행 수:', rows ? rows.length : 0);
      
      if (!rows || rows.length === 0) {
        console.warn('⚠️ 조직도 데이터가 비어있습니다. 빈 배열을 반환합니다.');
        return [];
      }

      // 조회된 데이터를 조직도 형식으로 가공
      const organizationTree = [];
      let currentDepartment = null;

      rows.forEach(row => {
        if (!currentDepartment || currentDepartment.name !== row.dept) {
          // 새로운 부서가 시작되면 새 부서 객체 생성
          currentDepartment = {
            name: row.dept,
            members: []
          };
          organizationTree.push(currentDepartment);
        }
        // 현재 부서에 멤버 추가
        currentDepartment.members.push({
          email: row.email, // view_hr에서 email 컬럼 사용
          name: row.name
        });
      });

      console.log('✅ 조직도 트리 생성 완료. 부서 수:', organizationTree.length);
      organizationTree.forEach((dept, index) => {
        console.log(`  부서 ${index + 1}: ${dept.name} (${dept.members.length}명)`);
      });
      
      return organizationTree;
    } catch (error) {
      console.error('❌ 조직도 데이터 조회 및 가공 오류:', {
        name: error.name,
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        stack: error.stack
      });
      
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
      
      throw new Error(`조직도 데이터를 가져오는 데 실패했습니다: ${error.message}`);
    }
  }
};

module.exports = Organization;
