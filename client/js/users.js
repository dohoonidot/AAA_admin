// 사용자 관리 기능

// API URL 설정
const USER_API_URL = '/admin';  // 생성/수정/삭제용
const API_BASE_URL = '/api';  // 조회용

// 마지막 사용자 ID를 저장할 변수
let lastUserId = 0;

// 페이지네이션 관련 변수
let currentPage = 1;
const itemsPerPage = 50;
let totalPages = 1;
let allUsers = []; // 모든 사용자 데이터
let originalUsers = []; // 입사순(원본) 사용자 데이터
let totalUsers = 0; // 전체 사용자 수 저장 변수 추가
let currentSearchTerm = ''; // 검색어 저장 변수 추가

// 현재 로그인한 사용자의 부서 정보를 저장할 변수
let currentUserDepartment = null;

// 권한 설명 매핑
const roleDescriptions = {
    '0': '최고관리자 - 모든 데이터 열람 가능, 모든 기능 사용 가능, user 권한 부여 가능, 휴가 총괄 관리 화면 접근 가능',
    '1': '관리자_1 - 전체회원 관리권한, user 권한부여 제외 모든 기능 가능, 휴가 총괄 관리 화면 접근 가능',
    '2': '관리자_2 - 전체회원 관리권한',
    '3': '본부장 - 해당 본부의 모든 데이터 열람 가능',
    '4': '사업부장 - 해당 사업부의 모든 데이터 열람 가능',
    '5': '일반위원 - 본인이 담당하는 CSR 및 본인 인사정보 열람 가능'
};

// CSR 설명 매핑
const csrDescriptions = {
    '0': '본인 CSR 검색 가능',
    '1': '모든 CSR 검색 가능'
};

// 필터 상태 저장
let activeFilters = {
    department: '',
    position: '',
    title: '',
    role: '',
    csr: '',
    adminRole: ''
};

// 관리권한 설명 매핑
const adminRoleDescriptions = {
    '0': '최고관리자 - 모든 데이터 조회 가능, 모든 기능 사용 가능, user 권한 부여 가능, 휴가 총괄 관리 화면 접근 가능',
    '1': '관리자_1 - 전체회원 관리권한, user 권한부여 제외 모든 기능 가능, 휴가 총괄 관리 화면 접근 가능',
    '2': '관리자_2 - 전체회원 관리권한',
    '3': '본부장 - 소속 본부의 직원 정보 관리가능',
    '4': '사업부장 - 소속 사업부의 직원 정보 관리가능',
    '5': '일반위원 - 기본 사용자 권한'
};

// GET 요청 함수
async function getRequest(url, params = {}) {
    // 디버깅 로그
    console.log(`API GET 요청: ${url}`, params);
    
    // 쿼리 파라미터 구성
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value);
        }
    });
    
    const queryString = queryParams.toString();
    const requestUrl = queryString ? `${url}?${queryString}` : url;
    
    // 전체 요청 URL 로깅
    console.log(`전체 요청 URL: ${API_BASE_URL}${requestUrl}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}${requestUrl}`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`API GET 응답 성공:`, data);
        return data;
    } catch (error) {
        console.error(`API GET 요청 실패 (${url}):`, error);
        throw error;
    }
}

// 사용자 목록 불러오기 함수
async function fetchUsers(page = 1, filters = {}) {
    try {
        // 요청 시작 로그
        console.log('사용자 목록 요청 시작:', { page, filters });
        
        // 페이지 번호가 숫자인지 확인
        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            console.error('잘못된 페이지 번호:', page);
            page = 1;
        } else {
            page = pageNum;
        }

        // URL 업데이트 - 검색어 포함 (검색어가 있을 때만)
        const urlParams = new URLSearchParams();
        urlParams.set('page', page);
        if (currentSearchTerm && currentSearchTerm.trim() !== '') {
            urlParams.set('search', currentSearchTerm);
        }
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                urlParams.set(key, value);
            }
        });
        window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
        
        // DB 컬럼명으로 필터 매핑
        const dbFilters = {};
        if (filters.department) dbFilters.dept = filters.department;
        if (filters.position) dbFilters.job_grade = filters.position;
        if (filters.title) dbFilters.job_position = filters.title;
        if (filters.role) dbFilters.permission = filters.role;
        if (filters.csr) dbFilters.csr_search_div = filters.csr;
        if (filters.search) dbFilters.search = filters.search;
        if (filters.adminRole) dbFilters.admin_role = filters.adminRole;

        // 재직자 화면에서는 is_worked = '재직'인 데이터만 조회 (문자열)
        dbFilters.is_worked = '재직';
        
        console.log(`요청할 페이지: ${page}, 페이지당 항목 수: ${itemsPerPage}`);
        
        // api.get 대신 getRequest 사용
        const data = await getRequest('/users', {
            page,
            limit: itemsPerPage,
            ...dbFilters
        });
        
        console.log('받은 사용자 데이터:', data);
        console.log(`전체 사용자 수: ${data.total}, 전체 페이지 수: ${data.totalPages}, 현재 페이지: ${data.page}`);
        console.log(`반환된 사용자 수: ${data.users ? data.users.length : 0}`);
        
        // 전체 사용자 수 저장
        totalUsers = data.total;
        
        if (!data.users || data.users.length === 0) {
            if (data.total > 0) {
                console.warn(`사용자 데이터가 있지만 현재 페이지(${page})에는 사용자가 없습니다.`);
                if (page > 1 && page > data.totalPages) {
                    console.warn(`현재 페이지가 총 페이지 수를 초과했습니다. 1페이지로 이동합니다.`);
                    currentPage = 1;
                    return fetchUsers(1, filters);
                }
            } else {
                console.warn('사용자 데이터가 비어 있습니다.');
            }
        }
        
        // DB 컬럼명을 웹페이지 표시 형식에 맞게 매핑
        allUsers = data.users ? data.users
            .filter(user => {
                if (!filters.adminRole) return true;
                return String(user.admin_role) === filters.adminRole;
            })
            .map((user, index) => ({
                rowNum: (data.page - 1) * itemsPerPage + index + 1,
                name: user.name,
                loginId: user.user_id,
                department: user.dept,
                position: user.job_grade,
                title: user.job_position,
                adminRole: String(user?.admin_role ?? '5'),
                role: (user?.permission != null ? String(user.permission) : '5'),
                csr: (user?.csr_search_div != null ? String(user.csr_search_div) : '0')
            })) : [];

        // 원본 데이터 저장 (입사순 정렬용)
        originalUsers = JSON.parse(JSON.stringify(allUsers));

        // 정렬 상태 초기화
        nameSortState = 0;

        // 현재 페이지 번호 업데이트 (서버에서 반환한 값으로)
        currentPage = data.page;
        totalPages = data.totalPages;
        
        console.log(`현재 페이지로 설정됨: ${currentPage}, 총 페이지 수: ${totalPages}`);
        
        // 현재 페이지 데이터 표시
        await displayUsersForCurrentPage();
        
        // 페이지네이션 업데이트
        updatePagination();
        
        return data;
    } catch (error) {
        console.error('사용자 목록 조회 오류 상세정보:', error);
        // 오류 응답이 있으면 표시
        if (error.response) {
            console.error('오류 응답 데이터:', error.response.data);
            console.error('오류 상태 코드:', error.response.status);
        }
        alert('사용자 목록을 불러오는데 실패했습니다. 개발자 도구의 콘솔에서 자세한 오류를 확인하세요.');
        throw error;
    }
}

// 필터 옵션 업데이트 함수
function updateFilterOptions() {
    const tbody = document.querySelector('#users-table tbody');
    const rows = tbody.getElementsByTagName('tr');
    
    // 각 필터의 고유 값 수집
    const departments = new Set();
    
    for (let row of rows) {
        departments.add(row.cells[4].textContent);
    }
    
    // 부서 필터 옵션 업데이트
    const departmentFilter = document.getElementById('department-filter');
    departmentFilter.innerHTML = '<option value="">전체 부서</option>';
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        departmentFilter.appendChild(option);
    });
}

// 필터 적용 함수
function applyFilters() {
    const department = document.getElementById('department-filter').value;
    const position = document.getElementById('position-filter').value;
    const title = document.getElementById('title-filter').value;
    const role = document.getElementById('role-filter').value;
    const csr = document.getElementById('csr-filter').value;
    const adminRole = document.getElementById('admin-role-filter').value;
    
    console.log('필터 적용:', {
        adminRole,
        adminRoleType: typeof adminRole
    });
    
    // 필터 중 전체를 선택한 경우 빈 문자열로 변환
    activeFilters.department = department === 'all' ? '' : department;
    activeFilters.position = position === 'all' ? '' : position;
    activeFilters.title = title === 'all' ? '' : title;
    activeFilters.role = role === 'all' ? '' : role;
    activeFilters.csr = csr === 'all' ? '' : csr;
    activeFilters.adminRole = adminRole === 'all' ? '' : adminRole;
    
    // 필터 적용 시 검색어 초기화 (필터와 검색은 별도로 동작)
    document.getElementById('user-search').value = '';
    currentSearchTerm = '';
    
    console.log('활성화된 필터:', activeFilters);
    
    // 필터링된 결과를 새로 불러오기 (검색어 없이)
    currentPage = 1; // 페이지 리셋
    fetchUsers(currentPage, activeFilters);
    
    // 활성 필터 표시 업데이트
    updateActiveFilters();
}

// 필터 제거
function removeFilter(filterType) {
    // 필터 select 요소 초기화
    const filterElement = document.getElementById(`${filterType}-filter`);
    if (filterElement) {
        filterElement.value = 'all';
    }
    
    // 활성 필터 상태 초기화
    activeFilters[filterType] = '';
    
    // 검색어도 함께 초기화 (개별 필터 제거 시에도)
    document.getElementById('user-search').value = '';
    currentSearchTerm = '';
    
    // 필터 적용 (검색어 없이)
    applyFilters();
}

// 필터 태그 추가
function addFilterTag(label, value, filterType) {
    const activeFiltersContainer = document.getElementById('active-filters');
    const filterTag = document.createElement('div');
    filterTag.className = 'filter-tag';
    
    // 모든 필터에 대해 동일하게 처리
    const span = document.createElement('span');
    span.textContent = `${label}: ${value}`;
    
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-filter';
    removeButton.textContent = '×';
    
    // 모든 필터에 대해 동일한 제거 처리
    removeButton.addEventListener('click', () => {
        const filterElement = document.getElementById(`${filterType}-filter`);
        if (filterElement) {
            filterElement.value = 'all';
        }
        activeFilters[filterType] = '';
        applyFilters();
    });
    
    filterTag.appendChild(span);
    filterTag.appendChild(removeButton);
    activeFiltersContainer.appendChild(filterTag);
}

// 필터 초기화
function clearFilters() {
    document.getElementById('department-filter').value = 'all';
    document.getElementById('position-filter').value = 'all';
    document.getElementById('title-filter').value = 'all';
    document.getElementById('role-filter').value = 'all';
    document.getElementById('csr-filter').value = 'all';
    document.getElementById('admin-role-filter').value = 'all';
    
    // 검색어도 초기화
    document.getElementById('user-search').value = '';
    currentSearchTerm = '';
    
    activeFilters = {
        department: '',
        position: '',
        title: '',
        role: '',
        csr: '',
        adminRole: ''
    };
    
    // 필터 초기화 후 데이터 불러오기 (검색어 없이)
    fetchUsers(1);
    
    // 활성 필터 표시 초기화
    document.getElementById('active-filters').innerHTML = '';
}

// 사용자 검색 함수 수정
function searchUser() {
    const searchInput = document.getElementById('user-search');
    const searchTerm = searchInput.value.toLowerCase();
    
    // 검색어를 전역 변수에 저장
    currentSearchTerm = searchTerm.trim();
    
    if (currentSearchTerm === '') {
        // 검색어가 비어있으면 필터도 함께 초기화
        clearFilters();
        return;
    }
    
    // 현재 필터와 검색어를 함께 사용
    const searchFilters = { ...activeFilters, search: currentSearchTerm };
    
    // 검색 결과 불러오기 (현재 페이지 유지)
    fetchUsers(currentPage, searchFilters)
        .then(() => {
            // 검색 후 입력창만 초기화
            searchInput.value = '';
        });
}

// 이름 정렬 상태 (0: 입사순(기본), 1: 이름 오름차순, 2: 이름 내림차순)
let nameSortState = 0;

// 현재 페이지에 표시할 사용자 데이터 렌더링
async function displayUsersForCurrentPage() {
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = '';
    
    console.log(`사용자 테이블 렌더링: 총 ${allUsers.length}명의 사용자 데이터`);
    
    if (allUsers.length === 0) {
        const noDataRow = document.createElement('tr');
        noDataRow.innerHTML = `<td colspan="9" class="no-data">표시할 사용자 데이터가 없습니다.</td>`;
        tbody.appendChild(noDataRow);
        console.warn('표시할 사용자 데이터가 없습니다.');
        return;
    }
    
    const currentAdminRole = localStorage.getItem('adminRole');
    let userDept = null;
    
    // 관리권한 3, 4인 경우에만 현재 사용자 부서 정보 가져오기
    if (['3', '4'].includes(currentAdminRole)) {
        try {
            userDept = await getCurrentUserDepartment();
        } catch (error) {
            console.error('부서 정보 조회 실패:', error);
            // 부서 정보를 가져올 수 없는 경우 모든 행을 수정 불가능하게 처리
            userDept = null;
        }
    }
    
    // 정렬 후에도 번호가 순서대로 보이도록 rowNum 재계산
    allUsers.forEach((user, index) => {
        user.rowNum = (currentPage - 1) * itemsPerPage + index + 1;
    });

    allUsers.forEach(user => {
        const newRow = document.createElement('tr');
        newRow.dataset.userId = user.loginId;
        
        // 수정 권한 확인
        let canEdit = false;
        if (currentAdminRole === '5') {
            canEdit = false;
        } else if (['0', '1', '2'].includes(currentAdminRole)) {
            canEdit = true;
        } else if (['3', '4'].includes(currentAdminRole)) {
            // 부서 정보가 있고 같은 부서인 경우만 수정 가능
            canEdit = userDept && user.department === userDept;
        }
        
        // 수정 가능한 행에 시각적 표시
        if (canEdit) {
            newRow.classList.add('editable-row');
            newRow.style.cursor = 'pointer';
            newRow.title = '클릭하여 수정';
        } else {
            newRow.classList.add('non-editable-row');
            newRow.style.cursor = 'not-allowed';
            newRow.title = '수정 권한이 없습니다';
        }
        
        newRow.innerHTML = `
            <td>${user.rowNum}</td>
            <td>${user.name}</td>
            <td>${user.loginId}</td>
            <td class="position-cell">${user.department}</td>
            <td class="position-cell">${user.position}</td>
            <td class="title-cell">${user.title}</td>
            <td class="admin-role-cell ${user.adminRole ? 'admin-role-' + user.adminRole : ''}" data-admin-role="${user.adminRole || ''}">
                ${getAdminRoleText(user.adminRole)}
            </td>
            <td class="role-${user.role}" data-role="${user.role}">${user.role}</td>
            <td class="csr-${user.csr}" data-csr="${user.csr}">${user.csr}</td>
        `;
        tbody.appendChild(newRow);
    });
}

// 페이지네이션 업데이트 시 URL에 검색어 포함
function updatePagination() {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';
    
    // URL 업데이트 시 검색어 포함 (검색어가 있을 때만)
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('page', currentPage);
    if (currentSearchTerm && currentSearchTerm.trim() !== '') {
        urlParams.set('search', currentSearchTerm);
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
    
    // 처음 페이지 버튼
    const firstButton = document.createElement('button');
    firstButton.classList.add('pagination-btn');
    firstButton.textContent = '처음';
    firstButton.disabled = currentPage === 1;
    firstButton.addEventListener('click', () => {
        currentPage = 1;
        const filters = { ...activeFilters };
        if (currentSearchTerm && currentSearchTerm.trim() !== '') {
            filters.search = currentSearchTerm;
        }
        fetchUsers(currentPage, filters);
    });
    paginationContainer.appendChild(firstButton);
    
    // 이전 페이지 버튼
    const prevButton = document.createElement('button');
    prevButton.classList.add('pagination-btn');
    prevButton.textContent = '이전';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            const filters = { ...activeFilters };
            if (currentSearchTerm && currentSearchTerm.trim() !== '') {
                filters.search = currentSearchTerm;
            }
            fetchUsers(currentPage, filters);
        }
    });
    paginationContainer.appendChild(prevButton);
    
    // 페이지 번호 버튼들
    const maxPageButtons = 7; // 최대 표시할 페이지 버튼 수
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    // 시작 페이지 재조정
    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    // 페이지가 많을 때 처음과 마지막 근처를 표시
    if (startPage > 2) {
        const pageButton = document.createElement('button');
        pageButton.classList.add('pagination-btn');
        pageButton.textContent = 1;
        pageButton.addEventListener('click', () => {
            currentPage = 1;
            const filters = { ...activeFilters };
            if (currentSearchTerm && currentSearchTerm.trim() !== '') {
                filters.search = currentSearchTerm;
            }
            fetchUsers(currentPage, filters);
        });
        paginationContainer.appendChild(pageButton);
        
        if (startPage > 3) {
            const ellipsis = document.createElement('span');
            ellipsis.classList.add('pagination-ellipsis');
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.classList.add('pagination-btn');
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => {
            currentPage = i;
            const filters = { ...activeFilters };
            if (currentSearchTerm && currentSearchTerm.trim() !== '') {
                filters.search = currentSearchTerm;
            }
            fetchUsers(currentPage, filters);
        });
        paginationContainer.appendChild(pageButton);
    }
    
    // 마지막 페이지 근처 표시
    if (endPage < totalPages - 1) {
        if (endPage < totalPages - 2) {
            const ellipsis = document.createElement('span');
            ellipsis.classList.add('pagination-ellipsis');
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
        
        const pageButton = document.createElement('button');
        pageButton.classList.add('pagination-btn');
        pageButton.textContent = totalPages;
        pageButton.addEventListener('click', () => {
            currentPage = totalPages;
            const filters = { ...activeFilters };
            if (currentSearchTerm && currentSearchTerm.trim() !== '') {
                filters.search = currentSearchTerm;
            }
            fetchUsers(currentPage, filters);
        });
        paginationContainer.appendChild(pageButton);
    }
    
    // 다음 페이지 버튼
    const nextButton = document.createElement('button');
    nextButton.classList.add('pagination-btn');
    nextButton.textContent = '다음';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            const filters = { ...activeFilters };
            if (currentSearchTerm && currentSearchTerm.trim() !== '') {
                filters.search = currentSearchTerm;
            }
            fetchUsers(currentPage, filters);
        }
    });
    paginationContainer.appendChild(nextButton);
    
    // 마지막 페이지 버튼
    const lastButton = document.createElement('button');
    lastButton.classList.add('pagination-btn');
    lastButton.textContent = '마지막';
    lastButton.disabled = currentPage === totalPages;
    lastButton.addEventListener('click', () => {
        currentPage = totalPages;
        const filters = { ...activeFilters };
        if (currentSearchTerm && currentSearchTerm.trim() !== '') {
            filters.search = currentSearchTerm;
        }
        fetchUsers(currentPage, filters);
    });
    paginationContainer.appendChild(lastButton);
    
    // 현재 페이지 정보와 데이터 범위 표시
    const pageInfo = document.createElement('div');
    pageInfo.classList.add('pagination-info');
    
    // 현재 페이지의 데이터 범위 계산
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalUsers);
    
    // 페이지 정보 표시
    pageInfo.innerHTML = `
        <div class="page-info">
            <span class="current-page">${currentPage} / ${totalPages} 페이지</span>
            <span class="data-range">(${startItem} - ${endItem} / 전체 ${totalUsers}명)</span>
        </div>
    `;
    paginationContainer.appendChild(pageInfo);
}

// 사용자 추가 함수
async function addUserToServer(userData) {
    try {
        console.log('사용자 추가 요청 시작:', userData);
        
        // 클라이언트 필드명을 API 요청 형식에 맞게 변환
        const permission = parseInt(userData.role);
        const csrSearchDiv = parseInt(userData.csr);
        const adminRole = parseInt(userData.adminRole);

        // NaN 체크
        if (isNaN(permission) || isNaN(csrSearchDiv) || isNaN(adminRole)) {
            throw new Error('권한 값이 올바르지 않습니다.');
        }

        const requestData = {
            name: userData.name,
            user_id: userData.loginId,
            dept: userData.department,
            job_grade: userData.position,
            job_position: userData.title,
            permission: permission,
            csr_search_div: csrSearchDiv,
            admin_role: adminRole
        };

        // 입사일자 추가 (ISO 8601 형식으로)
        if (userData.joinDate) {
            const dateObj = new Date(userData.joinDate);
            if (!isNaN(dateObj.getTime())) {
                // ISO 8601 형식으로 변환 (예: "2025-09-05T14:00:00Z")
                requestData.join_date = dateObj.toISOString();
            } else {
                console.warn('잘못된 입사일자 형식:', userData.joinDate);
            }
        }

        // undefined나 null 값만 제거 (빈 문자열은 유지)
        Object.keys(requestData).forEach(key => {
            if (requestData[key] === undefined || requestData[key] === null) {
                delete requestData[key];
            }
        });

        console.log('API 요청 데이터:', requestData);

        // JSON 문자열로 변환하여 확인
        const jsonString = JSON.stringify(requestData);
        console.log('JSON 문자열:', jsonString);
        console.log('JSON 문자열 길이:', jsonString.length);

        // API 호출
        const response = await fetch(`${USER_API_URL}/createUser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json'
            },
            body: jsonString
        });

        console.log('응답 상태:', response.status);
        console.log('응답 헤더:', response.headers);

        // 응답 텍스트를 먼저 확인
        const responseText = await response.text();
        console.log('응답 원본 텍스트:', responseText);

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('JSON 파싱 오류:', e);
            result = { error: responseText, status_code: response.status };
        }
        console.log('API 응답:', result);
        
        if (result.status_code === 200) {
            console.log('사용자 추가 성공');
            // 검색 필터를 포함한 현재 상태로 목록 새로고침
            const searchTerm = document.getElementById('user-search').value.toLowerCase();
            const currentFilters = { ...activeFilters };
            if (searchTerm.trim()) {
                currentFilters.search = searchTerm;
            }
            fetchUsers(currentPage, currentFilters);
            return result;
        } else {
            throw new Error(result.error || '사용자 추가 실패');
        }
    } catch (error) {
        console.error('사용자 추가 오류:', error);
        alert('사용자 추가에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
        throw error;
    }
}

// 사용자 수정 함수 수정
async function updateUserOnServer(id, userData) {
    try {
        console.log('사용자 수정 요청 시작:', { id, userData });

        // 클라이언트 필드명을 API 요청 형식에 맞게 변환
        // permission 값이 0이 되지 않도록 기본값 처리
        const permission = parseInt(userData.role) || 5; // role이 0이면 기본값 5
        const csrSearchDiv = parseInt(userData.csr) || 0;
        const adminRole = parseInt(userData.adminRole) || 5;
        const isWorked = parseInt(userData.isWorked) || 0; // 재직여부 추가

        // permission 값 유효성 검사 (1~5 범위)
        if (permission < 1 || permission > 5) {
            throw new Error('권한 값이 유효하지 않습니다. (1-5 범위)');
        }

        const requestData = {
            user_id: userData.loginId,
            dept: userData.department,
            job_grade: userData.position,
            job_position: userData.title,
            permission: permission,
            csr_search_div: csrSearchDiv,
            admin_role: adminRole,
            is_worked: isWorked
        };

        // 퇴사일자 추가 (퇴사 선택 시에만, ISO 8601 형식으로)
        if (userData.resignDate) {
            // 날짜 문자열(YYYY-MM-DD)을 ISO 8601 형식으로 변환
            const dateObj = new Date(userData.resignDate);
            if (!isNaN(dateObj.getTime())) {
                requestData.resign_date = dateObj.toISOString(); // ISO 8601 형식
            }
        }
        
        console.log('API 요청 데이터:', requestData);
        
        // API 호출
        const response = await fetch(`${USER_API_URL}/updateUser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        console.log('API 응답:', result);
        
        if (result.status_code === 200) {
            console.log('사용자 수정 성공');
            // 저장된 검색어 사용
            const currentFilters = { ...activeFilters };
            if (currentSearchTerm) {
                currentFilters.search = currentSearchTerm;
            }
            // 현재 페이지 번호 유지하면서 데이터 새로고침
            fetchUsers(currentPage, currentFilters);
            return result;
        } else {
            throw new Error(result.error || '사용자 수정 실패');
        }
    } catch (error) {
        console.error('사용자 수정 오류:', error);
        alert('사용자 수정에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
        throw error;
    }
}

// 사용자 수정 함수 (모달 표시)
async function editUser(id) {
    // 현재 로그인된 사용자의 role 확인
    const currentAdminRole = localStorage.getItem('adminRole');
    
    // Role 5는 사용자 정보 수정 불가
    if (currentAdminRole === '5') {
        alert('사용자 정보를 수정할 권한이 없습니다.');
        return;
    }
    
    try {
        // 수정하려는 사용자 정보 가져오기
        const user = await getRequest(`/users/${id}`);
        
        // 관리권한 3, 4인 경우 같은 부서인지 확인
        if (['3', '4'].includes(currentAdminRole)) {
            try {
                const userDept = await getCurrentUserDepartment();
                if (!userDept) {
                    alert('현재 사용자의 부서 정보를 확인할 수 없습니다. 관리자에게 문의하세요.');
                    return;
                }
                if (user.dept !== userDept) {
                    alert('같은 부서의 사용자만 수정할 수 있습니다.');
                    return;
                }
            } catch (error) {
                console.error('부서 정보 확인 중 오류:', error);
                alert('부서 정보를 확인하는 중 오류가 발생했습니다. 다시 시도해주세요.');
                return;
            }
        }
        
        // DB 필드를 클라이언트 필드로 매핑 (null 체크 추가)
        const mappedUser = {
            loginId: user.user_id || '',
            name: user.name || '',
            department: user.dept || '',
            position: user.job_grade || '',
            title: user.job_position || '',
            role: (user.permission != null ? (user.permission === 0 ? '1' : user.permission.toString()) : '5'),  // permission이 0이면 1로, null이면 기본값 5
            csr: (user.csr_search_div != null ? user.csr_search_div : '0').toString(),  // 기본값 0
            adminRole: (user.admin_role != null ? user.admin_role : '5').toString(),  // 기본값 5
            isWorked: (user.is_worked != null ? user.is_worked : 0).toString()  // 재직여부 기본값 0 (재직)
        };

        // 수정 모달의 입력 필드에 현재 값 설정
        document.getElementById('edit-user-id').value = mappedUser.loginId;
        document.getElementById('edit-user-name').value = mappedUser.name;
        document.getElementById('edit-user-login-id').value = mappedUser.loginId;
        document.getElementById('edit-user-department').value = mappedUser.department;
        document.getElementById('edit-user-position').value = mappedUser.position;
        document.getElementById('edit-user-title').value = mappedUser.title;
        document.getElementById('edit-user-role').value = mappedUser.role;
        document.getElementById('edit-user-csr').value = mappedUser.csr;
        document.getElementById('edit-user-admin-role').value = mappedUser.adminRole;
        document.getElementById('edit-user-is-worked').value = mappedUser.isWorked;

        // 원본 데이터를 data-original 속성으로 저장 (변경 사항 추적용)
        document.getElementById('edit-user-login-id').setAttribute('data-original', mappedUser.loginId);
        document.getElementById('edit-user-department').setAttribute('data-original', mappedUser.department);
        document.getElementById('edit-user-position').setAttribute('data-original', mappedUser.position);
        document.getElementById('edit-user-title').setAttribute('data-original', mappedUser.title);
        document.getElementById('edit-user-role').setAttribute('data-original', mappedUser.role);
        document.getElementById('edit-user-csr').setAttribute('data-original', mappedUser.csr);
        document.getElementById('edit-user-admin-role').setAttribute('data-original', mappedUser.adminRole);
        document.getElementById('edit-user-is-worked').setAttribute('data-original', mappedUser.isWorked);
        
        const adminRoleSelect = document.getElementById('edit-user-admin-role');
        
        // 권한별 관리권한 필드 제어
        if (currentAdminRole === '0' || currentAdminRole === '1') {
            // 권한 0 (최고관리자), 권한 1 (관리자_1)만 관리권한 수정 가능
            adminRoleSelect.disabled = false;
            adminRoleSelect.style.backgroundColor = '#ffffff';
            adminRoleSelect.style.color = '#000000';
            adminRoleSelect.style.cursor = 'pointer';
        } else {
            // 다른 권한은 관리권한 필드를 readonly로 설정 (기존 값 유지)
            adminRoleSelect.disabled = true;
            adminRoleSelect.style.backgroundColor = '#f5f5f5';
            adminRoleSelect.style.color = '#666666';
            adminRoleSelect.style.cursor = 'not-allowed';
        }
        
        // 수정 모달 표시
        document.getElementById('edit-user-modal').style.display = 'block';

        // 부서 입력 필드 초기화
        const selectElement = document.getElementById('edit-user-department');
        const inputElement = document.getElementById('edit-user-department-direct');
        const button = document.querySelector('#edit-user-modal .department-direct-input-btn');
        
        if (selectElement && inputElement && button) {
            selectElement.classList.remove('hidden');
            inputElement.classList.remove('active');
            button.textContent = '직접 입력';
            inputElement.value = '';  // 직접입력 필드도 초기화
        }
        
    } catch (error) {
        console.error('사용자 정보 조회 오류:', error);
        alert('사용자 정보를 불러오는데 실패했습니다.');
    }
}

// 삭제 확인 모달 표시
async function showDeleteConfirm() {
    const userId = document.getElementById('edit-user-id').value;
    const userName = document.getElementById('edit-user-name').value;
    const currentAdminRole = localStorage.getItem('adminRole');
    
    // 최고관리자 권한 체크 (admin_role 0 또는 1만 삭제 가능)
    if (currentAdminRole !== '0' && currentAdminRole !== '1') {
        alert('최고관리자만 사용자를 삭제할 수 있습니다.');
        return;
    }
    
    // 삭제할 사용자 정보를 삭제 모달에 설정
    document.getElementById('delete-user-id').value = userId;
    document.getElementById('delete-user-name').value = userName;
    
    // 입력 필드 초기화
    document.getElementById('admin-id').value = '';
    document.getElementById('admin-password').value = '';
    
    // 수정 모달 닫고 삭제 확인 모달 표시
    document.getElementById('edit-user-modal').style.display = 'none';
    document.getElementById('delete-confirm-modal').style.display = 'block';
}

// 삭제 확인 모달 닫기
function closeDeleteConfirm() {
    document.getElementById('delete-confirm-modal').style.display = 'none';
    // 입력 필드 초기화
    document.getElementById('admin-id').value = '';
    document.getElementById('admin-password').value = '';
}

// 사용자 삭제 함수
async function deleteUserFromServer(deleteUserId, adminId, adminPassword) {
    try {
        console.log('사용자 삭제 요청 시작:', deleteUserId);

        // 최고관리자 권한 체크 (admin_role 0 또는 1만 삭제 가능)
        const currentAdminRole = localStorage.getItem('adminRole');
        if (currentAdminRole !== '0' && currentAdminRole !== '1') {
            throw new Error('최고관리자만 사용자를 삭제할 수 있습니다.');
        }

        // 삭제 전 사용자 존재 여부 확인
        try {
            const userCheck = await getRequest(`/users/${deleteUserId}`);
            console.log('삭제 대상 사용자 확인:', userCheck);
            if (!userCheck) {
                throw new Error('삭제하려는 사용자를 찾을 수 없습니다.');
            }
        } catch (checkError) {
            console.error('사용자 확인 중 오류:', checkError);
            throw new Error('삭제하려는 사용자를 찾을 수 없습니다.');
        }

        // API 요청 데이터 준비
        const requestData = {
            user_id: adminId,
            password: adminPassword,
            delete_user_id: deleteUserId
        };

        console.log('API 요청 데이터:', {
            ...requestData,
            password: '****'
        });
        
        // API 호출
        const response = await fetch(`/api/admin/deleteUser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        console.log('API 응답:', result);
        
        if (result.status_code === 200) {
            console.log('사용자 삭제 성공');
            // 검색 필터를 포함한 현재 상태로 목록 새로고침
            const searchTerm = document.getElementById('user-search').value.toLowerCase();
            const currentFilters = { ...activeFilters };
            if (searchTerm.trim()) {
                currentFilters.search = searchTerm;
            }
            fetchUsers(currentPage, currentFilters);
            return result;
        } else {
            throw new Error(result.error || '사용자 삭제 실패');
        }
    } catch (error) {
        console.error('사용자 삭제 오류:', error);
        alert('사용자 삭제에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
        throw error;
    }
}

// DOM이 로드되면 실행
document.addEventListener('DOMContentLoaded', () => {
    const addModal = document.getElementById('add-user-modal');
    const editModal = document.getElementById('edit-user-modal');
    const addButton = document.getElementById('add-user');
    const closeButtons = document.querySelectorAll('.close');
    const addForm = document.getElementById('add-user-form');
    const editForm = document.getElementById('edit-user-form');
    const applyFilterBtn = document.getElementById('apply-filter');
    const clearFilterBtn = document.getElementById('clear-filter');
    const searchBtn = document.getElementById('search-user');

    // 현재 사용자의 role에 따른 UI 제어
    const currentAdminRole = localStorage.getItem('adminRole');
    if (['3', '4', '5'].includes(currentAdminRole)) {
        // Role 3, 4, 5는 사용자 추가 버튼 비활성화 및 스타일 변경
        if (addButton) {
            addButton.disabled = true;
            addButton.style.backgroundColor = '#cccccc';
            addButton.style.color = '#666666';
            addButton.style.cursor = 'not-allowed';
            addButton.title = '사용자 추가 권한이 없습니다.';
        }
    }

    // URL에서 현재 페이지, 필터 상태, 검색어를 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const savedPage = parseInt(urlParams.get('page')) || 1;
    const savedSearchTerm = urlParams.get('search') || '';
    const savedFilters = {
        department: urlParams.get('department') || '',
        position: urlParams.get('position') || '',
        title: urlParams.get('title') || '',
        role: urlParams.get('role') || '',
        csr: urlParams.get('csr') || '',
        adminRole: urlParams.get('adminRole') || ''
    };

    // 저장된 상태로 초기화
    currentPage = savedPage;
    activeFilters = savedFilters;
    
    // 검색어 복원
    if (savedSearchTerm) {
        currentSearchTerm = savedSearchTerm;
        document.getElementById('user-search').value = savedSearchTerm;
    }

    // 필터 UI 상태 복원
    Object.entries(savedFilters).forEach(([key, value]) => {
        const filterElement = document.getElementById(`${key}-filter`);
        if (filterElement && value) {
            filterElement.value = value;
        }
    });

    // 저장된 상태로 사용자 목록 불러오기
    fetchUsers(currentPage, activeFilters);

    // 이름 컬럼 클릭 시 정렬 (이미 받아온 데이터 기준, 클라이언트 정렬)
    const nameHeader = document.getElementById('name-header');
    if (nameHeader) {
        nameHeader.style.cursor = 'pointer';
        nameHeader.title = '정렬 변경 (입사순 → 이름 오름차순 → 이름 내림차순)';

        nameHeader.addEventListener('click', () => {
            if (!allUsers || allUsers.length === 0) return;

            // 정렬 상태 순환: 0(입사순) → 1(이름 오름차순) → 2(이름 내림차순) → 0(입사순)
            nameSortState = (nameSortState + 1) % 3;

            // 정렬 아이콘 업데이트
            const sortIcon = nameHeader.querySelector('.sort-icon');
            if (sortIcon) {
                sortIcon.classList.remove('asc', 'desc', 'default');

                if (nameSortState === 0) {
                    // 입사순 (기본)
                    sortIcon.classList.add('default');
                    sortIcon.textContent = '↕';
                    allUsers = JSON.parse(JSON.stringify(originalUsers));
                } else if (nameSortState === 1) {
                    // 이름 오름차순 (ㄱ → ㅎ)
                    sortIcon.classList.add('asc');
                    sortIcon.textContent = '';
                    allUsers.sort((a, b) => {
                        if (!a.name) return 1;
                        if (!b.name) return -1;
                        return a.name.localeCompare(b.name, 'ko-KR');
                    });
                } else if (nameSortState === 2) {
                    // 이름 내림차순 (ㅎ → ㄱ)
                    sortIcon.classList.add('desc');
                    sortIcon.textContent = '';
                    allUsers.sort((a, b) => {
                        if (!a.name) return 1;
                        if (!b.name) return -1;
                        return b.name.localeCompare(a.name, 'ko-KR');
                    });
                }
            }

            // 정렬된 데이터로 다시 렌더링
            displayUsersForCurrentPage();
        });
    }

    // 재직여부 드롭다운 변경 이벤트 - 퇴사일자 필드 표시/숨김
    const isWorkedSelect = document.getElementById('edit-user-is-worked');
    const resignDateGroup = document.getElementById('resign-date-group');
    const resignDateInput = document.getElementById('edit-user-resign-date');

    if (isWorkedSelect && resignDateGroup) {
        isWorkedSelect.addEventListener('change', function() {
            if (this.value === '1') {
                // 퇴사 선택 시
                resignDateGroup.style.display = 'block';
                resignDateInput.required = true;
                // 기본값을 오늘 날짜로 설정
                const today = new Date().toISOString().split('T')[0];
                resignDateInput.value = today;
            } else {
                // 재직 선택 시
                resignDateGroup.style.display = 'none';
                resignDateInput.required = false;
                resignDateInput.value = '';
            }
        });
    }

    // 필터 버튼 이벤트 리스너
    applyFilterBtn.addEventListener('click', applyFilters);
    clearFilterBtn.addEventListener('click', clearFilters);
    
    // 검색 버튼 이벤트 리스너
    searchBtn.addEventListener('click', searchUser);
    
    // 검색 입력창에서 Enter 키 이벤트 처리
    document.getElementById('user-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchUser();
        }
    });

    // 모달 열기 (추가)
    addButton.addEventListener('click', () => {
        // 현재 로그인된 사용자의 role 확인
        const currentAdminRole = localStorage.getItem('adminRole');

        // Role 3, 4, 5는 사용자 추가 불가
        if (['3', '4', '5'].includes(currentAdminRole)) {
            alert('사용자를 추가할 권한이 없습니다.');
            return;
        }

        // 입사일자 기본값을 오늘 날짜로 설정
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('user-join-date').value = today;

        // 부서 입력 필드 초기화
        const selectElement = document.getElementById('user-department');
        const inputElement = document.getElementById('user-department-direct');
        const button = document.querySelector('#add-user-modal .department-direct-input-btn');

        selectElement.classList.remove('hidden');
        inputElement.classList.remove('active');
        button.textContent = '직접 입력';
        
        // 관리권한 필드 제어
        const adminRoleSelect = document.getElementById('user-admin-role');
        
        if (currentAdminRole === '0' || currentAdminRole === '1') {
            // 권한 0 (최고관리자), 권한 1 (관리자_1)만 관리권한 수정 가능
            adminRoleSelect.disabled = false;
            adminRoleSelect.style.backgroundColor = '#ffffff';
            adminRoleSelect.style.color = '#000000';
            adminRoleSelect.style.cursor = 'pointer';
        } else {
            // 다른 권한은 관리권한 필드를 readonly로 설정
            adminRoleSelect.disabled = true;
            adminRoleSelect.style.backgroundColor = '#f5f5f5';
            adminRoleSelect.style.color = '#666666';
            adminRoleSelect.style.cursor = 'not-allowed';
            // 기본값을 일반 위원 권한으로 설정
            adminRoleSelect.value = '5'; // 일반 위원 권한으로 고정
        }
        
        // 부서 입력 상태 초기화
        const departmentSelect = document.getElementById('user-department');
        const departmentInput = document.getElementById('user-department-direct');
        const departmentButton = document.querySelector('#add-user-modal .department-direct-input-btn');
        
        if (departmentSelect && departmentInput && departmentButton) {
            departmentSelect.classList.remove('hidden');
            departmentInput.classList.remove('active');
            departmentButton.textContent = '직접 입력';
            departmentSelect.value = '';
            departmentInput.value = '';
        }
        
        addModal.style.display = 'block';
    });

    // 모달 닫기
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 부서 입력 상태 초기화 (새 사용자 추가 모달)
            const addDepartmentSelect = document.getElementById('user-department');
            const addDepartmentInput = document.getElementById('user-department-direct');
            const addDepartmentButton = document.querySelector('#add-user-modal .department-direct-input-btn');
            
            if (addDepartmentSelect && addDepartmentInput && addDepartmentButton) {
                addDepartmentSelect.classList.remove('hidden');
                addDepartmentInput.classList.remove('active');
                addDepartmentButton.textContent = '직접 입력';
                addDepartmentSelect.required = true;
                addDepartmentInput.required = false;
                addDepartmentInput.value = '';
                addDepartmentSelect.value = '';
            }
            
            // 부서 입력 상태 초기화 (사용자 수정 모달)
            const editDepartmentSelect = document.getElementById('edit-user-department');
            const editDepartmentInput = document.getElementById('edit-user-department-direct');
            const editDepartmentButton = document.querySelector('#edit-user-modal .department-direct-input-btn');
            
            if (editDepartmentSelect && editDepartmentInput && editDepartmentButton) {
                editDepartmentSelect.classList.remove('hidden');
                editDepartmentInput.classList.remove('active');
                editDepartmentButton.textContent = '직접 입력';
                editDepartmentSelect.required = true;
                editDepartmentInput.required = false;
                editDepartmentInput.value = '';
            }
            
            addModal.style.display = 'none';
            editModal.style.display = 'none';
        });
    });

    // 모달 외부 클릭시 닫기
    window.addEventListener('click', (e) => {
        if (e.target === addModal) {
            // 부서 입력 상태 초기화 (새 사용자 추가 모달)
            const addDepartmentSelect = document.getElementById('user-department');
            const addDepartmentInput = document.getElementById('user-department-direct');
            const addDepartmentButton = document.querySelector('#add-user-modal .department-direct-input-btn');
            
            if (addDepartmentSelect && addDepartmentInput && addDepartmentButton) {
                addDepartmentSelect.classList.remove('hidden');
                addDepartmentInput.classList.remove('active');
                addDepartmentButton.textContent = '직접 입력';
                addDepartmentSelect.required = true;
                addDepartmentInput.required = false;
                addDepartmentInput.value = '';
                addDepartmentSelect.value = '';
            }
            
            addModal.style.display = 'none';
        }
        if (e.target === editModal) {
            // 부서 입력 상태 초기화 (사용자 수정 모달)
            const editDepartmentSelect = document.getElementById('edit-user-department');
            const editDepartmentInput = document.getElementById('edit-user-department-direct');
            const editDepartmentButton = document.querySelector('#edit-user-modal .department-direct-input-btn');
            
            if (editDepartmentSelect && editDepartmentInput && editDepartmentButton) {
                editDepartmentSelect.classList.remove('hidden');
                editDepartmentInput.classList.remove('active');
                editDepartmentButton.textContent = '직접 입력';
                editDepartmentSelect.required = true;
                editDepartmentInput.required = false;
                editDepartmentInput.value = '';
            }
            
            editModal.style.display = 'none';
        }
    });

    // 추가 폼 제출 처리
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // 부서 값 처리: 직접입력 모드인 경우 값을 select에 추가하고 선택
        const departmentInput = document.getElementById('user-department-direct');
        const departmentSelect = document.getElementById('user-department');
        let department = '';
        
        if (departmentInput.classList.contains('active')) {
            // 직접 입력 모드
            const directValue = departmentInput.value.trim();
            if (directValue) {
                // 직접 입력한 값을 select에 추가 (이미 존재하지 않는 경우)
                const existingOption = Array.from(departmentSelect.options).find(option => 
                    option.value === directValue
                );
                
                if (!existingOption) {
                    const newOption = document.createElement('option');
                    newOption.value = directValue;
                    newOption.text = directValue;
                    departmentSelect.appendChild(newOption);
                }
                departmentSelect.value = directValue;
                department = directValue;
            }
        } else {
            // 선택 모드
            department = departmentSelect.value;
        }
        
        const userData = {
            name: document.getElementById('user-name').value,
            loginId: document.getElementById('user-id').value,
            joinDate: document.getElementById('user-join-date').value,  // 입사일자 추가
            department: department,
            position: document.getElementById('user-position').value,
            title: document.getElementById('user-title').value,
            role: document.getElementById('user-role').value,
            csr: document.getElementById('user-csr').value,
            adminRole: document.getElementById('user-admin-role').value  // 관리권한 추가
        };
        
        // 서버에 사용자 추가 요청
        addUserToServer(userData)
            .then(async () => {
                // 추가 성공 시 admin_history에 기록
                await recordAdminActivityForAdd(userData);
                
                // 폼 초기화 및 모달 닫기
                addForm.reset();
                
                // 부서 입력 상태 초기화
                const addDepartmentSelect = document.getElementById('user-department');
                const addDepartmentInput = document.getElementById('user-department-direct');
                const addDepartmentButton = document.querySelector('#add-user-modal .department-direct-input-btn');
                
                if (addDepartmentSelect && addDepartmentInput && addDepartmentButton) {
                    addDepartmentSelect.classList.remove('hidden');
                    addDepartmentInput.classList.remove('active');
                    addDepartmentButton.textContent = '직접 입력';
                    addDepartmentSelect.required = true;
                    addDepartmentInput.required = false;
                    addDepartmentInput.value = '';
                }
                
                addModal.style.display = 'none';
                alert('사용자가 성공적으로 추가되었습니다.');
            })
            .catch(err => {
                console.error('추가 실패:', err);
                // 에러 메시지는 addUserToServer에서 이미 표시됨
            });
    });

    // 수정 폼 제출 처리
    editForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const id = document.getElementById('edit-user-id').value;
        const targetUserName = document.getElementById('edit-user-name').value;
        
        // 부서 값 처리: 직접입력 모드인 경우 값을 select에 추가하고 선택
        const departmentInput = document.getElementById('edit-user-department-direct');
        const departmentSelect = document.getElementById('edit-user-department');
        let department = '';
        
        if (departmentInput.classList.contains('active')) {
            // 직접 입력 모드
            const directValue = departmentInput.value.trim();
            if (directValue) {
                // 직접 입력한 값을 select에 추가 (이미 존재하지 않는 경우)
                const existingOption = Array.from(departmentSelect.options).find(option => 
                    option.value === directValue
                );
                
                if (!existingOption) {
                    const newOption = document.createElement('option');
                    newOption.value = directValue;
                    newOption.text = directValue;
                    departmentSelect.appendChild(newOption);
                }
                departmentSelect.value = directValue;
                department = directValue;
            }
        } else {
            // 선택 모드
            department = departmentSelect.value;
        }
        
        // 변경 전 데이터 저장 (비교용)
        const originalData = {
            loginId: document.getElementById('edit-user-login-id').defaultValue || document.getElementById('edit-user-login-id').getAttribute('data-original'),
            department: document.getElementById('edit-user-department').getAttribute('data-original'),
            position: document.getElementById('edit-user-position').getAttribute('data-original'),
            title: document.getElementById('edit-user-title').getAttribute('data-original'),
            role: document.getElementById('edit-user-role').getAttribute('data-original'),
            csr: document.getElementById('edit-user-csr').getAttribute('data-original'),
            adminRole: document.getElementById('edit-user-admin-role').getAttribute('data-original'),
            isWorked: document.getElementById('edit-user-is-worked').getAttribute('data-original')
        };

        const userData = {
            loginId: document.getElementById('edit-user-login-id').value,
            department: department,
            position: document.getElementById('edit-user-position').value,
            title: document.getElementById('edit-user-title').value,
            role: document.getElementById('edit-user-role').value,
            csr: document.getElementById('edit-user-csr').value,
            adminRole: document.getElementById('edit-user-admin-role').value,
            isWorked: document.getElementById('edit-user-is-worked').value
        };

        // 퇴사일자 추가 (퇴사 선택 시에만)
        const resignDateInput = document.getElementById('edit-user-resign-date');
        if (userData.isWorked === '1' && resignDateInput.value) {
            userData.resignDate = resignDateInput.value;
        }
        
        // 변경 사항 감지
        const changes = {};
        for (const [key, newValue] of Object.entries(userData)) {
            if (originalData[key] && originalData[key] !== newValue) {
                changes[key] = {
                    from: originalData[key],
                    to: newValue
                };
            }
        }
        
        // 서버에 사용자 수정 요청
        try {
            await updateUserOnServer(id, userData);
            
            // 수정 성공 시 admin_history에 기록 (변경 사항이 있는 경우에만)
            if (Object.keys(changes).length > 0) {
                await recordAdminActivity(targetUserName, changes);
            }
            
            // 모달 닫기
            document.getElementById('edit-user-modal').style.display = 'none';
            alert('사용자 정보가 성공적으로 수정되었습니다.');
        } catch (err) {
            console.error('수정 실패:', err);
            // 에러 메시지는 updateUserOnServer에서 이미 표시됨
        }
    });

    // 삭제 확인 폼 제출 처리
    const deleteConfirmForm = document.getElementById('delete-confirm-form');
    if (deleteConfirmForm) {
        deleteConfirmForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userId = document.getElementById('delete-user-id').value;
            const userName = document.getElementById('delete-user-name').value;
            const adminId = document.getElementById('admin-id').value;
            const adminPassword = document.getElementById('admin-password').value;
            
            if (confirm(`정말 ${userName}(${userId}) 사용자를 삭제하시겠습니까?`)) {
                try {
                    await deleteUserFromServer(userId, adminId, adminPassword);
                    
                    // 삭제 성공 시 admin_history에 기록
                    await recordAdminActivityForDelete(userName, userId);
                    
                    // 모달 닫기
                    closeDeleteConfirm();
                    alert('사용자가 성공적으로 삭제되었습니다.');
                } catch (err) {
                    console.error('삭제 실패:', err);
                    // 에러 메시지는 deleteUserFromServer에서 이미 표시됨
                }
            }
        });
    }

    // 삭제 모달 닫기 버튼 이벤트
    const deleteModalCloseBtn = document.querySelector('#delete-confirm-modal .close');
    if (deleteModalCloseBtn) {
        deleteModalCloseBtn.addEventListener('click', closeDeleteConfirm);
    }

    // 삭제 모달 외부 클릭 시 닫기
    window.addEventListener('click', (e) => {
        const deleteModal = document.getElementById('delete-confirm-modal');
        if (e.target === deleteModal) {
            closeDeleteConfirm();
        }
    });

    // 부서 입력 방식 전환 함수
    function toggleDepartmentInput() {
        const selectElement = document.getElementById('edit-user-department');
        const inputElement = document.getElementById('edit-user-department-direct');
        const button = document.querySelector('#edit-user-modal .department-direct-input-btn');
        
        if (!selectElement || !inputElement || !button) {
            console.error('부서 입력 요소를 찾을 수 없습니다.');
            return;
        }
        
        if (selectElement.classList.contains('hidden')) {
            // 직접 입력 모드에서 선택 모드로 전환
            selectElement.classList.remove('hidden');
            inputElement.classList.remove('active');
            button.textContent = '직접 입력';
            
            // required 속성 관리
            selectElement.required = true;
            inputElement.required = false;
            
            // 직접 입력한 값이 있으면 선택 옵션에 추가하고 선택
            if (inputElement.value.trim()) {
                const existingOption = Array.from(selectElement.options).find(option => 
                    option.value === inputElement.value.trim()
                );
                
                if (!existingOption) {
                    const newOption = document.createElement('option');
                    newOption.value = inputElement.value.trim();
                    newOption.text = inputElement.value.trim();
                    selectElement.appendChild(newOption);
                }
                selectElement.value = inputElement.value.trim();
            }
        } else {
            // 선택 모드에서 직접 입력 모드로 전환
            selectElement.classList.add('hidden');
            inputElement.classList.add('active');
            button.textContent = '선택 목록';
            
            // required 속성 관리
            selectElement.required = false;
            inputElement.required = true;
            
            // 현재 선택된 값이 있으면 입력 필드에 설정
            if (selectElement.value) {
                inputElement.value = selectElement.value;
            }
            
            // 직접 입력 필드에 포커스
            setTimeout(() => {
                inputElement.focus();
            }, 100);
        }
    }

    // 새 사용자 추가 다이얼로그의 부서 입력 방식 전환 함수
    function toggleAddDepartmentInput() {
        const selectElement = document.getElementById('user-department');
        const inputElement = document.getElementById('user-department-direct');
        const button = document.querySelector('#add-user-modal .department-direct-input-btn');
        
        if (!selectElement || !inputElement || !button) {
            console.error('부서 입력 요소를 찾을 수 없습니다.');
            return;
        }
        
        if (selectElement.classList.contains('hidden')) {
            // 직접 입력 모드에서 선택 모드로 전환
            selectElement.classList.remove('hidden');
            inputElement.classList.remove('active');
            button.textContent = '직접 입력';
            
            // required 속성 관리
            selectElement.required = true;
            inputElement.required = false;
            
            // 직접 입력한 값이 있으면 선택 옵션에 추가하고 선택
            if (inputElement.value.trim()) {
                const existingOption = Array.from(selectElement.options).find(option => 
                    option.value === inputElement.value.trim()
                );
                
                if (!existingOption) {
                    const newOption = document.createElement('option');
                    newOption.value = inputElement.value.trim();
                    newOption.text = inputElement.value.trim();
                    selectElement.appendChild(newOption);
                }
                selectElement.value = inputElement.value.trim();
            }
        } else {
            // 선택 모드에서 직접 입력 모드로 전환
            selectElement.classList.add('hidden');
            inputElement.classList.add('active');
            button.textContent = '선택 목록';
            
            // required 속성 관리
            selectElement.required = false;
            inputElement.required = true;
            
            // 현재 선택된 값이 있으면 입력 필드에 설정
            if (selectElement.value) {
                inputElement.value = selectElement.value;
            }
            
            // 직접 입력 필드에 포커스
            setTimeout(() => {
                inputElement.focus();
            }, 100);
        }
    }
});

// 비밀번호 초기화 함수
async function resetPassword() {
    const userId = document.getElementById('edit-user-id').value;
    const userName = document.getElementById('edit-user-name').value;
    
    if (!userId) {
        alert('사용자 정보를 찾을 수 없습니다.');
        return;
    }
    
    // 확인 대화상자
    if (confirm(`${userName}님의 비밀번호를 초기화하시겠습니까?\n\n초기화된 비밀번호는 임시 비밀번호로 설정됩니다.`)) {
        try {
            console.log('비밀번호 초기화 요청:', userId);
            
            // 로딩 상태 표시
            const button = document.querySelector('.btn-reset-password');
            const originalText = button.textContent;
            button.textContent = '처리 중...';
            button.disabled = true;
            
            // API 호출
            const response = await fetch('/api/admin/initPassword', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId
                })
            });

            console.log('API 응답 상태:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API 오류 응답:', errorText);
                throw new Error(`비밀번호 초기화 실패: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('API 응답 결과:', result);
            
            if (result.error) {
                throw new Error(result.error);
            }

            if (!result.new_password) {
                throw new Error('새 비밀번호를 받을 수 없습니다.');
            }

            // 성공 메시지 표시
            alert(`비밀번호가 성공적으로 초기화되었습니다.\n\n새 비밀번호: ${result.new_password}\n\n사용자에게 새 비밀번호를 안전하게 전달해주세요.`);
            
            console.log('비밀번호 초기화 완료:', result.new_password);

        } catch (error) {
            console.error('비밀번호 초기화 오류:', error);
            alert(`비밀번호 초기화에 실패했습니다: ${error.message}`);
        } finally {
            // 버튼 상태 복원
            const button = document.querySelector('.btn-reset-password');
            if (button) {
                button.textContent = '비밀번호 초기화';
                button.disabled = false;
            }
        }
    }
}

// 전역에서 접근 가능하도록 함수들을 window 객체에 등록
window.resetPassword = resetPassword;

window.toggleDepartmentInput = function() {
    const selectElement = document.getElementById('edit-user-department');
    const inputElement = document.getElementById('edit-user-department-direct');
    const button = document.querySelector('#edit-user-modal .department-direct-input-btn');
    
    if (!selectElement || !inputElement || !button) {
        console.error('부서 입력 요소를 찾을 수 없습니다.');
        return;
    }
    
    if (selectElement.classList.contains('hidden')) {
        // 직접 입력 모드에서 선택 모드로 전환
        selectElement.classList.remove('hidden');
        inputElement.classList.remove('active');
        button.textContent = '직접 입력';
        
        // required 속성 관리
        selectElement.required = true;
        inputElement.required = false;
        
        // 직접 입력한 값이 있으면 선택 옵션에 추가하고 선택
        if (inputElement.value.trim()) {
            const existingOption = Array.from(selectElement.options).find(option => 
                option.value === inputElement.value.trim()
            );
            
            if (!existingOption) {
                const newOption = document.createElement('option');
                newOption.value = inputElement.value.trim();
                newOption.text = inputElement.value.trim();
                selectElement.appendChild(newOption);
            }
            selectElement.value = inputElement.value.trim();
        }
    } else {
        // 선택 모드에서 직접 입력 모드로 전환
        selectElement.classList.add('hidden');
        inputElement.classList.add('active');
        button.textContent = '선택 목록';
        
        // required 속성 관리
        selectElement.required = false;
        inputElement.required = true;
        
        // 현재 선택된 값이 있으면 입력 필드에 설정
        if (selectElement.value) {
            inputElement.value = selectElement.value;
        }
        
        // 직접 입력 필드에 포커스
        setTimeout(() => {
            inputElement.focus();
        }, 100);
    }
};

window.toggleAddDepartmentInput = function() {
    const selectElement = document.getElementById('user-department');
    const inputElement = document.getElementById('user-department-direct');
    const button = document.querySelector('#add-user-modal .department-direct-input-btn');
    
    if (!selectElement || !inputElement || !button) {
        console.error('부서 입력 요소를 찾을 수 없습니다.');
        return;
    }
    
    if (selectElement.classList.contains('hidden')) {
        // 직접 입력 모드에서 선택 모드로 전환
        selectElement.classList.remove('hidden');
        inputElement.classList.remove('active');
        button.textContent = '직접 입력';
        
        // required 속성 관리
        selectElement.required = true;
        inputElement.required = false;
        
        // 직접 입력한 값이 있으면 선택 옵션에 추가하고 선택
        if (inputElement.value.trim()) {
            const existingOption = Array.from(selectElement.options).find(option => 
                option.value === inputElement.value.trim()
            );
            
            if (!existingOption) {
                const newOption = document.createElement('option');
                newOption.value = inputElement.value.trim();
                newOption.text = inputElement.value.trim();
                selectElement.appendChild(newOption);
            }
            selectElement.value = inputElement.value.trim();
        }
    } else {
        // 선택 모드에서 직접 입력 모드로 전환
        selectElement.classList.add('hidden');
        inputElement.classList.add('active');
        button.textContent = '선택 목록';
        
        // required 속성 관리
        selectElement.required = false;
        inputElement.required = true;
        
        // 현재 선택된 값이 있으면 입력 필드에 설정
        if (selectElement.value) {
            inputElement.value = selectElement.value;
        }
        
        // 직접 입력 필드에 포커스
        setTimeout(() => {
            inputElement.focus();
        }, 100);
    }
};

// 관리권한 텍스트 변환 함수
function getAdminRoleText(adminRole) {
    const roleMap = {
        '0': '0 : 최고관리자',
        '1': '1 : 관리자_1',
        '2': '2 : 관리자_2',
        '3': '3 : 본부장',
        '4': '4 : 사업부장',
        '5': '5 : 일반위원'
    };
    return roleMap[adminRole] || '';
}

// 활성 필터 표시 업데이트
function updateActiveFilters() {
    const activeFiltersContainer = document.getElementById('active-filters');
    activeFiltersContainer.innerHTML = '';
    
    // 모든 필터를 동일한 방식으로 처리
    Object.entries(activeFilters).forEach(([type, value]) => {
        if (value) {
            const labels = {
                department: '부서',
                position: '직급',
                title: '직책',
                role: '권한',
                csr: 'CSR',
                adminRole: '관리권한'
            };
            // 모든 필터에 대해 value를 직접 사용
            addFilterTag(labels[type], value, type);
        }
    });
}

// 현재 로그인한 사용자의 부서 정보를 가져오는 함수
async function getCurrentUserDepartment() {
    if (currentUserDepartment) {
        return currentUserDepartment;
    }
    
    const currentUsername = localStorage.getItem('username') || localStorage.getItem('userId');
    
    // 먼저 현재 로드된 사용자 목록에서 찾기
    if (allUsers && allUsers.length > 0) {
        const currentUser = allUsers.find(user => user.loginId === currentUsername);
        if (currentUser) {
            currentUserDepartment = currentUser.department;
            return currentUserDepartment;
        }
    }
    
    try {
        // 사용자 목록에서 찾지 못한 경우 API 호출
        const data = await getRequest('/users', {
            search: currentUsername,
            limit: 100  // 검색 결과를 늘려서 찾을 확률을 높임
        });
        
        if (data.users && data.users.length > 0) {
            const currentUser = data.users.find(user => user.user_id === currentUsername);
            if (currentUser) {
                currentUserDepartment = currentUser.dept;
                return currentUserDepartment;
            }
        }
        
        console.warn('현재 사용자를 찾을 수 없습니다:', currentUsername);
        return null;
    } catch (error) {
        console.error('현재 사용자 정보 조회 오류:', error);
        return null;
    }
}

// 사용자 수정 권한 확인 함수
async function canEditUser(targetUserDepartment) {
    const currentAdminRole = localStorage.getItem('adminRole');
    
    // Role 5는 수정 불가
    if (currentAdminRole === '5') {
        return false;
    }
    
    // Role 1, 2는 모든 사용자 수정 가능
    if (['1', '2'].includes(currentAdminRole)) {
        return true;
    }
    
    // Role 3, 4는 같은 부서만 수정 가능
    if (['3', '4'].includes(currentAdminRole)) {
        const userDept = await getCurrentUserDepartment();
        return userDept === targetUserDepartment;
    }
    
    return false;
}

// 관리자 활동 기록 함수
async function recordAdminActivity(targetUserName, changes) {
    try {
        const currentUsername = localStorage.getItem('username') || localStorage.getItem('userId');
        const currentAdminRole = localStorage.getItem('adminRole');
        
        // role 2, 3, 4만 기록 (role 1은 최고관리자이므로 모든 활동을 볼 수 있지만, role 5는 수정 권한이 없음)
        if (!['2', '3', '4'].includes(currentAdminRole)) {
            return;
        }
        
        // 현재 사용자 이름 가져오기
        let currentUserName = currentUsername;
        if (allUsers && allUsers.length > 0) {
            const currentUser = allUsers.find(user => user.loginId === currentUsername);
            if (currentUser) {
                currentUserName = currentUser.name || currentUsername;
            }
        }
        
        const response = await fetch('/api/main/admin-activity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUsername,
                userName: currentUserName,
                targetUser: targetUserName,
                changes: changes,
                action: '사용자 정보 수정'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('관리자 활동 기록 성공:', result);
        
    } catch (error) {
        console.error('관리자 활동 기록 실패:', error);
        // 기록 실패해도 사용자 수정 작업에는 영향을 주지 않음
    }
}

// 사용자 추가 시 관리자 활동 기록 함수
async function recordAdminActivityForAdd(userData) {
    try {
        const currentUsername = localStorage.getItem('username') || localStorage.getItem('userId');
        const currentAdminRole = localStorage.getItem('adminRole');
        
        // role 1, 2만 사용자 추가 가능 (role 3, 4, 5는 추가 권한 없음)
        if (!['1', '2'].includes(currentAdminRole)) {
            return;
        }
        
        // 현재 사용자 이름 가져오기
        let currentUserName = currentUsername;
        if (allUsers && allUsers.length > 0) {
            const currentUser = allUsers.find(user => user.loginId === currentUsername);
            if (currentUser) {
                currentUserName = currentUser.name || currentUsername;
            }
        }
        
        const response = await fetch('/api/main/admin-activity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUsername,
                userName: currentUserName,
                targetUser: userData.name,
                action: `${currentUserName}이(가) 새로운 사용자 '${userData.name}(${userData.loginId})'을(를) 추가하였습니다.`
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('사용자 추가 활동 기록 성공:', result);
        
    } catch (error) {
        console.error('사용자 추가 활동 기록 실패:', error);
        // 기록 실패해도 사용자 추가 작업에는 영향을 주지 않음
    }
}

// 사용자 삭제 시 관리자 활동 기록 함수
async function recordAdminActivityForDelete(userName, userId) {
    try {
        const currentUsername = localStorage.getItem('username') || localStorage.getItem('userId');
        const currentAdminRole = localStorage.getItem('adminRole');
        
        // role 1, 2만 사용자 삭제 가능 (role 3, 4, 5는 삭제 권한 없음)
        if (!['1', '2'].includes(currentAdminRole)) {
            return;
        }
        
        // 현재 사용자 이름 가져오기
        let currentUserName = currentUsername;
        if (allUsers && allUsers.length > 0) {
            const currentUser = allUsers.find(user => user.loginId === currentUsername);
            if (currentUser) {
                currentUserName = currentUser.name || currentUsername;
            }
        }
        
        const response = await fetch('/api/main/admin-activity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUsername,
                userName: currentUserName,
                targetUser: userName,
                action: `${currentUserName}이(가) 사용자 '${userName}(${userId})'을(를) 삭제하였습니다.`
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('관리자 활동 기록 성공:', result);
        
    } catch (error) {
        console.error('관리자 활동 기록 실패:', error);
        // 기록 실패해도 사용자 삭제 작업에는 영향을 주지 않음
    }
} 
