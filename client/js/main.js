// 공통 기능
document.addEventListener('DOMContentLoaded', () => {
    // 네비게이션 이벤트 리스너
    setupNavigation();

    // 전역 에러 핸들러 설정
    setupGlobalErrorHandler();

    // 로그아웃 버튼 이벤트 리스너 설정
    setupLogoutButton();

    // 로그인 페이지가 아닐 경우에만 사용자 정보 표시
    if (!window.location.pathname.includes('login.html')) {
        setupUserInfo();
    }

    // 사이드바 드롭다운 기능 설정
    setupSidebarDropdown();
});

// URL 안전성 검사 함수
function isValidURL(url) {
    try {
        // 위험한 문자 패턴 체크
        const dangerousPatterns = [
            /%3C/gi,  // <
            /%3E/gi,  // >
            /%[^0-9A-Fa-f]/gi,  // 잘못된 URL 인코딩
            /javascript:/gi,  // XSS 방지
            /data:/gi,  // 데이터 URL 방지
            /vbscript:/gi  // VBScript 방지
        ];
        
        return !dangerousPatterns.some(pattern => pattern.test(url));
    } catch (error) {
        console.error('URL 검증 오류:', error);
        return false;
    }
}

// 전역 에러 핸들러 설정
function setupGlobalErrorHandler() {
    // fetch 요청 래퍼 함수
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        // URL 안전성 검사
        if (typeof url === 'string' && !isValidURL(url)) {
            console.error('안전하지 않은 URL이 감지되었습니다:', url);
            return Promise.reject(new Error('Invalid URL'));
        }
        
        return originalFetch.call(this, url, options)
            .catch(error => {
                if (error.message.includes('400') && url.includes('%3C')) {
                    console.error('URL 인코딩 오류가 감지되었습니다:', url);
                    // 페이지 새로고침으로 문제 해결 시도
                    return Promise.reject(new Error('URL encoding error - page will be refreshed'));
                }
                return Promise.reject(error);
            });
    };
    
    // 전역 에러 캐치
    window.addEventListener('error', (event) => {
        if (event.message && event.message.includes('%3C')) {
            console.error('URL 인코딩 관련 에러가 발생했습니다:', event.error);
            event.preventDefault();
        }
    });
    
    // Promise rejection 핸들러
    window.addEventListener('unhandledrejection', (event) => {
        if (event.reason && event.reason.message && event.reason.message.includes('URL encoding error')) {
            console.log('URL 인코딩 오류로 인한 페이지 새로고침...');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            event.preventDefault();
        }
    });
}

// 네비게이션 설정
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a, .sidebar-tabs a, .sidebar-tabs .sidebar-dropdown-item');
    console.log('🔧 네비게이션 설정 시작, 발견된 링크 수:', navLinks.length);
    
    navLinks.forEach((link, index) => {
        console.log(`🔗 링크 ${index + 1}: ${link.textContent} -> ${link.href}`);
        
        link.addEventListener('click', (e) => {
            console.log('🔗 네비게이션 링크 클릭:', {
                text: link.textContent,
                href: link.href,
                target: link.target,
                currentPath: window.location.pathname
            });
            
            // 로그인 상태 확인
            const adminRole = localStorage.getItem('adminRole');
            if (!adminRole) {
                console.warn('⚠️ 로그인되지 않은 상태 - 링크 이동 차단');
                e.preventDefault();
                alert('로그인이 필요합니다.');
                return;
            }
            
            // 링크 이동 전 로그
            console.log('✅ 페이지 이동 허용:', link.href);
            
            // 특별한 처리가 필요한 링크들
            if (link.href.includes('gifts.html')) {
                console.log('🎁 선물보내기 페이지로 이동 시도');
            }
        });
    });
}

// 로딩 표시
function showLoading(element) {
    element.innerHTML = '<div class="loading"></div>';
}

// 에러 메시지 표시
function showError(message) {
    console.error(message);
}

// 날짜 포맷팅
function formatDate(date) {
    return new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 모달 표시
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

// 모달 닫기
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// 모달 외부 클릭 시 닫기
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// 로그아웃 기능 설정
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // 로그아웃 확인 대화상자
            if (confirm('로그아웃 하시겠습니까?')) {
                // AuthManager가 있는지 확인
                if (typeof AuthManager !== 'undefined') {
                    AuthManager.logout();
                } else {
                    // AuthManager가 없는 경우 기본 로그아웃 처리
                    console.warn('⚠️ AuthManager가 없어 기본 로그아웃 처리 사용');
                    localStorage.clear();
                    const currentPath = window.location.pathname;
                    if (currentPath.includes('/pages/')) {
                        window.location.href = 'login.html';
                    } else {
                        window.location.href = 'pages/login.html';
                    }
                }
            }
        });
    }
}

// 사용자 정보 표시 설정
function setupUserInfo() {
    const usernameDisplay = document.getElementById('username-display');
    
    if (usernameDisplay && localStorage.getItem('adminRole')) {
        // localStorage 기반 사용자 정보 표시
        const username = localStorage.getItem('username') || localStorage.getItem('userId') || '사용자';
        const adminRole = localStorage.getItem('adminRole');
        const roleTexts = {
            '0': '(최고관리자)',
            '1': '(관리자_1)',
            '2': '(관리자_2)', 
            '3': '(본부장)',
            '4': '(사업부장)',
            '5': '(일반위원)'
        };
        const roleText = roleTexts[adminRole] || '';
        usernameDisplay.textContent = `${username}님 환영합니다 ${roleText}`.trim();
    }
    
    // 활동 토글 버튼 이벤트 리스너 설정
    setupActivityToggle();
}

// 활동 토글 기능 설정
function setupActivityToggle() {
    const toggleBtn = document.getElementById('activity-toggle-btn');
    const activityList = document.getElementById('activity-list');
    const toggleIcon = document.querySelector('.toggle-icon');

    if (toggleBtn && activityList) {
        toggleBtn.addEventListener('click', () => {
            const isVisible = activityList.style.display !== 'none';

            if (isVisible) {
                // 숨기기
                activityList.style.display = 'none';
                if (toggleIcon) {
                    toggleIcon.classList.remove('rotated');
                }
            } else {
                // 보이기
                activityList.style.display = 'block';
                if (toggleIcon) {
                    toggleIcon.classList.add('rotated');
                }
            }
        });
    }
}

// 사이드바 드롭다운 설정
function setupSidebarDropdown() {
    // 페이지 로드시 현재 페이지가 드롭다운 항목이면 드롭다운 열기 (이벤트 리스너 등록 전에 먼저 실행)
    const currentPath = window.location.pathname;

    // 사용자 관리 드롭다운
    if (currentPath.includes('users.html') || currentPath.includes('resigned-users.html')) {
        const dropdownToggles = document.querySelectorAll('.sidebar-tab-with-dropdown');
        dropdownToggles.forEach(toggle => {
            const dropdownContent = toggle.nextElementSibling;
            if (dropdownContent && dropdownContent.innerHTML.includes('재직자')) {
                toggle.classList.add('open');
                dropdownContent.classList.add('show');
            }
        });
    }

    // 휴가 총괄 관리 드롭다운
    if (currentPath.includes('vacation-')) {
        const dropdownToggles = document.querySelectorAll('.sidebar-tab-with-dropdown');
        dropdownToggles.forEach(toggle => {
            const dropdownContent = toggle.nextElementSibling;
            // "휴가 총괄 관리" 텍스트로 정확하게 찾기
            if (toggle.textContent.includes('휴가 총괄 관리')) {
                toggle.classList.add('open');
                dropdownContent.classList.add('show');
            }
        });
    }

    // 드롭다운 클릭 이벤트 설정
    const dropdownToggles = document.querySelectorAll('.sidebar-tab-with-dropdown');

    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const dropdownContent = toggle.nextElementSibling;
            const isOpen = toggle.classList.contains('open');

            // 클릭한 드롭다운만 토글 (다른 드롭다운은 건드리지 않음)
            if (isOpen) {
                toggle.classList.remove('open');
                if (dropdownContent) {
                    dropdownContent.classList.remove('show');
                }
            } else {
                toggle.classList.add('open');
                if (dropdownContent) {
                    dropdownContent.classList.add('show');
                }
            }
        });
    });

    // 드롭다운 아이템 클릭 시 드롭다운이 닫히지 않도록 방지
    const dropdownItems = document.querySelectorAll('.sidebar-dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });
}

// 대시보드 데이터 로딩 함수
async function loadDashboardData() {
    // 현재 페이지가 로그인 페이지인 경우, 대시보드 데이터 로딩 중단
    if (window.location.pathname.includes('login.html')) {
        console.log('로그인 페이지에서는 대시보드 데이터를 로드하지 않습니다.');
        return;
    }

    // 로그아웃 상태 확인
    if (!AuthManager.isLoggedIn()) {
        console.log('🚪 로그아웃 상태 - 대시보드 데이터 로드 중단');
        return;
    }

    const adminRole = localStorage.getItem('adminRole');
    const userId = localStorage.getItem('userId');
    
    console.log('=== loadDashboardData 시작 ===');
    console.log('adminRole:', adminRole, 'type:', typeof adminRole);
    console.log('userId:', userId, 'type:', typeof userId);
    
    // localStorage 디버그 정보
    console.log('localStorage 내용:', {
        adminRole: localStorage.getItem('adminRole'),
        userId: localStorage.getItem('userId'),
        username: localStorage.getItem('username')
    });
    
    if (adminRole !== '0' && adminRole !== '1' && adminRole !== '2' && adminRole !== '3' && adminRole !== '4') {
        console.log('실제 DB 조회 권한이 없음 - 기본 데이터 사용');
        return;
    }
    
    // role 3, 4인 경우 userId 필수 검증 강화
    if (adminRole === '3' || adminRole === '4') {
        console.log('role 3,4 감지 - userId 검증 시작');
        
        if (!userId || userId === 'null' || userId === 'undefined' || userId.trim() === '') {
            console.error('role 3,4이지만 userId가 유효하지 않습니다:', userId);
            
            // username으로 userId 복구 시도
            const username = localStorage.getItem('username');
            if (username && username !== 'null' && username !== 'undefined') {
                console.log('username으로 userId 복구 시도:', username);
                localStorage.setItem('userId', username);
                console.log('userId 복구 완료. 페이지 새로고침...');
                window.location.reload();
                return;
            }
            
            alert('사용자 정보가 없습니다. 다시 로그인해주세요.');
            localStorage.clear();
            window.location.href = 'pages/login.html';
            return;
        }
        
        console.log('role 3,4 userId 검증 통과:', userId);
    }
    
    try {
        console.log('실제 대시보드 데이터 로딩 시작 - adminRole:', adminRole, 'userId:', userId);
        
        // 로딩 상태 표시
        const totalUsersElement = document.getElementById('total-users');
        const todayConversationsElement = document.getElementById('today-conversations');
        const activeUsersElement = document.getElementById('active-users');
        
        if (totalUsersElement) totalUsersElement.textContent = '로딩중...';
        if (todayConversationsElement) todayConversationsElement.textContent = '로딩중...';
        if (activeUsersElement) activeUsersElement.textContent = '로딩중...';
        
        // API URL 구성
        let apiUrl = `/api/main/dashboard?adminRole=${adminRole}`;
        
        // role 3, 4인 경우 반드시 userId 추가
        if (adminRole === '3' || adminRole === '4') {
            apiUrl += `&userId=${encodeURIComponent(userId)}`;
        } else if (userId && userId !== 'null' && userId !== 'undefined') {
            // role 1, 2인 경우에도 있으면 추가
            apiUrl += `&userId=${encodeURIComponent(userId)}`;
        }
        
        console.log('API 호출 URL:', apiUrl);
        
        // 추가 헤더 설정
        const extraHeaders = {
            'admin-role': adminRole
        };
        
        // role 3, 4인 경우 user-id 헤더 추가
        if (adminRole === '3' || adminRole === '4') {
            extraHeaders['user-id'] = userId;
        }
        
        console.log('추가 헤더:', extraHeaders);
        
        // ApiClient를 사용한 API 호출
        const result = await ApiClient.get(apiUrl, { headers: extraHeaders });
        console.log('대시보드 데이터 응답:', result);
        
        if (result.success && result.data) {
            // 데이터 표시
            if (totalUsersElement) {
                totalUsersElement.textContent = result.data.totalUsers.toLocaleString();
            }
            if (todayConversationsElement) {
                todayConversationsElement.textContent = result.data.todayConversations.toLocaleString();
            }
            if (activeUsersElement) {
                activeUsersElement.textContent = result.data.activeUsers.toLocaleString();
            }
            
            // 최근 관리자 활동 업데이트
            if (result.data.recentActivities && result.data.recentActivities.length > 0) {
                updateRecentActivities(result.data.recentActivities);
            }
            
            console.log('대시보드 데이터 표시 완료');
        } else {
            throw new Error(result.message || '데이터 형식이 올바르지 않습니다.');
        }
        
    } catch (error) {
        console.error('❌ 대시보드 데이터 로딩 실패:', error.message);
        
        // 인증 오류인 경우 이미 리다이렉트 처리됨
        if (error.message.includes('인증이 만료') || error.message.includes('권한이 없습니다')) {
            return;
        }
        
        // 에러 시 기본값 표시
        const totalUsersElement = document.getElementById('total-users');
        const todayConversationsElement = document.getElementById('today-conversations');
        const activeUsersElement = document.getElementById('active-users');
        
        if (totalUsersElement) totalUsersElement.textContent = '오류';
        if (todayConversationsElement) todayConversationsElement.textContent = '오류';
        if (activeUsersElement) activeUsersElement.textContent = '오류';
        
        alert('대시보드 데이터를 불러오는데 실패했습니다: ' + error.message);
    }
}

// 최근 관리자 활동 목록 업데이트 함수
function updateRecentActivities(activities) {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    
    console.log('최근 관리자 활동 업데이트:', activities);
    
    // 기존 하드코딩된 활동 목록 제거
    activityList.innerHTML = '';
    
    // 실제 DB 데이터로 활동 목록 생성
    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        // 에러가 있는 경우 스타일 변경
        if (activity.hasError) {
            activityItem.classList.add('activity-error');
        }
        
        activityItem.innerHTML = `
            <div class="activity-text">${activity.text}</div>
            <div class="activity-time">${activity.time}</div>
            ${activity.user ? `<div class="activity-user">by ${activity.user}</div>` : ''}
        `;
        
        activityList.appendChild(activityItem);
    });
    
    // 활동이 없는 경우
    if (activities.length === 0) {
        const noActivityItem = document.createElement('div');
        noActivityItem.className = 'activity-item no-activity';
        noActivityItem.innerHTML = `
            <div class="activity-text">최근 관리자 활동이 없습니다.</div>
            <div class="activity-time">-</div>
        `;
        activityList.appendChild(noActivityItem);
    }
} 