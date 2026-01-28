/**
 * API 호출 표준화 유틸리티
 * 모든 API 요청에 대한 공통 처리 (인증, 에러 핸들링 등)
 */
class ApiClient {
    /**
     * 기본 API 요청 함수
     * @param {string} url 요청 URL
     * @param {Object} options 요청 옵션
     * @returns {Promise<Response>} fetch 응답
     */
    static async request(url, options = {}) {
        // 로그아웃 중인지 확인
        if (window.isLoggingOut) {
            console.log('🚪 로그아웃 중 - API 요청 중단:', url);
            throw new Error('로그아웃 처리 중입니다.');
        }
        
        // 토큰 관련 코드 제거
        // 기본 헤더 설정
        const defaultHeaders = {
            'Content-Type': 'application/json'
        };
        // localStorage에서 직접 권한 정보를 가져와서 헤더에 추가
        const adminRole = localStorage.getItem('adminRole');
        const userId = localStorage.getItem('userId');
        if (adminRole) {
            defaultHeaders['X-Admin-Role'] = adminRole;
        }
        if (userId) {
            defaultHeaders['X-User-ID'] = userId;
        }
        // 최종 요청 옵션 구성
        const finalOptions = {
            ...options,
            headers: { ...defaultHeaders, ...options.headers }
        };

        console.log('🌐 API 요청:', {
            url,
            method: finalOptions.method || 'GET',
            adminRole,
            userId
        });

        try {
            const response = await fetch(url, finalOptions);
            
            // 로그아웃 중인지 다시 확인
            if (window.isLoggingOut) {
                console.log('🚪 로그아웃 중 - 응답 처리 중단');
                throw new Error('로그아웃 처리 중입니다.');
            }
            
            // 401 Unauthorized - 로그인 필요
            if (response.status === 401) {
                console.warn('🔒 인증 실패 (401): 로그인이 필요합니다');
                // 사용자에게 알림 표시
                if (!window.isLoggingOut) {
                    alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
                }
                AuthManager.logout();
                throw new Error('로그인이 필요합니다. 다시 로그인해주세요.');
            }
            
            // 403 Forbidden - admin_role 권한 없음
            if (response.status === 403) {
                console.warn('🚫 권한 없음 (403): admin_role 권한 부족');
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || '이 기능에 대한 관리자 권한이 없습니다.';
                // 사용자에게 알림 표시
                if (!window.isLoggingOut) {
                    alert(errorMessage);
                }
                throw new Error(errorMessage);
            }

            return response;
        } catch (error) {
            console.error('❌ API 요청 실패:', {
                url,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * GET 요청
     * @param {string} url 요청 URL
     * @param {Object} options 요청 옵션
     * @returns {Promise<any>} 응답 데이터
     */
    static async get(url, options = {}) {
        const response = await this.request(url, { ...options, method: 'GET' });
        return response.json();
    }

    /**
     * POST 요청
     * @param {string} url 요청 URL
     * @param {any} data 요청 데이터
     * @param {Object} options 요청 옵션
     * @returns {Promise<any>} 응답 데이터
     */
    static async post(url, data = null, options = {}) {
        const requestOptions = {
            ...options,
            method: 'POST'
        };

        if (data) {
            requestOptions.body = JSON.stringify(data);
        }

        const response = await this.request(url, requestOptions);
        return response.json();
    }

    /**
     * PUT 요청
     * @param {string} url 요청 URL
     * @param {any} data 요청 데이터
     * @param {Object} options 요청 옵션
     * @returns {Promise<any>} 응답 데이터
     */
    static async put(url, data = null, options = {}) {
        const requestOptions = {
            ...options,
            method: 'PUT'
        };

        if (data) {
            requestOptions.body = JSON.stringify(data);
        }

        const response = await this.request(url, requestOptions);
        return response.json();
    }

    /**
     * DELETE 요청
     * @param {string} url 요청 URL
     * @param {Object} options 요청 옵션
     * @returns {Promise<any>} 응답 데이터
     */
    static async delete(url, options = {}) {
        const response = await this.request(url, { ...options, method: 'DELETE' });
        return response.json();
    }

    /**
     * 파일 업로드 요청
     * @param {string} url 요청 URL
     * @param {FormData} formData 폼 데이터
     * @param {Object} options 요청 옵션
     * @returns {Promise<any>} 응답 데이터
     */
    static async upload(url, formData, options = {}) {
        // 파일 업로드는 Content-Type을 설정하지 않음 (브라우저가 자동 설정)
        // localStorage에서 직접 권한 정보를 가져와서 헤더에 추가
        const adminRole = localStorage.getItem('adminRole');
        const userId = localStorage.getItem('userId');
        
        const headers = {};
        if (adminRole) {
            headers['X-Admin-Role'] = adminRole;
        }
        if (userId) {
            headers['X-User-ID'] = userId;
        }

        const response = await this.request(url, {
            ...options,
            method: 'POST',
            headers,
            body: formData
        });

        return response.json();
    }

    /**
     * 외부 API 호출 (인증 헤더 없이)
     * @param {string} url 요청 URL
     * @param {Object} options 요청 옵션
     * @returns {Promise<Response>} fetch 응답
     */
    static async external(url, options = {}) {
        console.log('🌍 외부 API 요청:', url);
        
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            console.error('❌ 외부 API 요청 실패:', error);
            throw error;
        }
    }
}

// 전역에서 사용 가능하도록 window 객체에 추가
window.ApiClient = ApiClient;