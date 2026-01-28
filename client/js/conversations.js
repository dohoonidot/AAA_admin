// 대화 관리 기능 - 일시적으로 비활성화 및 숨김 처리
document.addEventListener('DOMContentLoaded', () => {
    // 대화 목록 관련 모든 요소 숨김
    hideAllConversationElements();

    // 기존 기능들은 모두 비활성화
    /*
    // 대화 목록 로드
    loadConversations();

    // 필터 기능 설정
    setupFilters();

    // 지난 대화 버튼 기능 설정
    setupPastConversationsButton();

    // 필터 옵션 업데이트
    updateFilterOptions();
    */
});

// 대화 목록 관련 모든 요소 숨김 처리 함수
function hideAllConversationElements() {
    console.log('대화 목록 관련 모든 요소 숨김 처리 시작');

    // 대화 컨트롤 영역 숨김
    const conversationControls = document.querySelector('.conversation-controls');
    if (conversationControls) {
        conversationControls.style.display = 'none';
    }

    // 테이블 컨테이너 숨김
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        tableContainer.style.display = 'none';
    }

    // 페이지네이션 숨김
    const pagination = document.getElementById('pagination');
    if (pagination) {
        pagination.style.display = 'none';
    }

    // 상세 모달 숨김
    const detailModal = document.getElementById('detail-modal');
    if (detailModal) {
        detailModal.style.display = 'none';
    }

    // 로딩 인디케이터 숨김
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }

    console.log('대화 목록 관련 모든 요소 숨김 처리 완료');
}

// 대화 목록 관리에 필요한 상태 변수들
let conversations = [];
let currentPage = 1;
let totalPages = 1;
let totalItems = 0;
let itemsPerPage = 100; // 페이지당 100개 항목 표시로 변경

// 필터 상태 저장
let activeFilters = {
    department: '',
    category: '',
    userName: '',
    deletedFilter: false
};

// 지난 대화 버튼 기능 설정
function setupPastConversationsButton() {
    const pastConversationsBtn = document.getElementById('past-conversations');
    if (pastConversationsBtn) {
        pastConversationsBtn.addEventListener('click', () => {
            // 현재 버튼 상태 확인 (이미 활성화된 경우 토글)
            const isActive = pastConversationsBtn.classList.contains('active');
            
            // 버튼 상태 토글
            pastConversationsBtn.classList.toggle('active');
            
            // 삭제된 대화 필터 토글
            activeFilters.deletedFilter = !isActive;
            
            console.log('[삭제된 대화 버튼] 클릭됨, 현재 상태:', !isActive);
            
            if (!isActive) {
                // 삭제된 대화로 전환 (태그 추가)
                addFilterTag('상태', '삭제됨', 'deletedFilter');
            } else {
                // 일반 대화로 전환 (태그 제거)
                const activeFiltersContainer = document.getElementById('active-filters');
                if (activeFiltersContainer) {
                    const tag = activeFiltersContainer.querySelector('.filter-tag[data-filter-type="deletedFilter"]');
                    if (tag) tag.remove();
                }
            }
            
            // 데이터 다시 로드
            loadConversations(1);
        });
    }
}

// 삭제된 대화를 불러오는 함수
function loadDeletedConversations() {
    console.log('삭제된 대화 불러오기');
    
    // 명시적으로 삭제된 대화 필터 설정
    activeFilters.deletedFilter = true;
    
    // 첫 페이지부터 데이터 로드 (삭제된 대화만 표시)
    currentPage = 1;
    loadConversations(1);
}

// 모달 기능 설정
function setupModal() {
    const modal = document.getElementById('add-conversation-modal');
    const addButton = document.getElementById('add-conversation');
    const closeBtn = document.querySelector('.close');
    const form = document.getElementById('add-conversation-form');

    // 모달 열기
    if (addButton) {
        addButton.addEventListener('click', () => {
            modal.style.display = 'block';
        });
    }

    // 모달 닫기
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // 모달 외부 클릭시 닫기
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// 대화 목록 불러오기 - 일시적으로 비활성화
/*
async function loadConversations(page = 1, customFilters = {}) {
    try {
        showLoadingIndicator();
        currentPage = page;

        // activeFilters 객체에서 필터 값을 가져오기
        // 이를 통해 UI에서 직접 가져오는 대신 이미 저장된 필터 상태를 사용
        const userSearchValue = activeFilters.userName || document.getElementById('user-search').value.trim();
        const categoryValue = activeFilters.category || document.getElementById('category-filter').value;
        const departmentValue = activeFilters.department || document.getElementById('department-filter').value;

        // 필터 객체 생성 (현재 저장된 필터 상태 기준)
        const filterOptions = {
            userName: userSearchValue || undefined,
            category: categoryValue !== 'all' ? categoryValue : undefined,
            department: departmentValue !== 'all' ? departmentValue : undefined,
            is_deleted: activeFilters.deletedFilter ? 'true' : 'false',
            ...customFilters
        };

        console.log('삭제된 대화 필터링 상태:', activeFilters.deletedFilter);
        console.log('is_deleted 파라미터 값:', filterOptions.is_deleted);
        console.log('검색 및 필터 옵션:', filterOptions);  // 디버깅용

        // API 요청 URL 쿼리 파라미터 구성
        const queryParams = new URLSearchParams();
        queryParams.append('page', page);
        queryParams.append('limit', itemsPerPage);

        // 필터 옵션을 쿼리 파라미터에 추가 (값이 있는 경우만)
        if (filterOptions.userName) {
            queryParams.append('userName', filterOptions.userName);
        }
        if (filterOptions.category) {
            queryParams.append('category', filterOptions.category);
        }
        if (filterOptions.department) {
            queryParams.append('department', filterOptions.department);
        }

        // is_deleted 파라미터를 문자열로 안전하게 처리
        const isDeletedValue = String(filterOptions.is_deleted).toLowerCase();
        queryParams.append('is_deleted', isDeletedValue);

        const queryString = queryParams.toString();
        console.log('API 요청 URL:', `/api/conversations?${queryString}`);  // 디버깅용

        // 권한 정보를 헤더에 포함
        const headers = {
            'Content-Type': 'application/json',
            'x-admin-role': localStorage.getItem('adminRole') || '0',
            'x-user-id': localStorage.getItem('userId') || ''
        };

        console.log('대화목록 조회 헤더:', headers);

        // API 호출
        const response = await fetch(`/api/conversations?${queryString}`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API 응답 데이터:', data);  // 디버깅용

        if (data && Array.isArray(data.conversations)) {
            conversations = data.conversations;
            totalItems = data.totalItems;
            totalPages = data.totalPages;
            renderConversationsTable();
            updatePagination();
        } else {
            console.error('잘못된 응답 데이터:', data);
            conversations = [];
            totalItems = 0;
            totalPages = 1;
            currentPage = 1;
            renderConversationsTable();
            updatePagination();
        }
        hideLoadingIndicator();
    } catch (error) {
        console.error('대화 목록 로드 실패:', error);
        conversations = [];
        renderConversationsTable();
        hideLoadingIndicator();
    }
}
*/

// 로딩 표시기 보여주기
function showLoadingIndicator() {
    // 로딩 인디케이터가 있다면 표시
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    } else {
        // 없다면 임시로 테이블에 로딩 메시지 표시
        const tbody = document.querySelector('#conversations-table tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">데이터를 불러오는 중...</td></tr>';
        }
    }
}

// 로딩 표시기 숨기기
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// 대화 목록 렌더링 - 일시적으로 비활성화
/*
function renderConversationsTable() {
    const tbody = document.querySelector('#conversations-table tbody');
    if (!tbody) return;
    
    if (conversations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-results">대화 내역이 없습니다.</td></tr>';
        return;
    }
    
    tbody.innerHTML = conversations.map(conversation => {
        // DB의 카테고리 값을 화면에 표시할 값으로 변환
        const categoryDisplay = getCategoryName(conversation.category);
        
        // lastMessage에서 </think> 이후의 내용만 추출
        let displayMessage = conversation.lastMessage || '대화 내용 없음';
        if (displayMessage !== '대화 내용 없음' && typeof displayMessage === 'string') {
            const thinkIndex = displayMessage.indexOf('</think>');
            if (thinkIndex !== -1) {
                displayMessage = displayMessage.substring(thinkIndex + 8);
            }
        }
        
        // 미리보기에서 코드 블록을 일반 텍스트로 변환
        displayMessage = convertCodeBlocksToText(displayMessage);
        
        // 미리보기 텍스트 길이 제한 (너무 길면 잘라내기)
        if (displayMessage.length > 100) {
            displayMessage = displayMessage.substring(0, 100) + '...';
        }
        
        return `
            <tr data-conversation-id="${conversation.id}" style="cursor: pointer;">
                <td readonly="true" style="user-select: none;">${conversation.id}</td>
                <td readonly="true" style="user-select: none;">${conversation.userName}</td>
                <td readonly="true" style="user-select: none;">${conversation.department}</td>
                <td readonly="true" style="user-select: none;">${categoryDisplay}</td>
                <td readonly="true" style="user-select: none;">${conversation.roomTitle || '-'}</td>
                <td readonly="true" style="user-select: none;" title="${displayMessage}">${displayMessage}</td>
                <td readonly="true" style="user-select: none;">${formatDate(conversation.lastMessageTime)}</td>
            </tr>
        `;
    }).join('');
    
    // 테이블 행 클릭 이벤트 리스너 추가
    const rows = tbody.querySelectorAll('tr[data-conversation-id]');
    rows.forEach(row => {
        row.addEventListener('click', function(e) {
            const conversationId = this.getAttribute('data-conversation-id');
            if (conversationId) {
                showConversationDetail(parseInt(conversationId));
            }
        });
    });
}
*/

// 카테고리 이름 변환 함수
function getCategoryName(category) {
    const categoryMap = {
        'code': '코드',
        'sap': 'SAP',
        'common': '일반',
        'policy': '사내규정',
        'hr': '인사',
        'csr': 'CSR',
        'postMail': '메일'
    };
    return categoryMap[category] || category;
}

// 필터 기능 설정 - 일시적으로 비활성화
/*
function setupFilters() {
    const userSearch = document.getElementById('user-search');
    const searchButton = document.getElementById('search-button');
    const categoryFilter = document.getElementById('category-filter');
    const departmentFilter = document.getElementById('department-filter');
    const applyFilter = document.getElementById('apply-filter');
    const clearFilter = document.getElementById('clear-filter');
    
    if (userSearch) {
        let timeout;
        userSearch.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                activeFilters.userName = userSearch.value.toLowerCase();
                updateActiveFilters();
            }, 300);
        });
        
        // Enter 키 이벤트 추가
        userSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyFilters();
            }
        });
    }
    
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            // 사용자 이름 검색 필드에서 값을 가져와 필터에 설정
            activeFilters.userName = document.getElementById('user-search').value.toLowerCase();
            console.log('검색 버튼 클릭 - 검색어:', activeFilters.userName);
            applyFilters();
        });
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            activeFilters.category = categoryFilter.value === 'all' ? '' : categoryFilter.value;
            updateActiveFilters();
        });
    }
    
    if (departmentFilter) {
        departmentFilter.addEventListener('change', () => {
            activeFilters.department = departmentFilter.value === 'all' ? '' : departmentFilter.value;
            updateActiveFilters();
        });
    }
    
    if (applyFilter) {
        applyFilter.addEventListener('click', () => {
            applyFilters();
        });
    }
    
    if (clearFilter) {
        clearFilter.addEventListener('click', () => {
            if (categoryFilter) categoryFilter.value = 'all';
            if (departmentFilter) departmentFilter.value = 'all';
            if (userSearch) userSearch.value = '';
            
            activeFilters = {
                department: '',
                category: '',
                userName: '',
                deletedFilter: false
            };
            
            // 지난 대화 버튼 비활성화
            const pastConversationsBtn = document.getElementById('past-conversations');
            if (pastConversationsBtn) {
                pastConversationsBtn.classList.remove('active');
            }

            applyFilters();
        });
    }
}
*/

// 사용자 검색 함수
function searchUser() {
    const searchTerm = document.getElementById('user-search').value.toLowerCase();
    activeFilters.userName = searchTerm;
    
    console.log('사용자 검색:', searchTerm);
    
    // 검색 시 항상 1페이지부터 데이터 로드
    loadConversations(1);
    
    // 활성 필터 표시 업데이트
    updateActiveFilters();
}

// 대화 수정 함수
function editConversation(id) {
    alert(`대화 ID ${id} 수정`);
}

// 대화 삭제 함수
function deleteConversation(id) {
    if (confirm('정말 이 대화를 삭제하시겠습니까?')) {
        const row = document.querySelector(`tr[onclick="showConversationDetail(${id})"]`);
        if (row) {
            row.remove();
        }
    }
}

// 대화 상세 보기 - 일시적으로 비활성화
/*
async function showConversationDetail(conversationId) {
    // conversationId 유효성 검사
    if (!conversationId || isNaN(Number(conversationId))) {
        console.error('잘못된 대화 ID:', conversationId);
        return;
    }

    const modal = document.getElementById('detail-modal');
    const closeBtn = modal.querySelector('.detail-modal-close');
    
    // 모달 닫기 버튼 이벤트
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
    
    // 모달 외부 클릭 시 닫기
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
    
    try {
        // 로딩 표시
        const messagesContainer = document.querySelector('.conversation-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '<div class="loading-messages">대화 내역을 불러오는 중...</div>';
        }
        
        // 대화 상세 정보 가져오기 - URL 구성 수정
        const conversationUrl = `/api/conversations/${Number(conversationId)}`;
        console.log('대화 상세 정보 요청 URL:', conversationUrl);
        
        const response = await fetch(conversationUrl, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const conversation = await response.json();
        
        if (!conversation) {
            console.error('대화 데이터를 찾을 수 없습니다:', conversationId);
            return;
        }

        // archiveId 유효성 검사
        if (conversation.archiveId && (typeof conversation.archiveId !== 'string' || !/^[a-zA-Z0-9-_]+$/.test(conversation.archiveId))) {
            console.error('잘못된 archive ID:', conversation.archiveId);
            return;
        }
        
        // 기본 대화 데이터 설정
        document.getElementById('detail-id').textContent = conversation.id;
        document.getElementById('detail-user').textContent = conversation.userName;
        document.getElementById('detail-category').textContent = getCategoryName(conversation.category);
        document.getElementById('detail-title').textContent = conversation.roomTitle || '-';
        document.getElementById('detail-time').textContent = formatDate(conversation.lastMessageTime);
        document.getElementById('detail-department').textContent = conversation.department;
        
        // 모달 제목 설정
        const modalTitle = modal.querySelector('.detail-modal-title');
        if (modalTitle) {
            modalTitle.textContent = `대화 상세 정보 - ${conversation.roomTitle || '제목 없음'}`;
        }
        
        // 모달 표시
        modal.style.display = 'block';
        
        // 대화 내역 가져오기 - URL 구성 수정
        const showDeleted = activeFilters.deletedFilter || conversation.isDeleted;
        const baseMessagesUrl = `/api/conversations/${Number(conversationId)}/messages`;
        const messagesUrl = conversation.archiveId 
            ? `${baseMessagesUrl}/${conversation.archiveId}${showDeleted ? '?show_deleted=true' : ''}`
            : `${baseMessagesUrl}${showDeleted ? '?show_deleted=true' : ''}`;
            
        console.log('대화 내역 요청 URL:', messagesUrl);
        
        const messagesResponse = await fetch(messagesUrl, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'x-admin-role': localStorage.getItem('adminRole') || '0',
                'x-user-id': localStorage.getItem('userId') || ''
            }
        });
        
        if (!messagesResponse.ok) {
            throw new Error(`HTTP error! status: ${messagesResponse.status}`);
        }
        
        const messagesData = await messagesResponse.json();
        console.log('받은 메시지 데이터:', messagesData);
        
        if (messagesData && Array.isArray(messagesData.messages)) {
            // 대화 내역 렌더링
            renderConversationMessages(messagesData.messages);
        } else {
            if (messagesContainer) {
                messagesContainer.innerHTML = '<div class="no-messages">대화 내역이 없습니다.</div>';
            }
        }
    } catch (error) {
        console.error('대화 상세 정보 로드 실패:', error);
        const messagesContainer = document.querySelector('.conversation-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `<div class="error-messages">대화 내역을 불러오는 중 오류가 발생했습니다: ${error.message}</div>`;
        }
    }
}
*/

// 마크다운 렌더링 설정
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(lang, code).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
});

// 이미지 렌더러 커스터마이징 - 이미지 무시
const renderer = new marked.Renderer();
renderer.image = function(href, title, text) {
    // 이미지를 무시하고 대신 텍스트만 표시
    return `<span class="ignored-image">[이미지: ${text}]</span>`;
};
marked.setOptions({ renderer: renderer });

// 마크다운 렌더링 함수
function renderMarkdown(content) {
    if (!content) return '';
    try {
        console.log('마크다운 변환 전:', content);
        
        // Mermaid 다이어그램 처리
        let processedContent = content;
        
        // ```mermaid 코드 블록 찾기
        const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
        processedContent = processedContent.replace(mermaidRegex, (match, diagram) => {
            try {
                // 다이어그램 텍스트를 안전하게 처리
                const cleanDiagram = diagram.trim();
                
                // 다이어그램이 비어있거나 너무 길면 텍스트로 표시
                if (!cleanDiagram || cleanDiagram.length > 2000) {
                    return `<pre><code class="language-text" readonly="true" style="pointer-events: none; user-select: none;">${cleanDiagram}</code></pre>`;
                }
                
                // 위험한 문자 제거
                const safeDiagram = cleanDiagram
                    .replace(/[<>]/g, '') // < > 문자 제거
                    .replace(/javascript:/gi, '') // XSS 방지
                    .replace(/on\w+\s*=/gi, ''); // 이벤트 핸들러 제거
                
                // Mermaid 다이어그램을 div로 래핑하여 표시 (readonly)
                return `<div class="mermaid-diagram" style="pointer-events: none; user-select: none;">
                    <pre><code class="language-mermaid" readonly="true" style="pointer-events: none; user-select: none;">${safeDiagram}</code></pre>
                    <p><small>※ Mermaid 다이어그램은 현재 텍스트로만 표시됩니다.</small></p>
                </div>`;
            } catch (error) {
                console.error('Mermaid 다이어그램 처리 오류:', error);
                return `<pre><code class="language-text" readonly="true" style="pointer-events: none; user-select: none;">${diagram}</code></pre>`;
            }
        });
        
        const rendered = marked.parse(processedContent);
        console.log('마크다운 변환 후:', rendered);
        
        // 렌더링된 HTML을 DOM으로 파싱하여 readonly 속성 적용
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rendered;
        
        // 모든 링크를 비활성화 (클릭 방지)
        tempDiv.querySelectorAll('a').forEach(link => {
            link.style.pointerEvents = 'none';
            link.style.textDecoration = 'none';
            link.style.color = 'inherit';
            link.removeAttribute('href');
            link.setAttribute('readonly', 'true');
        });
        
        // 모든 이미지를 비활성화 (클릭 방지)
        tempDiv.querySelectorAll('img').forEach(img => {
            img.style.pointerEvents = 'none';
            img.style.userSelect = 'none';
            img.setAttribute('readonly', 'true');
        });
        
        // 모든 코드 블록을 readonly로 설정
        tempDiv.querySelectorAll('pre, code').forEach(codeElement => {
            codeElement.style.pointerEvents = 'none';
            codeElement.style.userSelect = 'none';
            codeElement.setAttribute('readonly', 'true');
        });
        
        // 모든 폼 요소를 비활성화
        tempDiv.querySelectorAll('input, textarea, select, button').forEach(formElement => {
            formElement.disabled = true;
            formElement.style.pointerEvents = 'none';
            formElement.setAttribute('readonly', 'true');
        });
        
        // 모든 테이블을 비활성화
        tempDiv.querySelectorAll('table').forEach(table => {
            table.style.pointerEvents = 'none';
            table.style.userSelect = 'none';
        });
        
        // 기타 상호작용 요소들 비활성화
        tempDiv.querySelectorAll('details, summary').forEach(element => {
            element.style.pointerEvents = 'none';
            element.removeAttribute('open');
        });
        
        return tempDiv.innerHTML;
    } catch (err) {
        console.error('마크다운 렌더링 오류:', err);
        return content;
    }
}

// 대화 내용 렌더링 함수
function renderConversationMessages(messages) {
    console.log('메시지 렌더링 시작:', messages);
    const messagesContainer = document.querySelector('.conversation-messages');
    if (!messagesContainer) {
        console.error('메시지 컨테이너를 찾을 수 없습니다.');
        return;
    }

    messagesContainer.innerHTML = '';
    
    if (!messages || messages.length === 0) {
        messagesContainer.innerHTML = '<div class="no-messages">대화 내용이 없습니다.</div>';
        return;
    }

    messages.forEach((message, index) => {
        console.log(`메시지 ${index} 처리 중:`, message);
        const messageDiv = document.createElement('div');
        const role = message.role === 0 || message.role === 'user' ? 'user' : 'ai';
        messageDiv.className = `message ${role}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // 메시지 내용 처리
        let messageContent = message.content || message.message || '';
        
        // AI 답변이면 </think> 이후만 추출
        if (role === 'ai' && typeof messageContent === 'string') {
            const idx = messageContent.indexOf('</think>');
            if (idx !== -1) {
                messageContent = messageContent.substring(idx + 8);
            }
        }
        
        console.log(`메시지 ${index} 내용:`, messageContent);
        
        try {
            // 마크다운 렌더링 적용
            const renderedContent = renderMarkdown(messageContent);
            contentDiv.innerHTML = renderedContent;
            
            // 코드 블록에 하이라이팅 적용
            contentDiv.querySelectorAll('pre code').forEach((block) => {
                console.log('코드 블록 하이라이팅:', block);
                hljs.highlightElement(block);
                // 하이라이팅 후 readonly 속성 재적용
                block.style.pointerEvents = 'none';
                block.style.userSelect = 'none';
                block.setAttribute('readonly', 'true');
                block.setAttribute('contenteditable', 'false');
            });
            
            // 모든 상호작용 요소들을 추가로 비활성화
            contentDiv.querySelectorAll('*').forEach(element => {
                // 클릭 이벤트 제거
                element.onclick = null;
                element.onmousedown = null;
                element.onmouseup = null;
                element.ondblclick = null;
                
                // 드래그 방지
                element.draggable = false;
                element.ondragstart = (e) => e.preventDefault();
                
                // 텍스트 선택 방지 (일부 요소는 허용)
                if (!['P', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(element.tagName)) {
                    element.style.userSelect = 'none';
                }
                
                // contenteditable 속성 제거
                element.removeAttribute('contenteditable');
            });
            
        } catch (err) {
            console.error(`메시지 ${index} 렌더링 오류:`, err);
            contentDiv.textContent = messageContent;
        }

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = formatDate(message.timestamp || message.chatTime);
        
        // 삭제된 메시지 표시
        if (message.isDeleted) {
            messageDiv.classList.add('deleted-message');
            const deletedBadge = document.createElement('div');
            deletedBadge.className = 'message-deleted-badge';
            deletedBadge.textContent = '삭제됨';
            contentDiv.appendChild(deletedBadge);
        }
        
        contentDiv.appendChild(timeDiv);
        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);
    });

    // 스크롤을 최하단으로 이동
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // 메시지 컨테이너 전체에 이벤트 위임으로 상호작용 방지
    messagesContainer.addEventListener('click', function(e) {
        // 링크, 버튼, 폼 요소 등의 클릭을 방지
        if (e.target.tagName === 'A' || 
            e.target.tagName === 'BUTTON' || 
            e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA' || 
            e.target.tagName === 'SELECT' ||
            e.target.closest('pre') ||
            e.target.closest('code') ||
            e.target.hasAttribute('readonly')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);
    
    // 우클릭 컨텍스트 메뉴도 방지
    messagesContainer.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'PRE' || 
            e.target.tagName === 'CODE' ||
            e.target.closest('pre') ||
            e.target.closest('code') ||
            e.target.hasAttribute('readonly')) {
            e.preventDefault();
            return false;
        }
    });
    
    // 드래그 앤 드롭 방지
    messagesContainer.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });
}

// 대화 상세 보기 닫기
function closeConversationDetail() {
    const modal = document.getElementById('detail-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 대화 내보내기
function exportConversation(conversationId) {
    // TODO: 대화 내보내기 기능 구현
    alert('대화 내보내기 기능은 아직 구현되지 않았습니다.');
}

// 페이지네이션 업데이트
function updatePagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    // 기존 내용 제거
    paginationContainer.innerHTML = '';
    
    // 데이터가 없거나 1페이지 이하면 페이지네이션 숨김
    if (totalPages <= 1 || totalItems === 0) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // 이전 페이지 버튼
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = '이전';
    if (currentPage === 1) {
        prevBtn.disabled = true;
    } else {
        prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    }
    paginationContainer.appendChild(prevBtn);
    
    // 페이지 버튼 생성
    if (totalPages <= 10) {
        // 페이지가 10개 이하면 모든 페이지 버튼 표시
        for (let i = 1; i <= totalPages; i++) {
            addPageButton(paginationContainer, i);
        }
    } else {
        // 페이지가 10개 초과일 때는 현재 페이지 주변과 처음/끝 페이지만 표시
        
        // 처음 2개 페이지 항상 표시
        for (let i = 1; i <= 2; i++) {
            addPageButton(paginationContainer, i);
        }
        
        // 현재 페이지가 5보다 크면 중간에 "..." 표시
        if (currentPage > 5) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            // 클릭 이벤트 방지
            ellipsis.style.pointerEvents = 'none';
            paginationContainer.appendChild(ellipsis);
        }
        
        // 현재 페이지 주변 (최대 5개)
        const startPage = Math.max(3, currentPage - 2);
        const endPage = Math.min(totalPages - 2, currentPage + 2);
        
        // startPage가 endPage보다 작거나 같을 때만 페이지 버튼 생성
        if (startPage <= endPage) {
            for (let i = startPage; i <= endPage; i++) {
                addPageButton(paginationContainer, i);
            }
        }
        
        // 현재 페이지가 totalPages-4보다 작을 때만 "..." 표시하고 마지막 페이지 버튼 생성
        if (currentPage < totalPages - 4) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            // 클릭 이벤트 방지
            ellipsis.style.pointerEvents = 'none';
            paginationContainer.appendChild(ellipsis);
            
            // 마지막 2개 페이지 표시
            for (let i = Math.max(totalPages - 1, endPage + 1); i <= totalPages; i++) {
                addPageButton(paginationContainer, i);
            }
        } 
        // 현재 페이지가 이미 마지막 페이지 근처에 있는 경우
        else if (endPage < totalPages) {
            // endPage 이후 totalPages까지의 나머지 페이지 버튼들 생성
            for (let i = endPage + 1; i <= totalPages; i++) {
                addPageButton(paginationContainer, i);
            }
        }
    }
    
    // 다음 페이지 버튼
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = '다음';
    if (currentPage === totalPages) {
        nextBtn.disabled = true;
    } else {
        nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
    }
    paginationContainer.appendChild(nextBtn);
    
    // 페이지 정보 표시 추가
    const infoSpan = document.createElement('span');
    infoSpan.className = 'pagination-info';
    infoSpan.textContent = `${totalItems}개 항목 중 ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)}개 표시 (${currentPage}/${totalPages} 페이지)`;
    paginationContainer.appendChild(infoSpan);
}

// 페이지 버튼 생성 헬퍼 함수
function addPageButton(container, pageNum) {
    const button = document.createElement('button');
    button.className = `pagination-btn ${pageNum === currentPage ? 'active' : ''}`;
    button.textContent = pageNum;
    if (pageNum !== currentPage) {
        button.addEventListener('click', () => goToPage(pageNum));
    }
    container.appendChild(button);
}

// 대화 정보 가져오기
function getConversationById(id) {
    // 1. 테이블에서 데이터 찾기
    const tbody = document.querySelector('#conversations-table tbody');
    
    if (!tbody) {
        console.error('대화 테이블을 찾을 수 없습니다.');
        return null;
    }
    
    // ID로 일치하는 행 찾기
    const rows = tbody.querySelectorAll('tr');
    let targetRow = null;
    
    for (let row of rows) {
        if (row.cells && row.cells.length > 0 && row.cells[0].textContent == id) {
            targetRow = row;
            break;
        }
    }
    
    if (!targetRow) {
        console.error(`ID가 ${id}인 대화를 찾을 수 없습니다.`);
        return null;
    }
    
    // 행에서 데이터 추출
    const cells = targetRow.cells;
    if (cells.length < 7) {
        console.error('테이블 행의 열 수가 부족합니다.');
        return null;
    }
    
    // 테이블 데이터를 객체로 변환
    return {
        id: cells[0].textContent.trim(),
        userName: cells[1].textContent.trim(),
        department: cells[2].textContent.trim(),
        category: cells[3].textContent.trim(),
        roomTitle: cells[4].textContent.trim(),
        lastMessage: cells[5].textContent.trim(),
        lastMessageTime: cells[6].textContent.trim()
    };
}

// API가 준비되지 않은 환경을 위한 임시 데이터 및 응답 처리
async function getConversations(page = 1, limit = 10, filters = {}) {
    // 실제 API 연동이 없는 경우를 위한 임시 응답
    try {
        const { userName, category, department, is_deleted } = filters;
        
        // 필터 적용된 대화 목록
        let filteredConversations = [...testConversations];
        
        // 삭제 상태 필터링
        if (is_deleted === 'true') {
            filteredConversations = filteredConversations.filter(conv => 
                conv.is_deleted === true
            );
        } else {
            filteredConversations = filteredConversations.filter(conv => 
                !conv.is_deleted
            );
        }
        
        // 다른 필터링 적용
        if (userName) {
            filteredConversations = filteredConversations.filter(conv => 
                conv.userName.toLowerCase().includes(userName.toLowerCase())
            );
        }
        
        if (category) {
            filteredConversations = filteredConversations.filter(conv => 
                conv.category === category
            );
        }
        
        if (department) {
            filteredConversations = filteredConversations.filter(conv => 
                conv.department === department
            );
        }
        
        // 페이지네이션 계산
        const totalItems = filteredConversations.length;
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedConversations = filteredConversations.slice(startIndex, endIndex);
        
        return {
            conversations: paginatedConversations,
            totalItems,
            totalPages,
            currentPage: page
        };
    } catch (error) {
        console.error('대화 목록 조회 실패:', error);
        throw error;
    }
}

// 날짜 형식 변환 함수
function formatDate(dateString) {
    if (!dateString) return '';
    
    let date;
    if (dateString instanceof Date) {
        date = dateString;
    } else {
        // 문자열인 경우 Date 객체로 변환 시도
        date = new Date(dateString);
    }
    
    // 유효하지 않은 날짜는 그대로 반환
    if (isNaN(date.getTime())) return dateString;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 필터 관련 함수

// 필터 옵션 업데이트 함수
function updateFilterOptions() {
    const tbody = document.querySelector('#conversations-table tbody');
    if (!tbody) return;
    
    const rows = tbody.getElementsByTagName('tr');
    
    // 각 필터의 고유 값 수집
    const departments = new Set();
    const categories = new Set();
    
    for (let row of rows) {
        if (row.cells.length >= 4) {
            departments.add(row.cells[2].textContent);
            categories.add(row.cells[3].textContent);
        }
    }
    
    // 부서 필터 옵션 업데이트
    const departmentFilter = document.getElementById('department-filter');
    if (departmentFilter) {
        // 기존 옵션 유지를 위해 '전체' 옵션만 선택하고 나머지는 그대로 둡니다
        const currentValue = departmentFilter.value;
        
        // 새로운 부서만 추가
        departments.forEach(dept => {
            // 이미 존재하는 옵션인지 확인
            let exists = false;
            for (let i = 0; i < departmentFilter.options.length; i++) {
                if (departmentFilter.options[i].value === dept) {
                    exists = true;
                    break;
                }
            }
            
            // 존재하지 않는 경우에만 추가
            if (!exists) {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = dept;
                departmentFilter.appendChild(option);
            }
        });
        
        // 이전 선택값 복원
        departmentFilter.value = currentValue;
    }
    
    // 카테고리 필터 옵션 업데이트
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        // 기존 옵션 유지를 위해 '전체' 옵션만 선택하고 나머지는 그대로 둡니다
        const currentValue = categoryFilter.value;
        
        // 새로운 카테고리만 추가
        categories.forEach(category => {
            // 이미 존재하는 옵션인지 확인
            let exists = false;
            for (let i = 0; i < categoryFilter.options.length; i++) {
                if (categoryFilter.options[i].value === category) {
                    exists = true;
                    break;
                }
            }
            
            // 존재하지 않는 경우에만 추가
            if (!exists) {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            }
        });
        
        // 이전 선택값 복원
        categoryFilter.value = currentValue;
    }
}

// 필터 적용 함수
function applyFilters() {
    const tbody = document.querySelector('#conversations-table tbody');
    if (!tbody) return;
    
    // 현재 필터 값 가져오기
    activeFilters.department = document.getElementById('department-filter').value;
    activeFilters.category = document.getElementById('category-filter').value;
    activeFilters.userName = document.getElementById('user-search').value.toLowerCase();
    
    // 필터가 '전체'일 경우 빈 문자열로 변환
    if (activeFilters.department === 'all') {
        activeFilters.department = '';
    }
    if (activeFilters.category === 'all') {
        activeFilters.category = '';
    }
    
    // 삭제된 대화 필터가 활성화되어 있지 않다면, 일반 대화만 표시
    if (!activeFilters.deletedFilter) {
        // 삭제된 대화 버튼 비활성화
        const pastConversationsBtn = document.getElementById('past-conversations');
        if (pastConversationsBtn) {
            pastConversationsBtn.classList.remove('active');
        }
    }
    
    // 사용자 필터 정보를 콘솔에 출력 (디버깅용)
    console.log('필터 적용:', {
        사용자: activeFilters.userName || '전체',
        부서: activeFilters.department || '전체',
        카테고리: activeFilters.category || '전체',
        삭제됨: activeFilters.deletedFilter
    });
    
    // 필터 적용 시 항상 1페이지부터 데이터를 로드
    loadConversations(1);
    
    // 활성 필터 표시 업데이트
    updateActiveFilters();
}

// 활성 필터 표시 업데이트
function updateActiveFilters() {
    const activeFiltersContainer = document.getElementById('active-filters');
    if (!activeFiltersContainer) return;
    
    activeFiltersContainer.innerHTML = '';
    
    // 각 필터에 대해 태그 생성
    if (activeFilters.department) {
        // 부서 필터의 경우 원래 value 값이 아닌 표시될 텍스트를 가져옴
        const departmentSelect = document.getElementById('department-filter');
        let displayText = activeFilters.department;
        
        // select 요소에서 선택된 옵션의 표시 텍스트를 가져옴
        if (departmentSelect) {
            const selectedOption = Array.from(departmentSelect.options).find(option => option.value === activeFilters.department);
            if (selectedOption) {
                displayText = selectedOption.textContent;
            }
        }
        
        addFilterTag('부서', displayText, 'department');
    }
    
    if (activeFilters.category) {
        // 카테고리 필터의 경우 원래 value 값이 아닌 표시될 텍스트를 가져옴
        const categorySelect = document.getElementById('category-filter');
        let displayText = getCategoryName(activeFilters.category);
        
        // 카테고리 표시 이름 가져오기
        if (categorySelect) {
            const selectedOption = Array.from(categorySelect.options).find(option => option.value === activeFilters.category);
            if (selectedOption) {
                displayText = selectedOption.textContent;
            }
        }
        
        addFilterTag('카테고리', displayText, 'category');
    }
    
    if (activeFilters.userName) {
        addFilterTag('사용자', activeFilters.userName, 'userName');
    }
    
    if (activeFilters.deletedFilter) {
        addFilterTag('상태', '삭제됨', 'deletedFilter');
    }
}

// 필터 태그 추가
function addFilterTag(label, value, filterType) {
    const activeFiltersContainer = document.getElementById('active-filters');
    if (!activeFiltersContainer) return;
    
    // 이미 같은 타입의 필터 태그가 있으면 제거
    const existingTag = activeFiltersContainer.querySelector(`.filter-tag[data-filter-type="${filterType}"]`);
    if (existingTag) {
        existingTag.remove();
    }
    
    const filterTag = document.createElement('div');
    filterTag.className = 'filter-tag';
    filterTag.setAttribute('data-filter-type', filterType);
    filterTag.innerHTML = `
        <span>${label}: ${value}</span>
        <button onclick="removeFilter('${filterType}')">&times;</button>
    `;
    activeFiltersContainer.appendChild(filterTag);
}

// 필터 제거
function removeFilter(filterType) {
    console.log(`필터 제거 시작: ${filterType}`);
    
    // UI 요소 업데이트
    if (filterType === 'department') {
        document.getElementById('department-filter').value = 'all';
        activeFilters.department = '';
    } else if (filterType === 'category') {
        document.getElementById('category-filter').value = 'all';
        activeFilters.category = '';
    } else if (filterType === 'userName') {
        document.getElementById('user-search').value = '';
        activeFilters.userName = '';
    } else if (filterType === 'deletedFilter') {
        // 삭제된 대화 버튼 비활성화 및 필터 제거
        const pastConversationsBtn = document.getElementById('past-conversations');
        if (pastConversationsBtn) {
            pastConversationsBtn.classList.remove('active');
        }
        // is_deleted=false로 설정
        activeFilters.deletedFilter = false;
    }
    
    console.log(`필터 제거 후 상태: ${filterType}`, activeFilters);
    
    // 필터 태그 제거
    const activeFiltersContainer = document.getElementById('active-filters');
    if (activeFiltersContainer) {
        const filterTag = activeFiltersContainer.querySelector(`[data-filter-type="${filterType}"]`);
        if (filterTag) {
            filterTag.remove();
        }
    }
    
    // 필터를 삭제하고 배열에서도 제거 (deletedFilter는 false로 유지)
    if (filterType !== 'deletedFilter') {
        delete activeFilters[filterType];
    }
    
    // 데이터 다시 로드
    loadConversations(1);
}

// 페이지 링크 클릭 처리 함수
function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) {
        return;
    }
    
    currentPage = page;
    // 명시적으로 현재 필터 상태를 포함하여 페이지 전환
    const customFilters = {
        userName: activeFilters.userName || undefined,
        category: activeFilters.category || undefined,
        department: activeFilters.department || undefined,
        is_deleted: activeFilters.deletedFilter ? 'true' : 'false'
    };
    
    // 필터 상태 디버깅
    console.log('페이지 이동 시 필터 상태:', customFilters);
    
    // 기존 필터 상태를 명시적으로 전달하며 페이지만 변경
    loadConversations(page, customFilters);
}

// 코드 블록을 일반 텍스트로 변환하는 함수
function convertCodeBlocksToText(text) {
    if (!text || typeof text !== 'string') return text;
    
    // HTML 태그 제거
    text = text.replace(/<[^>]*>/g, '');
    
    // 백틱 3개로 된 코드 블록을 [코드] 텍스트로 변환
    text = text.replace(/```[\s\S]*?```/g, '[코드]');
    
    // 백틱 1개로 된 인라인 코드를 [코드] 텍스트로 변환
    text = text.replace(/`([^`]+)`/g, '[코드: $1]');
    
    // 마크다운 링크를 일반 텍스트로 변환
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // 마크다운 이미지를 일반 텍스트로 변환
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[이미지: $1]');
    
    // 마크다운 헤더를 일반 텍스트로 변환
    text = text.replace(/^#{1,6}\s+(.+)$/gm, '$1');
    
    // 마크다운 강조(**)를 제거
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    
    // 마크다운 기울임(*)을 제거
    text = text.replace(/\*([^*]+)\*/g, '$1');
    
    // 마크다운 목록을 일반 텍스트로 변환
    text = text.replace(/^[\s]*[-*+]\s+(.+)$/gm, '• $1');
    
    // 마크다운 번호 목록을 일반 텍스트로 변환
    text = text.replace(/^[\s]*\d+\.\s+(.+)$/gm, '• $1');
    
    // 여러 줄바꿈을 하나로 변환
    text = text.replace(/\n\s*\n/g, ' ');
    
    // 연속된 공백을 하나로 변환
    text = text.replace(/\s+/g, ' ');
    
    // 앞뒤 공백 제거
    text = text.trim();
    
    return text;
}

