/**
 * 로그아웃 및 페이지 이동 관련 디버깅 유틸리티
 */

// 로그아웃 상태 확인 함수
function checkLogoutStatus() {
    console.group('🔍 로그아웃 상태 확인');
    console.log('isLoggingOut 플래그:', window.isLoggingOut);
    console.log('AuthManager.isLoggedIn():', typeof AuthManager !== 'undefined' ? AuthManager.isLoggedIn() : 'AuthManager 없음');
    console.log('localStorage adminRole:', localStorage.getItem('adminRole'));
    console.log('localStorage userId:', localStorage.getItem('userId'));
    console.log('현재 URL:', window.location.href);
    console.log('현재 경로:', window.location.pathname);
    console.groupEnd();
}

// 로그아웃 시뮬레이션 함수
function simulateLogout() {
    console.log('🧪 로그아웃 시뮬레이션 시작');
    if (typeof AuthManager !== 'undefined') {
        AuthManager.logout();
    } else {
        console.log('⚠️ AuthManager가 없어 기본 로그아웃 처리');
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

// 페이지 이동 테스트 함수
function testNavigation() {
    console.group('🧪 네비게이션 테스트');
    const links = document.querySelectorAll('.sidebar-tabs a');
    console.log('발견된 네비게이션 링크:', links.length);
    links.forEach((link, index) => {
        console.log(`${index + 1}. ${link.textContent}: ${link.href}`);
    });
    console.groupEnd();
}

// 현재 페이지 정보 확인
function checkCurrentPage() {
    console.group('📄 현재 페이지 정보');
    console.log('URL:', window.location.href);
    console.log('Pathname:', window.location.pathname);
    console.log('Search:', window.location.search);
    console.log('Hash:', window.location.hash);
    console.log('Title:', document.title);
    console.groupEnd();
}

// 선물보내기 페이지 강제 이동 테스트
function testGiftsNavigation() {
    console.log('🎁 선물보내기 페이지 이동 테스트');
    console.log('현재 위치:', window.location.pathname);
    
    if (window.location.pathname.includes('/pages/')) {
        console.log('pages 폴더에서 gifts.html로 이동');
        window.location.href = 'gifts.html';
    } else {
        console.log('루트에서 pages/gifts.html로 이동');
        window.location.href = 'pages/gifts.html';
    }
}

// 로그인 상태 강제 확인
function forceCheckLogin() {
    console.group('🔐 강제 로그인 상태 확인');
    
    // localStorage 직접 확인
    const adminRole = localStorage.getItem('adminRole');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    
    console.log('localStorage 직접 확인:', {
        adminRole,
        userId,
        username,
        hasAdminRole: !!adminRole,
        hasUserId: !!userId
    });
    
    // AuthManager 확인
    if (typeof AuthManager !== 'undefined') {
        console.log('AuthManager 확인:', {
            isLoggedIn: AuthManager.isLoggedIn(),
            userInfo: AuthManager.getUserInfo(),
            permissions: AuthManager.getUserPermissions()
        });
    } else {
        console.log('AuthManager 없음');
    }
    
    console.groupEnd();
}

// 전역에서 사용 가능하도록 설정
window.checkLogoutStatus = checkLogoutStatus;
window.simulateLogout = simulateLogout;
window.testNavigation = testNavigation;
window.checkCurrentPage = checkCurrentPage;
window.testGiftsNavigation = testGiftsNavigation;
window.forceCheckLogin = forceCheckLogin;

// 페이지 로드 시 자동으로 상태 확인
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 디버그 유틸리티 로드됨');
    console.log('사용 가능한 함수:');
    console.log('- checkLogoutStatus(): 로그아웃 상태 확인');
    console.log('- simulateLogout(): 로그아웃 시뮬레이션');
    console.log('- testNavigation(): 네비게이션 링크 테스트');
    console.log('- checkCurrentPage(): 현재 페이지 정보 확인');
    console.log('- testGiftsNavigation(): 선물보내기 페이지 이동 테스트');
    console.log('- forceCheckLogin(): 강제 로그인 상태 확인');
}); 