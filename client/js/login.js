// 스크립트 로드 확인
console.log('login.js 파일 로드됨');

// 로그인 API URL (로컬 프록시 사용 - CORS 회피)
const LOGIN_API_URL = '/admin';

// DOM 로드 완료 확인
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 로드 완료');
    
    const loginForm = document.getElementById('login-form');
    if (!loginForm) {
        console.error('로그인 폼을 찾을 수 없습니다!');
        return;
    }
    console.log('로그인 폼 찾음');

    // 로그인 폼 제출 이벤트 처리
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('폼 제출 이벤트 발생');
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');

        console.group('로그인 시도');
        console.log('입력 정보:', { username });
        console.time('로그인 처리 시간');

        // 입력값 검증
        if (!username || !password) {
            console.warn('입력값 검증 실패: 아이디 또는 비밀번호가 비어있음');
            errorMessage.textContent = '아이디와 비밀번호를 모두 입력하세요.';
            errorMessage.style.display = 'block';
            console.groupEnd();
            return;
        }
        console.log('입력값 검증 통과');

        // 로그인 시도 중 메시지 표시
        errorMessage.textContent = '로그인 중...';
        errorMessage.style.display = 'block';
        errorMessage.className = 'message-info';

        try {
            // API 로그인 요청 데이터
            const loginData = {
                user_id: username,
                password: password
            };
            console.log('API 요청 준비:', {
                url: `${LOGIN_API_URL}/login`,
                method: 'POST',
                data: { ...loginData, password: '****' }
            });

            // API 호출
            console.log('API 요청 시작...');
            const response = await fetch(`${LOGIN_API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            console.log('API 응답 수신:', {
                status: response.status,
                statusText: response.statusText
            });

            // 응답 처리
            const data = await response.json();
            console.log('🔍 [디버그] 로그인 API 전체 응답:', data);
            console.log('🔍 [디버그] 응답 데이터 타입:', typeof data);
            console.log('🔍 [디버그] 응답 키들:', Object.keys(data));
            
            // 모든 필드를 상세히 로그
            for (const [key, value] of Object.entries(data)) {
                console.log(`🔍 [디버그] ${key}:`, value, `(${typeof value})`);
            }

            if (data.status_code === 200) {
                console.log('✅ 로그인 성공');
                console.log('📋 관리자 권한:', data.admin_role);
                console.log('📋 서버 응답 전체:', data);
                // localStorage에 직접 로그인 정보 저장
                localStorage.setItem('adminRole', String(data.admin_role));
                localStorage.setItem('userId', username);
                localStorage.setItem('username', username);
                
                console.log('✅ localStorage 로그인 처리 완료:', {
                    adminRole: localStorage.getItem('adminRole'),
                    userId: localStorage.getItem('userId'),
                    username: localStorage.getItem('username')
                });
                // 메인 페이지로 이동
                console.log('메인 페이지로 이동...');
                window.location.href = '../index.html';
            } else {
                console.warn('로그인 실패:', data.error);
                // 로그인 실패 시 에러 메시지 표시
                errorMessage.className = 'error-message';
                errorMessage.textContent = data.error || '로그인에 실패했습니다.';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('로그인 처리 중 오류 발생:', {
                message: error.message,
                stack: error.stack
            });
            errorMessage.className = 'error-message';
            errorMessage.textContent = '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.';
            errorMessage.style.display = 'block';
        }

        console.timeEnd('로그인 처리 시간');
        console.groupEnd();
    });
});

// 이미 로그인된 경우 메인 페이지로 리다이렉트
if (localStorage.getItem('adminRole')) {
    console.log('✅ 이미 로그인된 상태: 메인 페이지로 리다이렉트');
    window.location.href = '../index.html';
}
