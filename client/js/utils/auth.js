/**
 * 기업용 다중 사용자 인증 관리 유틸리티
 * 토큰, 사용자 정보, 권한 관리를 담당
 */
class AuthManager {
    // 토큰 관련 키 상수
    static TOKEN_KEY = 'accessToken';
    static USER_INFO_KEY = 'userInfo';
    static USER_PERMISSIONS_KEY = 'userPermissions';

    /**
     * 액세스 토큰 조회
     * @returns {string|null} JWT 토큰
     */
    static getAccessToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    /**
     * 액세스 토큰 저장
     * @param {string} token JWT 토큰
     */
    static setAccessToken(token) {
        if (token) {
            localStorage.setItem(this.TOKEN_KEY, token);
            console.log('✅ 액세스 토큰 저장 완료');
        } else {
            console.warn('⚠️ 빈 토큰은 저장할 수 없습니다');
        }
    }

    /**
     * 사용자 기본 정보 조회
     * @returns {Object|null} 사용자 정보
     */
    static getUserInfo() {
        const info = localStorage.getItem(this.USER_INFO_KEY);
        return info ? JSON.parse(info) : null;
    }

    /**
     * 사용자 기본 정보 저장
     * @param {Object} userInfo 사용자 정보
     */
    static setUserInfo(userInfo) {
        if (userInfo) {
            localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
            console.log('✅ 사용자 정보 저장 완료:', userInfo);
        }
    }

    /**
     * 사용자 권한 정보 조회
     * @returns {Object|null} 권한 정보
     */
    static getUserPermissions() {
        const perms = localStorage.getItem(this.USER_PERMISSIONS_KEY);
        return perms ? JSON.parse(perms) : null;
    }

    /**
     * 사용자 권한 정보 저장
     * @param {Object} permissions 권한 정보
     */
    static setUserPermissions(permissions) {
        if (permissions) {
            localStorage.setItem(this.USER_PERMISSIONS_KEY, JSON.stringify(permissions));
            console.log('✅ 권한 정보 저장 완료:', permissions);
        }
    }

    /**
     * 사용자 역할 조회
     * @returns {string|null} 사용자 역할 (1: 최고관리자, 2: 중간관리자, 3: 본부장, 4: 사업부장, 5: 일반위원)
     */
    static getUserRole() {
        const perms = this.getUserPermissions();
        return perms?.role || null;
    }

    /**
     * 사용자 이름 조회
     * @returns {string|null} 사용자 이름
     */
    static getUsername() {
        const userInfo = this.getUserInfo();
        return userInfo?.username || null;
    }

    /**
     * 사용자 ID 조회
     * @returns {string|null} 사용자 ID
     */
    static getUserId() {
        const userInfo = this.getUserInfo();
        return userInfo?.id || userInfo?.userId || null;
    }

    /**
     * 특정 기능에 대한 권한 확인
     * @param {string} feature 기능명
     * @returns {boolean} 권한 여부
     */
    static hasPermission(feature) {
        const perms = this.getUserPermissions();
        return perms?.features?.includes(feature) || false;
    }

    /**
     * 역할 기반 권한 확인
     * @param {string|Array} allowedRoles 허용된 역할 (배열 또는 문자열)
     * @returns {boolean} 권한 여부
     */
    static hasRole(allowedRoles) {
        const userRole = this.getUserRole();
        if (!userRole) return false;

        if (Array.isArray(allowedRoles)) {
            return allowedRoles.includes(userRole);
        }
        return userRole === allowedRoles;
    }

    /**
     * 관리자 권한 확인 (역할 1, 2)
     * @returns {boolean} 관리자 여부
     */
    static isAdmin() {
        return this.hasRole(['1', '2']);
    }

    /**
     * 매니저 권한 확인 (역할 3, 4)
     * @returns {boolean} 매니저 여부
     */
    static isManager() {
        return this.hasRole(['3', '4']);
    }

    /**
     * 로그인 여부 확인 (admin_role 기반)
     * @returns {boolean} 로그인 상태
     */
    static isLoggedIn() {
        // AuthManager 방식 확인
        const userInfo = this.getUserInfo();
        const permissions = this.getUserPermissions();
        const authManagerLoggedIn = !!(userInfo && permissions && permissions.role);
        
        // 기존 localStorage 방식 확인
        const adminRole = localStorage.getItem('adminRole');
        const userId = localStorage.getItem('userId');
        const localStorageLoggedIn = !!(adminRole && userId);
        
        console.log('🔐 로그인 상태 확인:', {
            authManagerLoggedIn,
            localStorageLoggedIn,
            userInfo: !!userInfo,
            permissions: !!permissions,
            adminRole,
            userId
        });
        
        return authManagerLoggedIn || localStorageLoggedIn;
    }

    /**
     * 로그인 처리 - 서버 응답 데이터와 입력 정보를 받아서 localStorage에 저장
     * @param {Object} responseData 로그인 API 응답 데이터
     * @param {Object} loginInput 로그인 입력 정보 (user_id, password)
     */
    static login(responseData, loginInput = {}) {
        console.log('🔐 [AuthManager] 로그인 처리 시작');
        console.log('🔐 [AuthManager] API 응답 데이터:', responseData);
        console.log('🔐 [AuthManager] 로그인 입력 정보:', { ...loginInput, password: '***' });

        // 토큰은 사용하지 않지만 기존 코드 호환성을 위해 빈 토큰 저장
        console.log('ℹ️ [AuthManager] 토큰 검증 없이 admin_role 기반 권한 관리');
        this.setAccessToken('no-token-required');

        // 사용자 기본 정보 저장 (API 응답에 사용자 정보가 없으므로 입력값 사용)
        const userInfo = {
            id: loginInput.user_id, // 입력한 user_id 사용
            userId: loginInput.user_id,
            username: loginInput.user_id,
            name: loginInput.user_id, // 이름 정보가 없으므로 user_id 사용
            department: null, // API에서 제공하지 않음
            email: loginInput.user_id.includes('@') ? loginInput.user_id : null // email 형식이면 email로 사용
        };
        this.setUserInfo(userInfo);

        // 권한 정보 저장 (숫자를 문자열로 변환)
        const rawRole = responseData.admin_role || responseData.role;
        const permissions = {
            role: String(rawRole), // 숫자를 문자열로 변환
            level: responseData.permission_level,
            features: responseData.allowed_features || this.getDefaultFeaturesByRole(rawRole)
        };
        this.setUserPermissions(permissions);

        console.log('✅ 로그인 처리 완료');
        return true;
    }

    /**
     * 역할에 따른 기본 기능 권한 설정
     * @param {string} role 사용자 역할
     * @returns {Array} 허용된 기능 목록
     */
    static getDefaultFeaturesByRole(role) {
        const roleFeatures = {
            '1': ['user_management', 'dashboard', 'conversations', 'gifts', 'system_settings'], // 최고관리자
            '2': ['user_management', 'dashboard', 'conversations', 'gifts'], // 중간관리자
            '3': ['dashboard', 'conversations', 'gifts'], // 본부장
            '4': ['dashboard', 'conversations', 'gifts'], // 사업부장
            '5': ['dashboard', 'conversations'] // 일반위원
        };
        return roleFeatures[role] || ['dashboard'];
    }

    /**
     * 로그아웃 처리
     * @param {boolean} redirectToLogin 로그인 페이지로 리다이렉트 여부
     */
    static logout(redirectToLogin = true) {
        console.log('🚪 로그아웃 처리 시작');
        
        // 진행 중인 API 요청들을 중단하기 위한 플래그 설정
        window.isLoggingOut = true;
        
        // 모든 저장된 데이터 삭제
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_INFO_KEY);
        localStorage.removeItem(this.USER_PERMISSIONS_KEY);
        
        // 기존 호환성을 위한 구 키들도 제거
        localStorage.removeItem('adminToken');
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('password');

        console.log('✅ 로그아웃 완료');

        if (redirectToLogin) {
            // 현재 페이지 위치에 따라 다른 경로로 이동
            const currentPath = window.location.pathname;
            console.log('📍 현재 경로:', currentPath);
            
            if (currentPath.includes('/pages/')) {
                console.log('🔄 pages 폴더에서 로그인 페이지로 이동');
                window.location.href = 'login.html';
            } else if (currentPath.includes('/client/')) {
                console.log('🔄 client 폴더에서 로그인 페이지로 이동');
                window.location.href = 'pages/login.html';
            } else {
                console.log('🔄 루트에서 로그인 페이지로 이동');
                window.location.href = 'pages/login.html';
            }
        }
    }

    /**
     * 사용자 표시용 텍스트 생성
     * @returns {string} 사용자 표시 텍스트
     */
    static getUserDisplayText() {
        const userInfo = this.getUserInfo();
        const permissions = this.getUserPermissions();
        
        if (!userInfo) return '';

        const roleTexts = {
            '1': '(최고 관리자)',
            '2': '(중간 관리자)', 
            '3': '(본부장)',
            '4': '(사업부장)',
            '5': '(일반 위원)'
        };

        const username = userInfo.name || userInfo.username;
        const roleText = roleTexts[permissions?.role] || '';
        
        return `${username}님 환영합니다 ${roleText}`.trim();
    }

    /**
     * 토큰 만료 여부 확인 (토큰 검증 안함)
     * @returns {boolean} 만료 여부 - 항상 false (토큰 검증 안함)
     */
    static isTokenExpired() {
        // 토큰 검증을 하지 않으므로 항상 유효한 것으로 간주
        return false;
    }

    /**
     * 개발용 디버그 정보 출력
     */
    static debugInfo() {
        console.group('🔍 AuthManager 디버그 정보');
        console.log('토큰:', this.getAccessToken()?.substring(0, 20) + '...');
        console.log('사용자 정보:', this.getUserInfo());
        console.log('권한 정보:', this.getUserPermissions());
        console.log('로그인 상태:', this.isLoggedIn());
        console.log('관리자 여부:', this.isAdmin());
        console.log('매니저 여부:', this.isManager());
        console.groupEnd();
    }
}

// 권한별 사이드바 메뉴 표시 제어 함수
function controlSidebarMenus() {
    const adminRole = localStorage.getItem('adminRole');
    const username = localStorage.getItem('username') || localStorage.getItem('userId');
    console.log('권한별 메뉴 제어 시작, 현재 권한:', adminRole);
    
    // 선물보내기 메뉴
    const giftsMenu = document.querySelector('a[href*="gifts.html"]');
    // 휴가 총괄 관리 메뉴
    const vacationMenu = document.querySelector('a[href*="vacation-admin.html"]');
    // 사용자 관리 메뉴
    const usersMenu = document.querySelector('a[href*="users.html"]');
    
    // 권한별 메뉴 표시/숨김 처리 (test_hne@aspnc.com 계정 예외 허용)
    const isTestUser = username === 'test_hne@aspnc.com';

    if ((adminRole === '3' || adminRole === '4' || adminRole === '5') && !isTestUser) {
        // 권한 3, 4, 5에서는 선물보내기와 휴가 총괄 관리 메뉴 숨김 (test_hne@aspnc.com 제외)
        if (giftsMenu) {
            giftsMenu.style.display = 'none';
            console.log('선물보내기 메뉴 숨김 (권한:', adminRole, ')');
        }
        if (vacationMenu) {
            vacationMenu.style.display = 'none';
            console.log('휴가 총괄 관리 메뉴 숨김 (권한:', adminRole, ')');
        }
    } else {
        // 권한 0, 1, 2 또는 test_hne@aspnc.com에서는 모든 메뉴 표시
        if (giftsMenu) {
            giftsMenu.style.display = 'block';
        }
        if (vacationMenu) {
            vacationMenu.style.display = 'block';
        }
    }
    
    // 권한 5에서는 사용자 관리 메뉴도 숨김
    if (adminRole === '5') {
        if (usersMenu) {
            usersMenu.style.display = 'none';
            console.log('사용자 관리 메뉴 숨김 (권한:', adminRole, ')');
        }
    } else {
        // 권한 0, 1, 2, 3, 4에서는 사용자 관리 메뉴 표시
        if (usersMenu) {
            usersMenu.style.display = 'block';
        }
    }
}

// 전역에서 사용 가능하도록 window 객체에 추가
window.AuthManager = AuthManager;
window.controlSidebarMenus = controlSidebarMenus;