// 퇴사자 관리 페이지

let currentPage = 1;
const itemsPerPage = 20;
let totalUsers = 0;
let allUsers = [];

// 페이지 로드시 실행
document.addEventListener('DOMContentLoaded', async () => {
    console.log('퇴사자 관리 페이지 로드');

    // 권한 확인
    const adminRole = localStorage.getItem('adminRole');
    if (!adminRole || (adminRole !== '0' && adminRole !== '1' && adminRole !== '2')) {
        alert('퇴사자 관리 권한이 없습니다.');
        window.location.href = '../index.html';
        return;
    }

    // 퇴사자 목록 로드
    await loadResignedUsers();

    // 이벤트 리스너 설정
    setupEventListeners();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    // 검색 버튼
    const searchBtn = document.getElementById('search-user');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    // 검색 입력 엔터키
    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // 부서 필터
    const departmentFilter = document.getElementById('department-filter');
    if (departmentFilter) {
        departmentFilter.addEventListener('change', handleSearch);
    }
}

// 퇴사자 목록 로드
async function loadResignedUsers() {
    try {
        console.log('퇴사자 목록 로딩 시작');

        // API 호출 - 퇴사자만 조회 (is_worked = '퇴사' - 문자열)
        const response = await fetch('/api/users?is_worked=퇴사&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('받은 퇴사자 데이터:', data);

        // DB 컬럼명을 화면 표시용으로 매핑
        allUsers = data.users ? data.users.map(user => {
            console.log('개별 사용자 데이터:', user); // 각 사용자의 데이터 확인
            console.log('resign_date 값:', user.resign_date); // resign_date 값 확인

            // resign_date 처리
            let resignedDate = '-';
            if (user.resign_date) {
                try {
                    resignedDate = new Date(user.resign_date).toLocaleDateString('ko-KR');
                } catch (e) {
                    console.error('날짜 변환 오류:', e);
                    resignedDate = user.resign_date; // 원본 값 표시
                }
            }

            return {
                userId: user.user_id,
                username: user.name,
                department: user.dept,
                position: user.job_grade,
                title: user.job_position,
                adminRole: user.admin_role,
                permission: user.permission,
                csrSearchDiv: user.csr_search_div,
                resignedDate: resignedDate,
                vacationHistory: [] // 휴가 이력은 별도 API로 조회 필요
            };
        }) : [];

        totalUsers = allUsers.length;
        displayUsers(allUsers);

        console.log('퇴사자 목록 로딩 완료:', totalUsers);
    } catch (error) {
        console.error('퇴사자 목록 로딩 실패:', error);
        alert('퇴사자 목록을 불러오는데 실패했습니다.');
    }
}

// 사용자 표시
function displayUsers(users) {
    const tbody = document.querySelector('#users-table tbody');
    if (!tbody) {
        console.error('테이블 body를 찾을 수 없습니다.');
        return;
    }

    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">퇴사자가 없습니다.</td></tr>';
        return;
    }

    // 페이지네이션 적용
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageUsers = users.slice(start, end);

    pageUsers.forEach((user, index) => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.innerHTML = `
            <td>${start + index + 1}</td>
            <td>${user.userId || '-'}</td>
            <td>${user.username || '-'}</td>
            <td>${user.department || '-'}</td>
            <td>${user.position || '-'}</td>
            <td>${user.resignedDate || '-'}</td>
            <td>
                <button class="view-vacation-btn" data-user-id="${user.userId}">
                    휴가 이력 보기
                </button>
            </td>
        `;

        // 행 클릭 이벤트 - 상세정보 모달 표시
        row.addEventListener('click', (e) => {
            // 버튼 클릭 시에는 모달을 열지 않음
            if (!e.target.classList.contains('view-vacation-btn')) {
                showUserDetail(user);
            }
        });

        // 휴가 이력 보기 버튼 이벤트
        const viewBtn = row.querySelector('.view-vacation-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 행 클릭 이벤트 방지
                showVacationHistory(user);
            });
        }

        tbody.appendChild(row);
    });

    // 페이지네이션 업데이트
    updatePagination(users.length);
}

// 퇴사자 상세정보 모달 표시
function showUserDetail(user) {
    const modal = document.getElementById('user-detail-modal');
    if (!modal) {
        console.error('상세정보 모달을 찾을 수 없습니다.');
        return;
    }

    // 권한 매핑 함수
    const getAdminRoleName = (role) => {
        const roles = {
            '0': '최고관리자',
            '1': '관리자_1',
            '2': '관리자_2',
            '3': '관리자_3',
            '4': '관리자_4',
            '5': '일반 위원'
        };
        return roles[String(role)] || '-';
    };

    const getPermissionName = (permission) => {
        const permissions = {
            '1': '사용자',
            '2': '부서장',
            '3': '지사장',
            '4': '임원',
            '5': '대표이사'
        };
        return permissions[String(permission)] || '-';
    };

    const getCsrName = (csr) => {
        return csr === 1 || csr === '1' ? '모든 CSR 검색 가능' : '본인 CSR 검색 가능';
    };

    // 모달 내용 설정
    document.getElementById('detail-username').textContent = user.username || '-';
    document.getElementById('detail-userId').textContent = user.userId || '-';
    document.getElementById('detail-department').textContent = user.department || '-';
    document.getElementById('detail-position').textContent = user.position || '-';
    document.getElementById('detail-title').textContent = user.title || '-';
    document.getElementById('detail-resignedDate').textContent = user.resignedDate || '-';
    document.getElementById('detail-adminRole').textContent = getAdminRoleName(user.adminRole);
    document.getElementById('detail-permission').textContent = getPermissionName(user.permission);
    document.getElementById('detail-csrSearchDiv').textContent = getCsrName(user.csrSearchDiv);

    // 재직자로 복귀 버튼 이벤트 리스너 설정
    const restoreBtn = document.getElementById('restore-to-active-btn');
    console.log('복귀 버튼 찾기:', restoreBtn); // 디버깅용
    if (restoreBtn) {
        console.log('복귀 버튼 이벤트 설정됨'); // 디버깅용
        restoreBtn.onclick = () => restoreUserToActive(user);
        restoreBtn.style.display = 'inline-block'; // 강제로 표시
    } else {
        console.error('복귀 버튼을 찾을 수 없습니다!'); // 디버깅용
    }

    // 모달 표시
    modal.style.display = 'block';
}

// 퇴사자를 재직자로 복귀시키는 함수
async function restoreUserToActive(user) {
    if (!confirm(`${user.username}님을 재직자로 복귀시키겠습니까?\n\n퇴사 기록이 유지되며, 재직 상태로 변경됩니다.`)) {
        return;
    }

    try {
        // 버튼 상태 변경 (로딩 표시)
        const restoreBtn = document.getElementById('restore-to-active-btn');
        const originalText = restoreBtn.textContent;
        restoreBtn.disabled = true;
        restoreBtn.textContent = '처리 중...';

        // 프록시 사용 (서버 로그를 확인하기 위해)
        // const USER_API_URL = '/admin';

        // 현재 사용자 정보를 기반으로 재직 상태만 변경
        // 모든 숫자 필드를 명시적으로 변환 (users.js 패턴과 동일)
        const permission = parseInt(user.permission) || 5;
        const csrSearchDiv = parseInt(user.csrSearchDiv) || 0;
        const adminRole = parseInt(user.adminRole) || 5;

        const requestData = {
            user_id: user.userId,
            dept: user.department,
            job_grade: user.position,
            job_position: user.title,
            permission: permission,
            csr_search_div: csrSearchDiv,
            admin_role: adminRole,
            is_worked: 0, // 재직자로 변경 (0=재직, 1=퇴사)
            resign_date: null // 퇴사일자 null로 명시
        };

        // 디버깅: 요청 정보 확인
        console.log('사용자 복귀 API 요청:', {
            url: '/admin/updateUser',
            method: 'POST',
            requestData: requestData
        });

        // API 호출하여 사용자 상태 변경 (프록시 사용)
        const response = await fetch('/admin/updateUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API HTTP Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('사용자 복귀 API 응답:', result);
        console.log('응답 status_code:', result.status_code, '타입:', typeof result.status_code);

        if (result.status_code == 200) { // 느슨한 비교로 변경 (문자열 "200"도 통과)
            console.log('✅ status_code 200 확인됨 - 복귀 처리 시작');
            alert('사용자가 재직자로 복귀되었습니다.');
            closeUserDetailModal(); // 모달 닫기
            console.log('퇴사자 목록 새로고침 시작');
            try {
                await loadResignedUsers(); // 목록 새로고침
                console.log('퇴사자 목록 새로고침 완료');
            } catch (refreshError) {
                console.error('목록 새로고침 실패:', refreshError);
            }
        } else {
            console.error('API 응답 에러:', result);
            const errorMsg = result.error || result.message || '알 수 없는 오류';
            throw new Error(`복귀 실패 (status_code: ${result.status_code}): ${errorMsg}`);
        }

    } catch (error) {
        console.error('사용자 복귀 실패:', error);
        alert('사용자 복귀 처리 중 오류가 발생했습니다: ' + error.message);
    } finally {
        // 버튼 상태 복원
        const restoreBtn = document.getElementById('restore-to-active-btn');
        if (restoreBtn) {
            restoreBtn.disabled = false;
            restoreBtn.textContent = '재직자로 복귀';
        }
    }
}

// 퇴사자 상세정보 모달 닫기
function closeUserDetailModal() {
    const modal = document.getElementById('user-detail-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 휴가 이력 모달 표시
async function showVacationHistory(user) {
    const modal = document.getElementById('vacation-history-modal');
    if (!modal) {
        console.error('휴가 이력 모달을 찾을 수 없습니다.');
        return;
    }

    // 모달 제목 설정
    const modalTitle = document.getElementById('modal-user-name');
    if (modalTitle) {
        modalTitle.textContent = `${user.username}님의 휴가 사용 이력`;
    }

    // 사용자 ID 표시
    const userIdEl = document.getElementById('modal-user-id');
    if (userIdEl) {
        userIdEl.textContent = user.userId || '-';
    }

    // 모달 표시
    modal.style.display = 'block';

    // 로딩 표시
    const historyList = document.getElementById('vacation-history-list');
    if (historyList) {
        historyList.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">데이터를 불러오는 중...</td></tr>';
    }

    // API 호출하여 휴가 이력 조회
    try {
        console.log('휴가 이력 조회 요청:', user.userId);

        const response = await fetch('/admin/leave/management/former', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: user.userId })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('휴가 이력 응답:', data);

        if (data.error) {
            throw new Error(data.error);
        }

        const leaveHistory = data.leave_history || [];
        displayVacationHistory(leaveHistory);

    } catch (error) {
        console.error('휴가 이력 조회 실패:', error);
        if (historyList) {
            historyList.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #ef4444;">데이터를 불러오는데 실패했습니다.</td></tr>';
        }
    }
}

// 휴가 이력 표시
function displayVacationHistory(history) {
    const historyList = document.getElementById('vacation-history-list');
    if (!historyList) return;

    if (!history || history.length === 0) {
        historyList.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">휴가 사용 이력이 없습니다.</td></tr>';
        return;
    }

    // 날짜 포맷 함수
    const formatDateTime = (dateTime) => {
        const date = new Date(dateTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    // 날짜 범위 포맷 함수
    const formatDateRange = (startDate, endDate) => {
        const start = new Date(startDate).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\\. /g, '-').replace('.', '');

        const end = new Date(endDate).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\\. /g, '-').replace('.', '');

        return start === end ? start : `${start} ~ ${end}`;
    };

    // 상태 배지 함수
    const getStatusBadge = (status) => {
        const statusMap = {
            'APPROVED': { text: '승인', color: '#10b981', bg: '#d1fae5' },
            'REJECTED': { text: '반려', color: '#ef4444', bg: '#fee2e2' },
            'CANCELLED': { text: '취소', color: '#6b7280', bg: '#f3f4f6' },
            'PENDING': { text: '대기', color: '#f59e0b', bg: '#fef3c7' },
            'REQUESTED': { text: '대기', color: '#f59e0b', bg: '#fef3c7' }
        };

        const statusInfo = statusMap[status] || { text: status, color: '#6b7280', bg: '#f3f4f6' };

        return `<span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; color: ${statusInfo.color}; background-color: ${statusInfo.bg};">${statusInfo.text}</span>`;
    };

    historyList.innerHTML = history.map((item, idx) => {
        const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
        const leaveDate = formatDateRange(item.start_date, item.end_date);
        const requestedDate = formatDateTime(item.requested_date);
        const statusBadge = getStatusBadge(item.status);

        return `
            <tr style="border-bottom: 1px solid #e5e7eb; background-color: ${bgColor};">
                <td style="padding: 14px; text-align: center; color: #1a1f36; font-size: 0.9rem;">${idx + 1}</td>
                <td style="padding: 14px; color: #1a1f36; font-size: 0.9rem;">${item.year}</td>
                <td style="padding: 14px; color: #1a1f36; font-size: 0.9rem;">${item.leave_type}</td>
                <td style="padding: 14px; color: #1a1f36; font-size: 0.875rem;">${leaveDate}</td>
                <td style="padding: 14px; text-align: center; color: #1a1f36; font-weight: 600; font-size: 0.9rem;">${item.workdays_count}일</td>
                <td style="padding: 14px; color: #1a1f36; font-size: 0.875rem; font-family: monospace;">${requestedDate}</td>
                <td style="padding: 14px; text-align: center;">${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

// 모달 닫기
function closeVacationModal() {
    const modal = document.getElementById('vacation-history-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 검색 처리
function handleSearch() {
    const searchInput = document.getElementById('user-search');
    const departmentFilter = document.getElementById('department-filter');

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const department = departmentFilter ? departmentFilter.value : 'all';

    let filteredUsers = allUsers;

    // 부서 필터
    if (department !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.department === department);
    }

    // 검색어 필터
    if (searchTerm) {
        filteredUsers = filteredUsers.filter(user =>
            (user.username && user.username.toLowerCase().includes(searchTerm)) ||
            (user.userId && user.userId.toLowerCase().includes(searchTerm)) ||
            (user.department && user.department.toLowerCase().includes(searchTerm))
        );
    }

    currentPage = 1;
    displayUsers(filteredUsers);
}

// 페이지네이션 업데이트
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationEl = document.getElementById('pagination');

    if (!paginationEl) return;

    paginationEl.innerHTML = '';

    if (totalPages <= 1) return;

    // 이전 버튼
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '이전';
    prevBtn.className = 'pagination-btn';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayUsers(allUsers);
        }
    });
    paginationEl.appendChild(prevBtn);

    // 페이지 번호
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            displayUsers(allUsers);
        });
        paginationEl.appendChild(pageBtn);
    }

    // 다음 버튼
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '다음';
    nextBtn.className = 'pagination-btn';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayUsers(allUsers);
        }
    });
    paginationEl.appendChild(nextBtn);
}

// 모달 외부 클릭시 닫기
window.addEventListener('click', (e) => {
    const modal = document.getElementById('vacation-history-modal');
    if (e.target === modal) {
        closeVacationModal();
    }
});
