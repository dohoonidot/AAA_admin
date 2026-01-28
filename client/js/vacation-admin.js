// 휴가 부여 관리 페이지 JavaScript - Toss 스타일

// 요청 상세 정보 캐시 (상세 모달용)
const requestDetailCache = new Map();

document.addEventListener('DOMContentLoaded', function() {
    try {
        // 페이지별 초기화 분기
        const currentPage = window.location.pathname;

        if (currentPage.includes('vacation-requests.html')) {
            // 부여요청목록 페이지 초기화
            console.log('부여요청목록 페이지 초기화 시작');
            initializePage();
            initializeFilters();
            initializeModals();
            checkAuthentication();
            loadSampleData(); // 요청 목록만 로드
            console.log('부여요청목록 페이지 초기화 완료');
        } else if (currentPage.includes('vacation-admin.html') || currentPage.includes('vacation-history.html')) {
            // 휴가 부여 관리 페이지 초기화
            console.log('휴가 부여 관리 페이지 초기화 시작');
            initializePage();
            initializeTabs();
            initializeFilters();
            initializeModals();
            checkAuthentication();
            loadSampleData();
            console.log('휴가 부여 관리 페이지 초기화 완료');
        } else {
            // 기본 초기화 (모든 기능 포함)
            console.log('휴가 관리 페이지 초기화 시작');
            initializePage();
            initializeTabs();
            initializeFilters();
            initializeModals();
            checkAuthentication();
            loadSampleData();
            console.log('휴가 관리 페이지 초기화 완료');
        }
    } catch (error) {
        console.error('페이지 초기화 중 오류 발생:', error);
        // showToast 함수가 없을 수 있으므로 안전하게 처리
        if (typeof showToast === 'function') {
            showToast('페이지 로딩 중 오류가 발생했습니다.', 'error');
        } else {
            alert('페이지 로딩 중 오류가 발생했습니다.');
        }
    }
});

// 페이지 초기화
function initializePage() {
    // 페이지 로딩 애니메이션
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.3s ease';
        document.body.style.opacity = '1';
    }, 100);
}

// 탭 전환 기능
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // 부드러운 전환을 위한 애니메이션
            tabContents.forEach(content => {
                if (content.classList.contains('active')) {
                    content.style.opacity = '0';
                    setTimeout(() => {
                        content.classList.remove('active');
                    }, 150);
                }
            });

            // 탭 버튼 상태 업데이트
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // 새 탭 콘텐츠 표시
            setTimeout(() => {
                const newTab = document.getElementById(targetTab + '-tab');
                newTab.classList.add('active');
                newTab.style.opacity = '0';
                setTimeout(() => {
                    newTab.style.transition = 'opacity 0.3s ease';
                    newTab.style.opacity = '1';
                }, 50);
                
                // 부여 내역 탭 클릭 시 데이터 로드
                if (targetTab === 'history') {
                    loadGrantHistory(1);
                }
            }, 150);
        });
    });
}

// 필터 기능 초기화
function initializeFilters() {
    const departmentFilter = document.getElementById('department-filter');
    const typeFilter = document.getElementById('type-filter');
    const refreshBtn = document.getElementById('refresh-btn');

    // 필터 이벤트 리스너
    [departmentFilter, typeFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', () => {
                loadVacationRequests();
            });
        }
    });

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            // 새로고침 버튼 애니메이션
            const icon = refreshBtn.querySelector('svg');
            icon.classList.add('loading');

            setTimeout(() => {
                icon.classList.remove('loading');
                loadVacationRequests();
                showToast('데이터가 새로고침되었습니다.', 'success');
            }, 1000);
        });
    }
}

// 요청 필터링
function filterRequests() {
    const statusFilter = document.getElementById('status-filter').value;
    const departmentFilter = document.getElementById('department-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    const cards = document.querySelectorAll('.request-card');

    cards.forEach(card => {
        const cardStatus = card.getAttribute('data-status');
        const cardDepartment = card.getAttribute('data-department');
        const cardType = card.getAttribute('data-type');

        let showCard = true;

        if (statusFilter !== 'all' && cardStatus !== statusFilter) {
            showCard = false;
        }

        if (departmentFilter !== 'all' && cardDepartment !== departmentFilter) {
            showCard = false;
        }

        if (typeFilter !== 'all' && cardType !== typeFilter) {
            showCard = false;
        }

        // 부드러운 애니메이션으로 카드 표시/숨김
        if (showCard) {
            card.style.display = 'block';
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 50);
        } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                card.style.display = 'none';
            }, 200);
        }
    });

    // 필터 결과 카운트
    const visibleCards = Array.from(cards).filter(card =>
        window.getComputedStyle(card).display !== 'none'
    ).length;

    if (visibleCards === 0) {
        showEmptyState();
    } else {
        hideEmptyState();
    }
}

// 빈 상태 표시
function showEmptyState() {
    const container = document.querySelector('.requests-container');
    let emptyState = container.querySelector('.empty-state');

    if (!emptyState) {
        emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <h3>검색 결과가 없습니다</h3>
            <p>필터 조건을 변경해보세요</p>
        `;
        container.appendChild(emptyState);
    }

    emptyState.style.display = 'block';
}

// 빈 상태 숨김
function hideEmptyState() {
    const emptyState = document.querySelector('.empty-state');
    if (emptyState) {
        emptyState.style.display = 'none';
    }
}

// 모달 기능 초기화
function initializeModals() {
    // 모달 외부 클릭시 닫기
    window.addEventListener('click', (event) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                closeModal();
                closeAttachmentModal();
            }
        });
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal();
            closeAttachmentModal();
        }
    });
}

// 휴가 부여 승인
function approveRequest(requestId) {
    const card = document.querySelector(`[data-id="${requestId}"]`);
    const userName = card.querySelector('.user-details h3').textContent;
    const userDepartment = card.querySelector('.user-details .department').textContent;

    showConfirmModal(
        '휴가 부여',
        `${userName}(${userDepartment})님의 휴가 부여 요청을 승인하시겠습니까?`,
        userName,
        userDepartment,
        () => processRequest(requestId, 'approved'),
        'approve'
    );
}

// 휴가 부여 반려
function rejectRequest(requestId) {
    const card = document.querySelector(`[data-id="${requestId}"]`);
    const userName = card.querySelector('.user-details h3').textContent;
    const userDepartment = card.querySelector('.user-details .department').textContent;

    showConfirmModal(
        '휴가 부여 반려',
        `${userName}(${userDepartment})님의 휴가 부여 요청을 반려하시겠습니까?`,
        userName,
        userDepartment,
        () => {
            const reason = document.getElementById('reason-input').value.trim();
            if (!reason) {
                showToast('반려 사유를 입력해주세요.', 'error');
                return;
            }
            processRequest(requestId, 'rejected', reason);
        },
        'reject'
    );
}

// 확인 모달 표시
function showConfirmModal(title, message, userName, userDepartment, confirmCallback, type) {
    const modal = document.getElementById('action-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalUserName = document.getElementById('modal-user-name');
    const modalUserDepartment = document.getElementById('modal-user-department');
    const confirmBtn = document.getElementById('confirm-btn');
    const reasonSection = document.getElementById('reason-section');

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalUserName.textContent = userName;
    modalUserDepartment.textContent = userDepartment;

    // 반려인 경우 사유 입력 필드 표시
    if (type === 'reject') {
        reasonSection.style.display = 'block';
        document.getElementById('reason-input').value = '';
    } else {
        reasonSection.style.display = 'none';
    }

    confirmBtn.onclick = () => {
        confirmCallback();
        closeModal();
    };

    modal.style.display = 'block';

    // 모달 애니메이션
    setTimeout(() => {
        modal.querySelector('.modal-content').style.transform = 'translateY(0) scale(1)';
    }, 50);
}

// 요청 처리 (승인/반려)
function processRequest(requestId, action, reason = '') {
    // 로딩 상태 표시
    showToast('처리 중입니다...', 'info');

    // 실제 구현에서는 API 호출
    setTimeout(() => {
        const card = document.querySelector(`[data-id="${requestId}"]`);
        if (!card) return;

        // 카드 상태 업데이트
        updateCardStatus(card, action);

        // 성공 메시지
        const actionText = action === 'approved' ? '부여가 완료' : '반려';
        showToast(`휴가 ${actionText}되었습니다.`, 'success');

        console.log(`요청 ID: ${requestId}, 처리: ${action}, 사유: ${reason}`);
    }, 1500);
}

// 카드 상태 업데이트
function updateCardStatus(card, action) {
    const statusBadge = card.querySelector('.status-badge');
    const cardActions = card.querySelector('.card-actions');

    // 상태 배지 업데이트
    statusBadge.classList.remove('pending', 'approved', 'rejected');
    statusBadge.classList.add(action);
    statusBadge.textContent = action === 'approved' ? '부여 완료' : '반려';

    // 카드 액션 버튼을 처리 완료 메시지로 교체
    const cardFooter = document.createElement('div');
    cardFooter.className = 'card-footer';
    cardFooter.innerHTML = `
        <span class="processed-info">관리자가 ${action === 'approved' ? '휴가를 부여했습니다' : '요청을 반려했습니다'}</span>
    `;

    cardActions.style.opacity = '0';
    setTimeout(() => {
        cardActions.parentNode.replaceChild(cardFooter, cardActions);
        cardFooter.style.opacity = '0';
        setTimeout(() => {
            cardFooter.style.transition = 'opacity 0.3s ease';
            cardFooter.style.opacity = '1';
        }, 50);
    }, 200);

    // 카드 데이터 속성 업데이트
    card.setAttribute('data-status', action);
}

// 첨부파일 보기
function viewAttachment(fileName) {
    const modal = document.getElementById('attachment-modal');
    const title = document.getElementById('attachment-title');
    const content = document.getElementById('attachment-content');

    title.textContent = fileName;

    // 파일 유형에 따른 미리보기
    if (fileName.toLowerCase().includes('.pdf')) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: #f8f9fa; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">📄</div>
                <h4 style="margin: 0 0 8px 0; color: #191f28;">PDF 문서</h4>
                <p style="margin: 0; color: #8b95a1; font-size: 14px;">${fileName}</p>
                <p style="margin-top: 20px; color: #8b95a1; font-size: 14px;">다운로드를 하려면 카드의 다운로드 버튼을 사용하세요.</p>
            </div>
        `;
    } else if (fileName.toLowerCase().includes('.jpg') || fileName.toLowerCase().includes('.png')) {
        content.innerHTML = `
            <div style="text-align: center;">
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjhmOWZhIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNmM3NTdkIiBmb250LXNpemU9IjE0Ij7rrLjrpqzrs7TquLDsp4DrsJw8L3RleHQ+Cjx0ZXh0IHg9IjE1MCIgeT0iMTIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOGI5NWExIiBmb250LXNpemU9IjEyIj4ke2ZpbGVOYW1lfTwvdGV4dD4KPC9zdmc+" alt="${fileName}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e9ecef;"/>
                <p style="margin-top: 16px; color: #8b95a1; font-size: 14px;">${fileName}</p>
            </div>
        `;
    }

    modal.style.display = 'block';
}

// 첨부파일 미리보기
async function previewAttachment(fileName, prefix) {
    try {
        console.log('첨부파일 미리보기 시도:', { fileName, prefix });
        
        // 파일 URL API 호출 (미리보기 모드)
        const response = await fetch('/api/getFileUrl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_name: fileName,
                prefix: prefix || '',
                approval_type: 'hr_leave_grant',
                is_download: 0  // 미리보기 모드
            })
        });

        console.log('API 응답 상태:', response.status);
        console.log('API 응답 헤더:', response.headers);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API 오류 응답:', errorText);
            throw new Error(`파일 URL 조회 실패: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('API 응답 결과:', result);
        
        if (result.error) {
            throw new Error(result.error);
        }

        if (!result.url) {
            throw new Error('파일 URL을 받을 수 없습니다.');
        }

        // 모달에서 파일 미리보기 표시
        showPreviewModal(fileName, result.url);
        
        console.log('첨부파일 미리보기 완료:', fileName);

    } catch (error) {
        console.error('첨부파일 미리보기 오류:', error);
        showToast(`파일 미리보기에 실패했습니다: ${error.message}`, 'error');
    }
}

// 미리보기 모달 표시
function showPreviewModal(fileName, fileUrl) {
    const modal = document.getElementById('attachment-modal');
    const modalContent = modal.querySelector('.modal-content');
    const title = document.getElementById('attachment-title');
    const content = document.getElementById('attachment-content');

    title.textContent = fileName;

    // 파일 확장자에 따라 표시 방식 결정
    const ext = fileName.split('.').pop().toLowerCase();
    
    if (ext === 'pdf') {
        // PDF는 iframe으로 표시
        content.innerHTML = `
            <div style="width: 100%; height: 80vh; border: none;">
                <iframe src="${fileUrl}" style="width: 100%; height: 100%; border: none;" frameborder="0"></iframe>
            </div>
        `;
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
        // 이미지는 img 태그로 표시
        content.innerHTML = `
            <div style="text-align: center; width: 100%; height: 80vh; overflow: auto;">
                <img src="${fileUrl}" style="max-width: 100%; height: auto;" alt="${fileName}" />
            </div>
        `;
    } else {
        // 기타 파일은 iframe으로 시도
        content.innerHTML = `
            <div style="width: 100%; height: 80vh; border: none;">
                <iframe src="${fileUrl}" style="width: 100%; height: 100%; border: none;" frameborder="0"></iframe>
            </div>
        `;
    }

    // 모달 표시 및 중앙 정렬
    modal.style.display = 'block';
    modalContent.style.position = 'relative';
    modalContent.style.top = '50%';
    modalContent.style.transform = 'translateY(-50%)';
}


// 모달 닫기
function closeModal() {
    const modal = document.getElementById('action-modal');
    if (modal.style.display === 'block') {
        modal.querySelector('.modal-content').style.transform = 'translateY(-30px) scale(0.95)';
        setTimeout(() => {
            modal.style.display = 'none';
            document.getElementById('reason-input').value = '';
        }, 200);
    }
}

// 첨부파일 모달 닫기
function closeAttachmentModal() {
    const modal = document.getElementById('attachment-modal');
    const modalContent = modal.querySelector('.modal-content');
    
    if (modal.style.display === 'block') {
        // 닫기 애니메이션
        if (modalContent) {
            modalContent.style.animation = 'slideOutModal 0.2s ease';
        }
        
        setTimeout(() => {
            modal.style.display = 'none';
            if (modalContent) {
                modalContent.style.animation = '';
                modalContent.style.top = '';
                modalContent.style.transform = '';
            }
        }, 200);
    }
}

// 토스트 알림 표시
function showToast(message, type = 'info') {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // 자동 제거
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 샘플 데이터 로드
function loadSampleData() {
    // 요청 목록 컨테이너가 있을 때만 로드
    const requestsContainer = document.querySelector('#requests-tab .requests-container');
    if (requestsContainer) {
        loadVacationRequests();
        updateStatistics();
    }
}

// 휴가 요청 목록 로드
async function loadVacationRequests() {
    try {
        console.log('휴가 부여 요청 목록 로드 시작');
        
        // 현재 로그인한 사용자 ID 가져오기
        const userId = localStorage.getItem('userId') || localStorage.getItem('username');
        if (!userId) {
            console.error('사용자 ID가 없습니다.');
            showToast('로그인 정보가 없습니다.', 'error');
            return;
        }

        // 필터 값 가져오기
        const departmentFilter = document.getElementById('department-filter');
        const typeFilter = document.getElementById('type-filter');
        
        const department = departmentFilter ? departmentFilter.value : '';
        const leaveType = typeFilter ? typeFilter.value : '';

        // API 요청 데이터 준비
        const requestData = {
            user_id: userId
        };

        // 필터 값이 있으면 추가
        if (department) {
            requestData.department = department;
        }
        if (leaveType) {
            requestData.leave_type = leaveType;
        }

        console.log('API 요청 데이터:', requestData);

        // 로딩 상태 표시
        showLoadingState();

        // API 호출 (서버 프록시 경유하여 CORS 회피)
        const response = await fetch('/api/leave/grant/getRequestList', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API 응답 데이터:', data);

        // 데이터 렌더링
        renderVacationRequests(data.leave_grants || []);
        
        // 통계 업데이트
        updateStatistics(data.leave_grants || []);
        
        // 휴가 유형 필터 옵션 업데이트 (첫 로드 시)
        if (data.leave_grants && data.leave_grants.length > 0) {
            updateLeaveTypeFilterOptions(data.leave_grants);
        }

        console.log('휴가 부여 요청 목록 로드 완료');

    } catch (error) {
        console.error('휴가 요청 목록 로드 오류:', error);
        showToast('휴가 요청 목록을 불러오는데 실패했습니다.', 'error');
        
        // 에러 상태 표시
        showErrorState();
    }
}

// 휴가 유형 필터 옵션 업데이트
function updateLeaveTypeFilterOptions(grants) {
    const typeFilter = document.getElementById('type-filter');
    if (!typeFilter) return;

    // 기존 옵션 유지 (전체 옵션)
    const allOption = typeFilter.querySelector('option[value=""]');
    
    // 고유한 휴가 유형 추출
    const leaveTypes = [...new Set(grants.map(grant => grant.leave_type).filter(type => type))];
    
    // 기존 옵션 제거 (전체 제외)
    Array.from(typeFilter.options).forEach(option => {
        if (option.value !== '') {
            option.remove();
        }
    });
    
    // 새로운 옵션 추가
    leaveTypes.sort().forEach(leaveType => {
        const option = document.createElement('option');
        option.value = leaveType;
        option.textContent = leaveType;
        typeFilter.appendChild(option);
    });
}

// 휴가 요청 데이터 렌더링
function renderVacationRequests(requests) {
    const requestsContainer = document.querySelector('#requests-tab .requests-container');
    if (!requestsContainer) {
        console.error('요청 목록 컨테이너를 찾을 수 없습니다.');
        return;
    }

    // 기존 내용 초기화
    requestsContainer.innerHTML = '';
    requestDetailCache.clear();

    if (requests.length === 0) {
        requestsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>데이터가 존재하지 않습니다</h3>
                <p>현재 처리할 휴가 부여 요청이 없습니다.</p>
            </div>
        `;
        return;
    }

    // 요청 목록 렌더링
    requests.forEach((request, index) => {
        if (request && request.id !== undefined && request.id !== null) {
            requestDetailCache.set(String(request.id), request);
        }
        const requestCard = createRequestCard(request, index);
        requestsContainer.appendChild(requestCard);
    });

    // 애니메이션 적용
    animateCards();
}

// 요청 카드 생성 (개선된 직관적 디자인)
function createRequestCard(request, index) {
    const card = document.createElement('div');
    card.className = 'request-card';
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';

    // 상태별 스타일 클래스
    const statusClass = getStatusClass(request.status);
    const statusText = getStatusText(request.status);

    // 첨부파일 유무 표시
    const attachments = normalizeAttachments(request.attachments_list);
    const hasAttachments = attachments.length > 0;

    const attachmentsHtml = hasAttachments ? `
        <div class="attachments-section compact">
            <h4>첨부파일 (${attachments.length}개)</h4>
            <div class="attachments-list">
                ${attachments.map(file => `
                    <div class="attachment-item compact" onclick="previewAttachment(${JSON.stringify(file.file_name)}, ${JSON.stringify(file.prefix)})">
                        <div class="attachment-meta">
                            <span class="attachment-name">${file.file_name}</span>
                            ${file.file_size ? `<span class="attachment-size">${formatFileSize(file.file_size)}</span>` : ''}
                        </div>
                        <div class="attachment-actions">
                            <button class="attachment-btn preview" onclick="event.stopPropagation(); previewAttachment(${JSON.stringify(file.file_name)}, ${JSON.stringify(file.prefix)})">미리보기</button>
                            <button class="attachment-btn download" onclick="event.stopPropagation(); downloadAttachment(null, ${JSON.stringify(file.file_name)}, ${JSON.stringify(file.prefix)})">다운로드</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    card.innerHTML = `
        <!-- 간소화된 헤더 -->
        <div class="card-header">
            <div class="user-primary-info">
                <div class="user-avatar">${(request.name || '이름 없음').charAt(0)}</div>
                <div class="user-info">
                    <h3 class="user-name">${request.name || '이름 없음'}</h3>
                    <div class="user-meta">
                        <span class="department">${request.department}</span>
                        <span class="position">${request.job_position || ''}</span>
                    </div>
                </div>
            </div>
            <div class="status-badge ${statusClass}">${statusText}</div>
        </div>

        <!-- 핵심 정보만 표시 -->
        <div class="card-content">
            <div class="request-summary">
                <div class="summary-item">
                    <span class="summary-label">휴가 유형</span>
                    <span class="summary-value">${request.leave_type}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">부여 일수</span>
                    <span class="summary-value highlight">${request.grant_days}일</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">요청일</span>
                    <span class="summary-value">${formatDate(request.approval_date)}</span>
                </div>
            </div>

            ${request.reason ? `
            <div class="reason-preview">
                <span class="reason-text">${request.reason.length > 30 ? request.reason.substring(0, 30) + '...' : request.reason}</span>
            </div>` : ''}

            ${attachmentsHtml}
        </div>

        <!-- 간소화된 액션 버튼 -->
        <div class="card-actions">
            <button class="action-btn view-details" onclick="viewRequestDetails(${request.id})" title="상세보기">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
                상세
            </button>
            ${getActionButtons(request.status, request.id)}
        </div>
    `;

    return card;
}

// 상태별 CSS 클래스 반환
function getStatusClass(status) {
    switch (status) {
        case 'REQUESTED': return 'status-requested';
        case 'APPROVED': return 'status-approved';
        case 'REJECTED': return 'status-rejected';
        case 'PENDING': return 'status-pending';
        default: return 'status-unknown';
    }
}

// 상태별 텍스트 반환
function getStatusText(status) {
    switch (status) {
        case 'REQUESTED': return '요청됨';
        case 'APPROVED': return '승인됨';
        case 'REJECTED': return '거부됨';
        case 'PENDING': return '대기중';
        default: return '알 수 없음';
    }
}

// 상태별 액션 버튼 반환 (간소화된 디자인)
function getActionButtons(status, requestId) {
    switch (status) {
        case 'REQUESTED':
        case 'PENDING':
            // 요청됨/대기중 상태: 승인/거부 버튼 표시
            return `
                <button class="action-btn approve" onclick="approveRequest(${requestId})">
                    ✅ 승인
                </button>
                <button class="action-btn reject" onclick="rejectRequest(${requestId})">
                    ❌ 거부
                </button>
            `;
        case 'APPROVED':
            // 승인됨 상태: 처리 완료 표시
            return `
                <span class="action-status completed">✅ 처리 완료</span>
            `;
        case 'REJECTED':
            // 거부됨 상태: 처리 완료 표시
            return `
                <span class="action-status completed">❌ 처리 완료</span>
            `;
        default:
            // 알 수 없는 상태: 기본적으로 승인/거부 버튼 표시
            return `
                <button class="action-btn approve" onclick="approveRequest(${requestId})">
                    ✅ 승인
                </button>
                <button class="action-btn reject" onclick="rejectRequest(${requestId})">
                    ❌ 거부
                </button>
            `;
    }
}

// 날짜 포맷팅 (시/분/초 포함) - UTC 시간 그대로 표시
function formatDate(dateString) {
    if (!dateString) return '날짜 없음';

    try {
        const date = new Date(dateString);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        return '날짜 형식 오류';
    }
}

// 파일 크기 포맷팅
function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// 카드 애니메이션
function animateCards() {
    const cards = document.querySelectorAll('.request-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// 로딩 상태 표시
function showLoadingState() {
    const requestsContainer = document.querySelector('#requests-tab .requests-container');
    if (requestsContainer) {
        requestsContainer.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>휴가 요청 목록을 불러오는 중...</p>
            </div>
        `;
    }
}

// 에러 상태 표시
function showErrorState() {
    const requestsContainer = document.querySelector('#requests-tab .requests-container');
    if (requestsContainer) {
        requestsContainer.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>데이터를 불러올 수 없습니다</h3>
                <p>휴가 요청 목록을 불러오는데 실패했습니다.</p>
                <button class="btn-primary" onclick="loadVacationRequests()">
                    다시 시도
                </button>
            </div>
        `;
    }
}

// 통계 업데이트
function updateStatistics(requests = []) {
    // 실제 데이터 기반 통계 계산
    const totalRequests = requests.length;
    const requestedCount = requests.filter(req => req.status === 'REQUESTED').length;
    const approvedCount = requests.filter(req => req.status === 'APPROVED').length;
    const rejectedCount = requests.filter(req => req.status === 'REJECTED').length;
    const pendingCount = requests.filter(req => req.status === 'PENDING').length;

    // 통계 카드 업데이트
    updateStatCard('total-requests', totalRequests);
    updateStatCard('requested-count', requestedCount + pendingCount); // 대기중에는 REQUESTED와 PENDING 모두 포함
    updateStatCard('approved-count', approvedCount);
    updateStatCard('rejected-count', rejectedCount);

    console.log('통계 업데이트 완료:', {
        totalRequests,
        requestedCount,
        approvedCount,
        rejectedCount,
        pendingCount
    });
}

// 통계 카드 업데이트 함수
function updateStatCard(cardId, value) {
    const element = document.getElementById(cardId);
    if (element) {
        element.textContent = value;
    }
}



// 요청 상세보기
function viewRequestDetails(requestId) {
    console.log('요청 상세보기:', requestId);

    const request = requestDetailCache.get(String(requestId));
    const modal = document.getElementById('request-detail-modal');
    if (!request || !modal) {
        showToast('상세 정보를 불러올 수 없습니다.', 'error');
        return;
    }

    const name = request.name || '이름 없음';
    const department = request.department || '-';
    const position = request.job_position || '';
    const userMeta = position ? `${department} · ${position}` : department;

    const avatarEl = document.getElementById('detail-user-avatar');
    const nameEl = document.getElementById('detail-user-name');
    const metaEl = document.getElementById('detail-user-meta');
    const leaveTypeEl = document.getElementById('detail-leave-type');
    const grantDaysEl = document.getElementById('detail-grant-days');
    const requestedDateEl = document.getElementById('detail-requested-date');
    const statusEl = document.getElementById('detail-status');
    const reasonEl = document.getElementById('detail-reason');
    const attachmentsEl = document.getElementById('detail-attachments');

    if (avatarEl) avatarEl.textContent = name.charAt(0);
    if (nameEl) nameEl.textContent = name;
    if (metaEl) metaEl.textContent = userMeta;
    if (leaveTypeEl) leaveTypeEl.textContent = request.leave_type || '-';
    if (grantDaysEl) grantDaysEl.textContent = request.grant_days !== undefined ? `${request.grant_days}일` : '-';
    if (requestedDateEl) {
        const dateSource = request.requested_date || request.approval_date || request.created_at;
        requestedDateEl.textContent = dateSource ? formatDate(dateSource) : '-';
    }
    if (statusEl) statusEl.textContent = getStatusText(request.status);
    if (reasonEl) reasonEl.textContent = request.reason || '사유 없음';

    if (attachmentsEl) {
        renderDetailAttachments(attachmentsEl, normalizeAttachments(request.attachments_list));
    }

    modal.style.display = 'block';
}

function closeRequestDetailModal() {
    const modal = document.getElementById('request-detail-modal');
    if (!modal) return;
    modal.style.display = 'none';
}

function normalizeAttachments(attachmentsList) {
    if (!Array.isArray(attachmentsList)) return [];
    return attachmentsList
        .map(item => {
            if (typeof item === 'string') {
                return { file_name: item, prefix: '', file_size: null };
            }
            if (item && typeof item === 'object') {
                let sizeValue = item.file_size ?? item.size ?? null;
                if (typeof sizeValue === 'string') {
                    const parsed = parseFloat(sizeValue);
                    sizeValue = Number.isNaN(parsed) ? null : parsed;
                }
                return {
                    file_name: item.file_name || item.filename || item.name || item.file || '',
                    prefix: item.prefix || item.path || item.folder || '',
                    file_size: sizeValue
                };
            }
            return null;
        })
        .filter(item => item && item.file_name);
}

function renderDetailAttachments(container, attachments) {
    container.innerHTML = '';

    const section = document.createElement('div');
    section.className = 'attachments-section';

    const title = document.createElement('h4');
    title.textContent = attachments.length > 0 ? `첨부파일 (${attachments.length}개)` : '첨부파일';
    section.appendChild(title);

    if (attachments.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'no-attachments';
        empty.textContent = '첨부파일이 없습니다.';
        section.appendChild(empty);
        container.appendChild(section);
        return;
    }

    const list = document.createElement('div');
    list.className = 'attachments-list';

    attachments.forEach(file => {
        const item = document.createElement('div');
        item.className = 'attachment-item';

        const meta = document.createElement('div');
        meta.className = 'attachment-meta';

        const nameEl = document.createElement('span');
        nameEl.className = 'attachment-name';
        nameEl.textContent = file.file_name;
        meta.appendChild(nameEl);

        if (file.file_size) {
            const sizeEl = document.createElement('span');
            sizeEl.className = 'attachment-size';
            sizeEl.textContent = formatFileSize(file.file_size);
            meta.appendChild(sizeEl);
        }

        const actions = document.createElement('div');
        actions.className = 'attachment-actions';

        const previewBtn = document.createElement('button');
        previewBtn.type = 'button';
        previewBtn.className = 'attachment-btn preview';
        previewBtn.textContent = '미리보기';
        previewBtn.addEventListener('click', event => {
            event.stopPropagation();
            previewAttachment(file.file_name, file.prefix);
        });

        const downloadBtn = document.createElement('button');
        downloadBtn.type = 'button';
        downloadBtn.className = 'attachment-btn download';
        downloadBtn.textContent = '다운로드';
        downloadBtn.addEventListener('click', event => {
            event.stopPropagation();
            downloadAttachment(null, file.file_name, file.prefix);
        });

        actions.appendChild(previewBtn);
        actions.appendChild(downloadBtn);

        item.appendChild(meta);
        item.appendChild(actions);
        item.addEventListener('click', () => previewAttachment(file.file_name, file.prefix));

        list.appendChild(item);
    });

    section.appendChild(list);
    container.appendChild(section);
}

// 첨부파일 다운로드
async function downloadAttachment(url, fileName, prefix) {
    try {
        console.log('첨부파일 다운로드 시도:', { url, fileName, prefix });
        
        // 파일 URL API 호출 (다운로드 모드)
        const response = await fetch('/api/getFileUrl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file_name: fileName,
                prefix: prefix || '',
                approval_type: 'hr_leave_grant',
                is_download: 1  // 다운로드 모드
            })
        });

        if (!response.ok) {
            throw new Error(`파일 URL 조회 실패: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }

        if (!result.url) {
            throw new Error('파일 URL을 받을 수 없습니다.');
        }

        // 다운로드 시작 알림
        showToast(`파일 다운로드를 시작합니다: ${fileName}`, 'info');

        // 다운로드 링크 생성 (S3 서명된 URL 직접 사용)
        const link = document.createElement('a');
        link.href = result.url;
        link.download = fileName;
        link.target = '_blank';
        link.style.display = 'none';

        // 임시로 DOM에 추가하고 클릭
        document.body.appendChild(link);
        link.click();
        
        // 클릭 후 잠시 대기 후 제거
        setTimeout(() => {
            document.body.removeChild(link);
        }, 100);

        console.log('첨부파일 다운로드 완료:', fileName);

    } catch (error) {
        console.error('첨부파일 다운로드 오류:', error);
        showToast(`파일 다운로드에 실패했습니다: ${error.message}`, 'error');
    }
}

// 요청 승인
async function approveRequest(requestId) {
    try {
        console.log('요청 승인:', requestId);
        
        // 확인 대화상자
        if (!confirm('이 휴가 부여 요청을 승인하시겠습니까?')) {
            return;
        }

        const approverId = localStorage.getItem('userId') || localStorage.getItem('username');
        const body = {
            id: parseInt(requestId),
            approver_id: approverId,
            is_approved: 'APPROVED',
            comment: '',
            next_approver: null  // next approver가 없는 경우 null로 설정
        };

        const response = await fetch('/api/leave/grant/approval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`승인 API 오류: ${response.status} ${errText}`);
        }

        showToast('휴가 부여 요청이 승인되었습니다.', 'success');
        
        // 목록 새로고침
        setTimeout(() => {
            loadVacationRequests();
        }, 1000);

    } catch (error) {
        console.error('요청 승인 오류:', error);
        showToast('요청 승인에 실패했습니다.', 'error');
    }
}

// 요청 거부
async function rejectRequest(requestId) {
    try {
        console.log('요청 거부:', requestId);
        
        // 확인 대화상자
        if (!confirm('이 휴가 부여 요청을 거부하시겠습니까?')) {
            return;
        }

        const approverId = localStorage.getItem('userId') || localStorage.getItem('username');
        const comment = prompt('거부 사유를 입력하세요 (선택)') || '';
        const body = {
            id: parseInt(requestId),
            approver_id: approverId,
            is_approved: 'REJECTED',
            comment,
            next_approver: null  // next approver가 없는 경우 null로 설정
        };

        const response = await fetch('/api/leave/grant/approval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`거부 API 오류: ${response.status} ${errText}`);
        }

        showToast('휴가 부여 요청이 거부되었습니다.', 'success');
        
        // 목록 새로고침
        setTimeout(() => {
            loadVacationRequests();
        }, 1000);

    } catch (error) {
        console.error('요청 거부 오류:', error);
        showToast('요청 거부에 실패했습니다.', 'error');
    }
}

// 사용자 인증 확인
function checkAuthentication() {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('adminRole') || localStorage.getItem('role');

    if (!username || !role) {
        console.log('인증 정보 없음:', { username, role });
        showToast('로그인이 필요합니다.', 'error');
        setTimeout(() => {
            const currentPath = window.location.pathname;
            if (currentPath.includes('/pages/')) {
                window.location.href = 'login.html';
            } else {
                window.location.href = 'pages/login.html';
            }
        }, 1000);
        return;
    }

    // 휴가 총괄 관리 권한 확인 (권한 0, 1만 허용, test_hne@aspnc.com 계정 예외 허용)
    const numericRole = parseInt(role);
    const isTestUser = username === 'test_hne@aspnc.com';

    if (numericRole !== 0 && numericRole !== 1 && !isTestUser) {
        showToast('휴가 총괄 관리 권한이 없습니다. (최고관리자, 관리자_1만 접근 가능)', 'error');
        setTimeout(() => {
            const currentPath = window.location.pathname;
            if (currentPath.includes('/pages/')) {
                window.location.href = '../index.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 2000);
        return;
    }

    console.log('권한 확인 완료:', { username, role: numericRole });

    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) {
        usernameDisplay.textContent = username;
    }
}

// 로그아웃 처리
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('role');
            showToast('로그아웃되었습니다.', 'success');
            setTimeout(() => {
                window.location.href = '../pages/login.html';
            }, 1000);
        });
    }
});

// 유틸리티 함수들
function calculateDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
}

// 휴가 요청 생성
async function createVacationRequest(requestData) {
    try {
        console.log('휴가 요청 생성:', requestData);
        
        const userId = localStorage.getItem('userId') || localStorage.getItem('username');
        if (!userId) {
            throw new Error('사용자 ID가 없습니다.');
        }

        const body = {
            user_id: userId,
            leave_type: requestData.leave_type,
            start_date: requestData.start_date,
            end_date: requestData.end_date,
            reason: requestData.reason || '',
            approver_id: requestData.approver_id || ''
        };

        console.log('휴가 요청 생성 API 호출:', body);

        const response = await fetch('/api/leave/grant/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`휴가 요청 생성 API 오류: ${response.status} ${errText}`);
        }

        const result = await response.json();
        console.log('휴가 요청 생성 성공:', result);
        
        showToast('휴가 요청이 성공적으로 생성되었습니다.', 'success');
        
        // 목록 새로고침
        setTimeout(() => {
            loadVacationRequests();
        }, 1000);

        return result;

    } catch (error) {
        console.error('휴가 요청 생성 오류:', error);
        showToast('휴가 요청 생성에 실패했습니다.', 'error');
        throw error;
    }
}

// 부여 내역 조회 (페이지네이션)
let currentHistoryPage = 1;
let totalHistoryPages = 1;
let allHistoryGrants = []; // 모달용 데이터 저장

async function loadGrantHistory(page = 1) {
    try {
        console.log('부여 내역 조회 시작, 페이지:', page);
        
        const userId = localStorage.getItem('userId') || localStorage.getItem('username');
        if (!userId) {
            console.error('사용자 ID가 없습니다.');
            showToast('로그인 정보가 없습니다.', 'error');
            return;
        }

        // 로딩 상태 표시
        const tbody = document.getElementById('history-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">데이터를 불러오는 중...</td></tr>';
        }

        // API 호출 (서버 페이징)
        const response = await fetch(`/api/leave/grant/management?page=${page}&page_size=10`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('부여 내역 API 응답:', data);

        // 현재 페이지 데이터만 표시
        const currentPageGrants = data.leave_grants || [];
        allHistoryGrants = currentPageGrants; // 모달용 데이터 저장
        renderGrantHistory(currentPageGrants);
        
        // 페이지네이션 정보 업데이트
        totalHistoryPages = data.total_pages || 1;
        currentHistoryPage = page;
        updateHistoryPagination();

        console.log('부여 내역 조회 완료');

    } catch (error) {
        console.error('부여 내역 조회 오류:', error);
        showToast('부여 내역을 불러오는데 실패했습니다.', 'error');
        
        const tbody = document.getElementById('history-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #e74c3c;">데이터를 불러오는데 실패했습니다.</td></tr>';
        }
    }
}

// 부여 내역 테이블 렌더링
function renderGrantHistory(grants) {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) {
        console.error('부여 내역 테이블 body를 찾을 수 없습니다.');
        return;
    }

    if (grants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">부여 내역이 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = grants.map(grant => {
        const statusClass = getHistoryStatusClass(grant.status);
        const statusText = getHistoryStatusText(grant.status);
        const resetDate = formatDateOnly(grant.leave_reset_date);
        const approvalDate = formatDateTime(grant.approval_date);
        const procDate = formatDateTime(grant.proc_date) || approvalDate;

        // grant_days가 소수점인 경우 처리 (예: 0.5일)
        const grantDays = grant.grant_days || 0;
        let daysDisplay = '';
        if (grantDays % 1 === 0) {
            daysDisplay = `${grantDays}일`;
        } else {
            // 반차 정보 확인
            const halfDaySlot = grant.half_day_slot || '';
            if (halfDaySlot) {
                daysDisplay = `${grantDays}일 (${halfDaySlot === 'AM' ? '오전' : halfDaySlot === 'PM' ? '오후' : halfDaySlot})`;
            } else {
                daysDisplay = `${grantDays}일`;
            }
        }

        // 신청자 이름 + 직위 표시
        const applicantDisplay = grant.job_position
            ? `${grant.name || '-'} ${grant.job_position}`
            : (grant.name || '-');

        // 관리자 임의부여 표시 (is_manager가 true일 때만)
        const isManagerGrant = grant.is_manager === true || grant.is_manager === 1;
        const managerBadge = isManagerGrant
            ? '<span style="display: inline-block; background-color: #8b5cf6; color: white; margin-left: 8px; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; white-space: nowrap; vertical-align: middle; line-height: 1.4;">관리자 임의부여</span>'
            : '';

        return `
            <tr style="cursor: pointer;" onclick="showHistoryDetailModal(${grant.id})" onmouseover="this.style.backgroundColor='#f9fafb'" onmouseout="this.style.backgroundColor='transparent'">
                <td>${applicantDisplay}</td>
                <td>${grant.department || '-'}</td>
                <td>
                    ${grant.leave_type || '-'}
                    ${managerBadge}
                </td>
                <td>${resetDate || '-'}</td>
                <td>${daysDisplay}</td>
                <td>${approvalDate}</td>
                <td>${procDate}</td>
                <td><span class="status-badge small ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
    
    // 클릭 이벤트는 이미 onclick으로 추가됨
}

// 부여 내역 상태별 CSS 클래스
function getHistoryStatusClass(status) {
    if (!status) return 'status-unknown';
    const upperStatus = status.toUpperCase();
    switch (upperStatus) {
        case 'APPROVED':
        case '승인':
        case '부여완료':
            return 'status-approved';
        case 'REJECTED':
        case '거부':
        case '반려':
            return 'status-rejected';
        case 'PENDING':
        case '대기':
        case '대기중':
            return 'status-pending';
        case 'REQUESTED':
        case '요청':
            return 'status-requested';
        default:
            return 'status-unknown';
    }
}

// 부여 내역 상태별 텍스트
function getHistoryStatusText(status) {
    if (!status) return '알 수 없음';
    const upperStatus = status.toUpperCase();
    switch (upperStatus) {
        case 'APPROVED':
        case '승인':
        case '부여완료':
            return '부여 완료';
        case 'REJECTED':
        case '거부':
        case '반려':
            return '반려';
        case 'PENDING':
        case '대기':
        case '대기중':
            return '대기중';
        case 'REQUESTED':
        case '요청':
            return '요청됨';
        default:
            return status;
    }
}

// 날짜 포맷팅 (날짜만) - UTC 시간 그대로 표시
function formatDateOnly(dateString) {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString; // 날짜 파싱 실패 시 원본 반환
        }
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    } catch (error) {
        return dateString;
    }
}

// 날짜 포맷팅 (시간:분:초 포함) - UTC 시간 그대로 표시
function formatDateTime(dateString) {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString; // 날짜 파싱 실패 시 원본 반환
        }
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        return dateString;
    }
}

// 페이지네이션 업데이트
function updateHistoryPagination() {
    const paginationContainer = document.getElementById('history-pagination');
    const pageInfo = document.getElementById('page-info');
    const pageNumbersContainer = document.getElementById('history-page-numbers');
    const firstBtn = document.getElementById('first-page-btn');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const lastBtn = document.getElementById('last-page-btn');

    if (!paginationContainer || !pageInfo) return;

    if (totalHistoryPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';
    pageInfo.textContent = `${currentHistoryPage} / ${totalHistoryPages}`;

    // 페이지 번호 버튼 생성
    if (pageNumbersContainer) {
        pageNumbersContainer.innerHTML = '';
        
        const maxPageButtons = 7; // 최대 표시할 페이지 버튼 수
        let startPage = Math.max(1, currentHistoryPage - Math.floor(maxPageButtons / 2));
        let endPage = Math.min(totalHistoryPages, startPage + maxPageButtons - 1);
        
        // endPage가 totalHistoryPages에 가까우면 startPage 조정
        if (endPage - startPage < maxPageButtons - 1) {
            startPage = Math.max(1, endPage - maxPageButtons + 1);
        }
        
        // 페이지 이동 함수
        const goToPage = (pageNum) => {
            loadGrantHistory(pageNum);
        };

        // 처음 페이지가 1이 아니면 1번과 "..." 표시
        if (startPage > 1) {
            const firstPageBtn = document.createElement('button');
            firstPageBtn.className = 'pagination-page-btn';
            firstPageBtn.textContent = '1';
            firstPageBtn.onclick = () => goToPage(1);
            pageNumbersContainer.appendChild(firstPageBtn);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                ellipsis.style.pointerEvents = 'none';
                ellipsis.style.padding = '0 4px';
                ellipsis.style.color = '#6c757d';
                pageNumbersContainer.appendChild(ellipsis);
            }
        }
        
        // 페이지 번호 버튼들 생성
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-page-btn ${i === currentHistoryPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => goToPage(i);
            pageNumbersContainer.appendChild(pageBtn);
        }
        
        // 마지막 페이지가 endPage가 아니면 "..."과 마지막 페이지 표시
        if (endPage < totalHistoryPages) {
            if (endPage < totalHistoryPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                ellipsis.style.pointerEvents = 'none';
                ellipsis.style.padding = '0 4px';
                ellipsis.style.color = '#6c757d';
                pageNumbersContainer.appendChild(ellipsis);
            }
            
            const lastPageBtn = document.createElement('button');
            lastPageBtn.className = 'pagination-page-btn';
            lastPageBtn.textContent = totalHistoryPages;
            lastPageBtn.onclick = () => goToPage(totalHistoryPages);
            pageNumbersContainer.appendChild(lastPageBtn);
        }
    }

    // 처음/이전/다음/마지막 버튼 활성화/비활성화
    if (firstBtn) {
        firstBtn.disabled = currentHistoryPage <= 1;
        firstBtn.style.opacity = currentHistoryPage <= 1 ? '0.5' : '1';
        firstBtn.style.cursor = currentHistoryPage <= 1 ? 'not-allowed' : 'pointer';
    }

    if (prevBtn) {
        prevBtn.disabled = currentHistoryPage <= 1;
        prevBtn.style.opacity = currentHistoryPage <= 1 ? '0.5' : '1';
        prevBtn.style.cursor = currentHistoryPage <= 1 ? 'not-allowed' : 'pointer';
    }

    if (nextBtn) {
        nextBtn.disabled = currentHistoryPage >= totalHistoryPages;
        nextBtn.style.opacity = currentHistoryPage >= totalHistoryPages ? '0.5' : '1';
        nextBtn.style.cursor = currentHistoryPage >= totalHistoryPages ? 'not-allowed' : 'pointer';
    }

    if (lastBtn) {
        lastBtn.disabled = currentHistoryPage >= totalHistoryPages;
        lastBtn.style.opacity = currentHistoryPage >= totalHistoryPages ? '0.5' : '1';
        lastBtn.style.cursor = currentHistoryPage >= totalHistoryPages ? 'not-allowed' : 'pointer';
    }
}

// 페이지 변경
function changeHistoryPage(direction) {
    const newPage = currentHistoryPage + direction;
    if (newPage < 1 || newPage > totalHistoryPages) {
        return;
    }
    loadGrantHistory(newPage);
}

// 처음 페이지로 이동
function goToFirstHistoryPage() {
    if (currentHistoryPage > 1) {
        loadGrantHistory(1);
    }
}

// 마지막 페이지로 이동
function goToLastHistoryPage() {
    if (currentHistoryPage < totalHistoryPages) {
        loadGrantHistory(totalHistoryPages);
    }
}

// 부여내역 상세 모달 표시
async function showHistoryDetailModal(grantId) {
    try {
        // grantId로 전체 데이터에서 해당 grant 찾기
        const grant = allHistoryGrants.find(g => g.id === grantId);
        if (!grant) {
            alert('부여 내역을 찾을 수 없습니다.');
            return;
        }

        // 모달에 기본 정보 표시
        const applicantDisplay = grant.job_position 
            ? `${grant.name || '-'} ${grant.job_position}`
            : (grant.name || '-');
        
        document.getElementById('modal-applicant').textContent = applicantDisplay;
        document.getElementById('modal-department').textContent = grant.department || '-';
        
        // 휴가 유형 + 관리자 임의부여 배지
        const isManagerGrant = grant.is_manager === true || grant.is_manager === 1;
        const managerBadge = isManagerGrant 
            ? '<span style="display: inline-block; background-color: #8b5cf6; color: white; margin-left: 8px; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; white-space: nowrap; vertical-align: middle; line-height: 1.4;">관리자 임의부여</span>'
            : '';
        document.getElementById('modal-leave-type').innerHTML = `${grant.leave_type || '-'}${managerBadge}`;
        
        const resetDate = formatDateOnly(grant.leave_reset_date);
        document.getElementById('modal-reset-date').textContent = resetDate || '-';
        
        // 부여 일수 표시
        const grantDays = grant.grant_days || 0;
        let daysDisplay = '';
        if (grantDays % 1 === 0) {
            daysDisplay = `${grantDays}일`;
        } else {
            const halfDaySlot = grant.half_day_slot || '';
            if (halfDaySlot) {
                daysDisplay = `${grantDays}일 (${halfDaySlot === 'AM' ? '오전' : halfDaySlot === 'PM' ? '오후' : halfDaySlot})`;
            } else {
                daysDisplay = `${grantDays}일`;
            }
        }
        document.getElementById('modal-grant-days').textContent = daysDisplay;

        const approvalDate = formatDateTime(grant.approval_date);
        document.getElementById('modal-approval-date').textContent = approvalDate;

        const procDate = formatDateTime(grant.proc_date);
        document.getElementById('modal-proc-date').textContent = procDate || approvalDate;
        
        const statusClass = getHistoryStatusClass(grant.status);
        const statusText = getHistoryStatusText(grant.status);
        document.getElementById('modal-status').innerHTML = `<span class="status-badge small ${statusClass}">${statusText}</span>`;
        
        // 메모는 로딩 중으로 표시
        document.getElementById('modal-memo').textContent = '로딩 중...';
        
        // 모달 표시
        const modal = document.getElementById('history-detail-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
        
        // 메모 API 호출
        await loadGrantMemo(grantId);
        
    } catch (error) {
        console.error('부여내역 상세 모달 표시 오류:', error);
        alert('부여 내역을 불러오는데 실패했습니다.');
    }
}

// 부여내역 메모 조회
async function loadGrantMemo(grantId) {
    try {
        const response = await fetch('/api/leave/grant/management/memo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: grantId })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const memo = data.memo || '';
        
        const memoElement = document.getElementById('modal-memo');
        if (memo) {
            memoElement.textContent = memo;
        } else {
            memoElement.textContent = '메모가 없습니다.';
            memoElement.style.color = '#9ca3af';
            memoElement.style.fontStyle = 'italic';
        }
        
    } catch (error) {
        console.error('메모 조회 오류:', error);
        const memoElement = document.getElementById('modal-memo');
        memoElement.textContent = '메모를 불러오는데 실패했습니다.';
        memoElement.style.color = '#ef4444';
    }
}

// 부여내역 상세 모달 닫기
function closeHistoryDetailModal() {
    const modal = document.getElementById('history-detail-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 개발 모드에서 콘솔 로그
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('휴가 부여 관리 페이지가 로드되었습니다.');
    console.log('현재 모드: 개발 모드');
}
