// 선물보내기 페이지 JavaScript

// 전역 변수들
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let itemsPerPage = 12;
let selectedProduct = null;
let selectedRecipients = new Set();
let organizationData = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎁 gifts.js 페이지 로드 시작');
    console.log('📍 현재 URL:', window.location.href);
    console.log('📁 현재 경로:', window.location.pathname);
    
    // 로그인 상태 확인
    let isLoggedIn = false;
    
    if (typeof AuthManager !== 'undefined') {
        console.log('✅ AuthManager 로드됨');
        isLoggedIn = AuthManager.isLoggedIn();
    } else {
        console.log('⚠️ AuthManager가 로드되지 않음 - localStorage 직접 확인');
        const adminRole = localStorage.getItem('adminRole');
        const userId = localStorage.getItem('userId');
        isLoggedIn = !!(adminRole && userId);
        console.log('🔐 localStorage 기반 로그인 상태:', isLoggedIn, { adminRole, userId });
    }
    
    if (!isLoggedIn) {
        console.log('🚪 로그인되지 않은 상태 - 로그인 페이지로 리다이렉트');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('🚀 페이지 초기화 시작');
    initializePage();
    loadProducts();
    loadOrganizationData();
    setupEventListeners();
    console.log('✅ gifts.js 페이지 로드 완료');
});

// 페이지 초기화
function initializePage() {
    console.log('선물보내기 페이지 초기화');
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 검색 버튼
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    
    // 검색 입력 필드 엔터키
    document.getElementById('product-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // 취소 버튼
    document.getElementById('cancel-btn').addEventListener('click', cancelSelection);
    
    // 선물 보내기 버튼
    document.getElementById('send-gift-btn').addEventListener('click', sendGift);
    
    // 페이지네이션 버튼들
    document.getElementById('prev-page').addEventListener('click', () => changePage(currentPage - 1));
    document.getElementById('next-page').addEventListener('click', () => changePage(currentPage + 1));
}

// 상품 데이터 로드 (정적 데이터 사용)
function loadProducts() {
    // 정적 상품 데이터
    allProducts = [
        {
            id: 1,
            title: '배달의민족',
            description: '배달의민족 모바일상품권 2만원',
            price: '20,000원',
            image: '../images/baemin.png',
            category: '배달/음식',
            expiry_date: '구매후 30일입니다',
            detailed_description: '배달의민족 앱에서 사용 가능한 모바일상품권입니다. 음식 배달, 편의점 배달, 꽃 배달 등 다양한 서비스를 이용할 수 있습니다.',
            goods_code: 'G00003471033'
        },
        {
            id: 2,
            title: 'CU',
            description: 'CU 모바일상품권 2만원',
            price: '20,000원',
            image: '../images/cu.png',
            category: '편의점',
            expiry_date: '구매후 30일입니다',
            detailed_description: 'CU 편의점에서 사용 가능한 모바일상품권입니다. 음료, 간식, 생활용품 등 다양한 상품을 구매할 수 있습니다.',
            goods_code: 'G00004291585'
        },
        {
            id: 3,
            title: '신세계',
            description: '신세계 상품권 2만원',
            price: '20,000원',
            image: '../images/sinsaegae.png',
            category: '백화점',
            expiry_date: '구매후 30일입니다',
            detailed_description: '신세계 백화점에서 사용 가능한 상품권입니다. 의류, 화장품, 가전제품 등 다양한 상품을 구매할 수 있습니다.',
            goods_code: 'G00002071060'
        },
        {
            id: 4,
            title: 'GS25',
            description: 'GS25 모바일상품권 2만원',
            price: '20,000원',
            image: '../images/gs25.png',
            category: '편의점',
            expiry_date: '구매후 30일입니다',
            detailed_description: 'GS25 편의점에서 사용 가능한 모바일상품권입니다. 음료, 간식, 생활용품 등 다양한 상품을 구매할 수 있습니다.',
            goods_code: 'G00000750719'
        },
        {
            id: 5,
            title: '이마트',
            description: '이마트 상품권 2만원',
            price: '20,000원',
            image: '../images/emart.png',
            category: '마트',
            expiry_date: '구매후 30일입니다',
            detailed_description: '이마트에서 사용 가능한 상품권입니다. 식품, 생활용품, 의류, 전자제품 등 모든 상품 구매에 사용할 수 있습니다.',
            goods_code: 'G00000830685'
        }
    ];
    
    filteredProducts = [...allProducts];
    renderProducts();
}

// 조직도 데이터 로드
async function loadOrganizationData() {
    // AuthManager가 있는지 확인하고 로그아웃 상태 확인
    if (typeof AuthManager !== 'undefined') {
        if (!AuthManager.isLoggedIn()) {
            console.log('🚪 로그아웃 상태 - 조직도 데이터 로드 중단');
            return;
        }
    } else {
        // AuthManager가 없는 경우 기본 확인
        const adminRole = localStorage.getItem('adminRole');
        if (!adminRole) {
            console.log('🚪 로그아웃 상태 - 조직도 데이터 로드 중단');
            return;
        }
    }
    
    try {
        console.log('🔍 조직도 API 호출 시작');
        const adminRole = localStorage.getItem('adminRole');
        const username = localStorage.getItem('username') || localStorage.getItem('userId');
        console.log('👤 현재 사용자:', `${username} (권한: ${adminRole})`);
        console.log('🔐 인증 상태:', !!adminRole);
        
        // localStorage 디버그 정보
        console.log('localStorage 디버그:', {
            adminRole: localStorage.getItem('adminRole'),
            userId: localStorage.getItem('userId'),
            username: localStorage.getItem('username')
        });
        
        // ApiClient를 사용한 표준화된 API 호출
        const data = await ApiClient.get('/api/gifts/organization-tree');
        
        console.log('✅ 조직도 데이터 로드 성공:', data);
        if (data.success) {
            // 제외할 부서 목록
            const excludedDepartments = [
                '경영관리팀',
                '관리자 주소',
                '외부인력',
                '총경리',
                'AMS팀',
                'TD팀'
            ];
            
            // 제외할 부서들을 필터링
            organizationData = data.data.filter(department => {
                const isExcluded = excludedDepartments.includes(department.name);
                if (isExcluded) {
                    console.log(`🚫 제외된 부서: ${department.name}`);
                }
                return !isExcluded;
            });
            
            console.log('✅ 조직도 데이터 필터링 완료. 부서 수:', organizationData.length);
            console.log('📋 표시되는 부서들:', organizationData.map(dept => dept.name));
        } else {
            console.error('❌ 조직도 데이터 로드 실패:', data.message);
            // 서버 오류 시 기본 조직도 데이터 사용
            console.log('⚡ 폴백 데이터 사용');
            organizationData = [];
        }
    } catch (error) {
        console.error('❌ 조직도 데이터 로드 오류:', error.message);
        
        // 서버 오류 시 폴백 데이터 사용
        console.log('⚡ 서버 오류로 인한 폴백 데이터 사용');
        organizationData = [];
        
        // 인증 오류인 경우 자동 로그아웃 처리됨 (ApiClient에서)
        if (error.message.includes('인증이 만료') || error.message.includes('권한이 없습니다')) {
            return; // 이미 리다이렉트 처리됨
        }
        
        organizationData = []; // 네트워크 오류 시 빈 배열
    }
}

// 상품 목록 렌더링
function renderProducts() {
    const productsGrid = document.getElementById('products-grid');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentProducts = filteredProducts.slice(startIndex, endIndex);
    
    productsGrid.innerHTML = '';
    
    currentProducts.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
    
    renderPagination();
}

// 상품 카드 생성
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;
    
    card.innerHTML = `
        <div class="product-image">
            ${product.image ? `<img src="${product.image}" alt="${product.title}">` : '상품 이미지'}
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.title}</h3>
            <p class="product-description">${product.description}</p>
            <div class="product-price">${product.price}</div>
        </div>
    `;
    
    card.addEventListener('click', () => selectProduct(product));
    
    return card;
}

// 상품 선택
function selectProduct(product) {
    selectedProduct = product;
    
    // 기존 선택 표시 제거
    document.querySelectorAll('.product-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 새로운 선택 표시
    document.querySelector(`[data-product-id="${product.id}"]`).classList.add('selected');
    
    // 선택 섹션 표시
    showSelectionSection();
    renderSelectedProduct();
    renderOrganizationTree();
}

// 선택 섹션 표시
function showSelectionSection() {
    document.getElementById('selection-section').style.display = 'block';
}

// 선택된 상품 정보 렌더링
function renderSelectedProduct() {
    const selectedProductInfo = document.getElementById('selected-product-info');
    const selectedProductDetails = document.getElementById('selected-product-details');
    
    selectedProductInfo.innerHTML = `
        <div class="selected-product-thumbnail">
            ${selectedProduct.image ? `<img src="${selectedProduct.image}" alt="${selectedProduct.title}">` : '상품'}
        </div>
        <div class="selected-product-details">
            <div class="selected-product-title">${selectedProduct.title}</div>
            <div class="selected-product-price">${selectedProduct.price}</div>
        </div>
    `;
    
    selectedProductDetails.innerHTML = `
        <div class="product-detail-item">
            <div class="product-detail-label">카테고리</div>
            <div class="product-detail-value">
                <span class="product-category">${selectedProduct.category}</span>
            </div>
        </div>
        <div class="product-detail-item">
            <div class="product-detail-label">상품 설명</div>
            <div class="product-detail-value product-description-full">${selectedProduct.detailed_description || selectedProduct.description}</div>
        </div>
        <div class="product-detail-item">
            <div class="product-detail-label">유효기간</div>
            <div class="product-detail-value">
                <span class="product-expiry-date">${selectedProduct.expiry_date}</span>
            </div>
        </div>
    `;
}

// 조직도 트리 렌더링
function renderOrganizationTree() {
    const treeContainer = document.getElementById('tree-container');
    treeContainer.innerHTML = '';
    
    organizationData.forEach(department => {
        const departmentNode = createDepartmentNode(department);
        treeContainer.appendChild(departmentNode);
    });
}

// 부서 노드 생성
function createDepartmentNode(department) {
    const node = document.createElement('div');
    node.className = 'department-node';
    
    const departmentId = `dept-${department.name.replace(/\s+/g, '-')}`;
    
    node.innerHTML = `
        <div class="department-header" onclick="toggleDepartment('${departmentId}')">
            <input type="checkbox" class="department-checkbox" onchange="toggleDepartmentSelection('${department.name}')" id="${departmentId}-checkbox">
            <span class="department-name">${department.name}</span>
            <span class="toggle-icon">▶</span>
        </div>
        <div class="members-list">
            ${department.members.map(member => `
                <div class="member-item">
                    <input type="checkbox" class="member-checkbox" onchange="toggleMemberSelection('${member.email}', '${member.name}', '${department.name}')" id="member-${member.email}">
                    <span class="member-name">${member.name}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    node.id = departmentId;
    return node;
}

// 부서 펼치기/접기
function toggleDepartment(departmentId) {
    const node = document.getElementById(departmentId);
    node.classList.toggle('expanded');
}

// 부서 전체 선택/해제
function toggleDepartmentSelection(departmentName) {
    const department = organizationData.find(dept => dept.name === departmentName);
    const departmentCheckbox = document.getElementById(`dept-${departmentName.replace(/\s+/g, '-')}-checkbox`);
    
    if (departmentCheckbox.checked) {
        // 부서 전체 선택
        department.members.forEach(member => {
            selectedRecipients.add(`${member.email}:${member.name}:${departmentName}`);
            document.getElementById(`member-${member.email}`).checked = true;
        });
    } else {
        // 부서 전체 해제
        department.members.forEach(member => {
            selectedRecipients.delete(`${member.email}:${member.name}:${departmentName}`);
            document.getElementById(`member-${member.email}`).checked = false;
        });
    }
    
    updateSelectedRecipients();
}

// 개별 구성원 선택/해제
function toggleMemberSelection(memberEmail, memberName, departmentName) {
    const recipientKey = `${memberEmail}:${memberName}:${departmentName}`;
    const memberCheckbox = document.getElementById(`member-${memberEmail}`);
    
    if (memberCheckbox.checked) {
        selectedRecipients.add(recipientKey);
    } else {
        selectedRecipients.delete(recipientKey);
        
        // 부서 체크박스 해제
        const departmentCheckbox = document.getElementById(`dept-${departmentName.replace(/\s+/g, '-')}-checkbox`);
        if (departmentCheckbox) {
            departmentCheckbox.checked = false;
        }
    }
    
    updateSelectedRecipients();
}

// 선택된 받는 사람 업데이트
function updateSelectedRecipients() {
    const selectedCount = document.getElementById('selected-count');
    const recipientsList = document.getElementById('recipients-list');
    const sendBtn = document.getElementById('send-gift-btn');
    
    selectedCount.textContent = selectedRecipients.size;
    
    // 받는 사람 목록 렌더링
    recipientsList.innerHTML = '';
    selectedRecipients.forEach(recipientKey => {
        const [email, name, department] = recipientKey.split(':');
        const tag = document.createElement('div');
        tag.className = 'recipient-tag';
        tag.innerHTML = `
            ${name} (${department})
            <button class="remove-recipient" onclick="removeRecipient('${recipientKey}')">×</button>
        `;
        recipientsList.appendChild(tag);
    });
    
    // 선물 보내기 버튼 활성화/비활성화
    sendBtn.disabled = selectedRecipients.size === 0;
}

// 받는 사람 제거
function removeRecipient(recipientKey) {
    const [email, name, department] = recipientKey.split(':');
    selectedRecipients.delete(recipientKey);
    
    // 체크박스 해제
    document.getElementById(`member-${email}`).checked = false;
    
    updateSelectedRecipients();
}

// 검색 처리
function handleSearch() {
    const searchTerm = document.getElementById('product-search').value.trim().toLowerCase();
    
    if (searchTerm === '') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => 
            product.title.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
    }
    
    currentPage = 1;
    renderProducts();
}

// 페이지네이션 렌더링
function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const pageNumbers = document.getElementById('page-numbers');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    // 이전/다음 버튼 상태
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    
    // 페이지 번호들
    pageNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => changePage(i));
        pageNumbers.appendChild(pageBtn);
    }
}

// 페이지 변경
function changePage(page) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderProducts();
}

// 선택 취소
function cancelSelection() {
    selectedProduct = null;
    selectedRecipients.clear();
    
    // 선택 표시 제거
    document.querySelectorAll('.product-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 선택 섹션 숨기기
    document.getElementById('selection-section').style.display = 'none';
}

// 선물 보내기
async function sendGift() {
    if (!selectedProduct || selectedRecipients.size === 0) {
        alert('상품과 받는 사람을 선택해주세요.');
        return;
    }

    // goods_code는 상품의 goods_code 필드 사용
    const goodsCode = selectedProduct.goods_code || String(selectedProduct.id);
    // users: 이름, 부서만 포함
    const users = Array.from(selectedRecipients).map(key => {
        const [_email, name, dept] = key.split(':');
        return { name, dept };
    });

    const requestBody = {
        goods_code: goodsCode,
        users: users
    };

    try {
        console.log('🎁 외부 선물 보내기 API 호출:', requestBody);
        const response = await fetch('http://ai2great.com:9999/send_gift', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        const result = await response.json();
        if (response.status === 200) {
            if (result.detail === null) {
                alert('선물이 성공적으로 발송되었습니다!');
                cancelSelection();
            } else {
                alert('오류: ' + result.detail);
            }
        } else {
            alert('오류: ' + (result.detail || '알 수 없는 오류가 발생했습니다.'));
        }
    } catch (error) {
        alert('네트워크 오류: ' + error.message);
    }
}

// 상품 상세 모달 열기
function openProductDetailModal(product) {
    const modal = document.getElementById('product-detail-modal');
    const container = document.getElementById('product-detail-container');
    
    container.innerHTML = `
        <div class="product-detail-image">
            ${product.image ? `<img src="${product.image}" alt="${product.title}">` : '상품 이미지'}
        </div>
        <div class="product-detail-info">
            <h3 class="product-detail-title">${product.title}</h3>
            <p class="product-detail-description">${product.description}</p>
            <div class="product-detail-price">${product.price}</div>
        </div>
    `;
    
    document.getElementById('select-product-btn').onclick = () => {
        selectProduct(product);
        closeProductDetailModal();
    };
    
    modal.style.display = 'block';
}

// 상품 상세 모달 닫기
function closeProductDetailModal() {
    document.getElementById('product-detail-modal').style.display = 'none';
}

// 모달 외부 클릭시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('product-detail-modal');
    if (event.target === modal) {
        closeProductDetailModal();
    }
}; 