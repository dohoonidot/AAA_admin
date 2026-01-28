document.addEventListener('DOMContentLoaded', function() {
    // 🔧 동적 날짜 설정 - 현재 날짜 기준
    console.log('📅 현재 날짜 기준으로 기본 날짜를 설정합니다.');
    
    // 현재 날짜를 기준으로 설정
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7); // 일주일 전
    
    console.log('기본 시작일:', oneWeekAgo.toISOString().split('T')[0]);
    console.log('기본 종료일:', today.toISOString().split('T')[0]);
    
    document.getElementById('start-date').valueAsDate = oneWeekAgo;
    document.getElementById('end-date').valueAsDate = today;
    
    // 이벤트 리스너 설정
    document.getElementById('apply-filter').addEventListener('click', updateDashboard);
    document.getElementById('reset-filter').addEventListener('click', resetFilters);

    // 연령별 차트 버튼 이벤트 리스너
    document.getElementById('ageUsageBtn').addEventListener('click', () => updateAgeGroupChart('usage'));
    document.getElementById('ageAverageUsageBtn').addEventListener('click', () => updateAgeGroupChart('average'));
    document.getElementById('ageUsageRateBtn').addEventListener('click', () => updateAgeGroupChart('rate'));
    
    // 초기 대시보드 데이터 로드
    updateDashboard();
});

// 필터 초기화 (현재 날짜 기준으로 재설정)
function resetFilters() {
    // 🔧 현재 날짜 기준으로 초기화
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    
    document.getElementById('start-date').valueAsDate = oneWeekAgo;
    document.getElementById('end-date').valueAsDate = today;
    
    updateDashboard();
}

// 대시보드 데이터 업데이트
function updateDashboard() {
    const startDate = document.getElementById('start-date').valueAsDate;
    const endDate = document.getElementById('end-date').valueAsDate;
    
    if (!startDate || !endDate) {
        alert('시작일과 종료일을 모두 선택해주세요.');
        return;
    }
    
    if (startDate > endDate) {
        alert('시작일은 종료일보다 이전이어야 합니다.');
        return;
    }
    
    // 데이터 로드 및 표시
    loadDashboardData(startDate, endDate);
}

// 대시보드 데이터 로드
async function loadDashboardData(startDate, endDate) {
    // 데이터 로드 중 표시
    document.getElementById('total-messages').textContent = '로딩 중...';
    document.getElementById('total-users').textContent = '로딩 중...';
    document.getElementById('today-users').textContent = '로딩 중...';
    
    try {
        // 날짜를 YYYY-MM-DD 형식으로 변환
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // 시작일과 종료일이 같은 경우 로그 메시지
        if (startDateStr === endDateStr) {
            const today = new Date().toISOString().split('T')[0];
            if (startDateStr === today) {
                console.log(`📊 오늘(${startDateStr}) 하루 데이터 조회 중...`);
            } else {
                console.log(`📊 ${startDateStr} 하루 데이터 조회 중...`);
            }
        } else {
            console.log(`📊 ${startDateStr} ~ ${endDateStr} 기간 데이터 조회 중...`);
        }
        
        // 로그인 상태 확인 (간단하게 admin_role 존재 여부로 확인)
        const adminRole = localStorage.getItem('adminRole');
        const userId = localStorage.getItem('userId');
        
        console.log('🔍 디버깅: 관리자 권한:', adminRole);
        console.log('🔍 디버깅: 사용자 ID:', userId);
        
        // API 호출 (admin_role과 userId를 헤더로 전송)
        console.log('🔍 디버깅: API 요청 헤더:', {
            'X-Admin-Role': adminRole,
            'X-User-ID': userId,
            'Content-Type': 'application/json'
        });
        
        const response = await fetch(`/api/dashboard?startDate=${startDateStr}&endDate=${endDateStr}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Role': adminRole,
                'X-User-ID': userId
            }
        });
        
        console.log('🔍 디버깅: API 응답 상태:', response.status, response.statusText);
        
        if (!response.ok) {
            if (response.status === 401) {
                alert('로그인이 필요합니다. 다시 로그인해주세요.');
                localStorage.clear();
                window.location.href = '/pages/login.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('대시보드 데이터 로드 성공:', result.data);
            console.log('🔍 ageGroupUsageData 확인:', result.data.ageGroupUsageData);
            displayDashboardData(result.data, startDate, endDate);
        } else {
            throw new Error(result.message || '데이터 로드 실패');
        }
        
    } catch (error) {
        console.error('대시보드 데이터 로드 오류:', error);
        
        // 오류 발생 시 기본값 표시
        document.getElementById('total-messages').textContent = '오류';
        document.getElementById('total-users').textContent = '오류';
        document.getElementById('today-users').textContent = '오류';
        
        // 사용자에게 오류 알림
        alert('대시보드 데이터를 불러오는 중 오류가 발생했습니다: ' + error.message);
        
        // 폴백으로 샘플 데이터 사용 (개발 중에만)
        console.log('폴백으로 샘플 데이터 사용');
        const fallbackData = generateDashboardData(startDate, endDate);
        displayDashboardData(fallbackData, startDate, endDate);
    }
}

// 샘플 대시보드 데이터 생성
function generateDashboardData(startDate, endDate) {
    // 전체 대화 데이터와 사용자 데이터 가져오기
    const conversations = getAllConversationsData();
    const users = getAllUsersData();
    
    // 날짜 범위 처리 로직
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // 현재 시간 사용 (서버에서 한국시간 처리하므로 별도 변환 불필요)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let actualStartTime, actualEndTime;

    console.log('🔍 날짜 범위 디버깅:');
    console.log('  현재 시간:', now.toISOString());
    console.log('  오늘 날짜:', todayStr);
    console.log('  조회 날짜:', endDateStr);
    
    if (startDateStr === endDateStr) {
        // 시작일과 종료일이 같은 경우
        console.log('📅 하루 조회 모드:', startDateStr);
        
        // 해당 날짜의 시작 시간 (00:00:00)
        actualStartTime = new Date(startDate);
        actualStartTime.setHours(0, 0, 0, 0);
        
        if (startDateStr === todayStr) {
            // 🕐 오늘인 경우: DB 형식 현재 시간까지
            actualEndTime = currentTimeAsUTC;
            console.log(`📅 오늘 조회: ${startDateStr} 00:00:00 ~ 현재시간(${actualEndTime.toISOString()}) [DB 형식 기준]`);
        } else {
            // 🕐 과거 날짜인 경우: 해당 날짜의 23:59:59까지
            actualEndTime = new Date(endDate);
            actualEndTime.setHours(23, 59, 59, 999);
            console.log(`📅 과거 날짜 조회: ${startDateStr} 00:00:00 ~ 23:59:59`);
        }
    } else {
        // 🕐 기간 범위 조회
        actualStartTime = new Date(startDate);
        actualStartTime.setHours(0, 0, 0, 0);
        
        actualEndTime = new Date(endDate);
        actualEndTime.setHours(23, 59, 59, 999);
        console.log(`📅 기간 조회: ${startDateStr} 00:00:00 ~ ${endDateStr} 23:59:59`);
    }
    
    // 필터링된 대화 (계산된 시간 범위 사용)
    const filteredConversations = conversations.filter(conv => {
        const convDate = new Date(conv.lastMessageTime);
        return convDate >= actualStartTime && convDate <= actualEndTime;
    });
    
    console.log(`📊 필터링 결과: ${filteredConversations.length}개 대화 발견`);
    console.log(`📊 시간 범위: ${actualStartTime.toISOString()} ~ ${actualEndTime.toISOString()}`);
    
    // 보다 현실적인 데이터 생성을 위한 임의 값 추가
    // 마지막 대화 시간에 기반한 추가 대화 생성 (각 사용자별로 더 많은 대화 생성)
    const enhancedConversations = [...filteredConversations];
    
    // 존재하는 사용자들에 대해 일부 중복 데이터 추가 (더 정확한 사용자별 통계를 위해)
    const existingUsers = new Set(filteredConversations.map(conv => conv.userName));
    existingUsers.forEach(userName => {
        // 각 사용자별로 1~5개의 추가 대화 생성
        const additionalConvCount = Math.floor(Math.random() * 5) + 1;
        
        for (let i = 0; i < additionalConvCount; i++) {
            // 기존 카테고리 중 임의 선택
            const categories = ['코드', '메일', '규정', 'e-Acc', '예산', '일반', 'HR'];
            const randomCategory = categories[Math.floor(Math.random() * categories.length)];
            
            // 해당 사용자의 부서 정보 가져오기
            const userInfo = filteredConversations.find(conv => conv.userName === userName);
            const department = userInfo ? userInfo.department : '기타';
            
            // 대화 시간은 계산된 시간 범위 내에서 랜덤하게 설정
            const randomDate = new Date(actualStartTime.getTime() + Math.random() * (actualEndTime.getTime() - actualStartTime.getTime()));
            
            // 추가 대화 생성
            enhancedConversations.push({
                id: filteredConversations.length + enhancedConversations.length,
                userName: userName,
                department: department,
                category: randomCategory,
                roomTitle: `${randomCategory} 관련 문의 ${i+1}`,
                lastMessage: `${randomCategory}에 대한 추가 문의입니다`,
                lastMessageTime: randomDate.toISOString().replace('T', ' ').substring(0, 19)
            });
        }
    });
    
    // 오늘 접속한 사용자 수 (실제로는 API에서 가져오는 값)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsers = Math.floor(Math.random() * 20) + 10; 
    
    // 카테고리별 질문 횟수 (향상된 데이터 사용)
    const categoryCount = {};
    enhancedConversations.forEach(conv => {
        const category = conv.category;
        categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    
    // 사용자별 채팅 횟수 (향상된 데이터 사용)
    const userChatCount = {};
    enhancedConversations.forEach(conv => {
        const userName = conv.userName;
        if (!userChatCount[userName]) {
            userChatCount[userName] = {
                chatCount: 0,
                department: conv.department
            };
        }
        userChatCount[userName].chatCount++;
    });
    
    // 모든 사용자 데이터 사용 (채팅 횟수 기준 내림차순 정렬)
    const sortedUsers = Object.entries(userChatCount)
        .sort((a, b) => b[1].chatCount - a[1].chatCount);
    
    // 총 메시지 수 계산 (보다 현실적인 값으로)
    const totalMessages = enhancedConversations.reduce((total, conv) => {
        // 각 대화당 평균 메시지 수를 5~15개로 추정
        return total + Math.floor(Math.random() * 10 + 5);
    }, 0);
    
    // 연령별 사용량 데이터 생성 (샘플) - 연령대별 총합
    const ageGroupUsageData = {
        '20-29세': Math.floor(Math.random() * 500) + 200,  // 200-700건
        '30-39세': Math.floor(Math.random() * 800) + 400,  // 400-1200건 (가장 활발한 연령대)
        '40-49세': Math.floor(Math.random() * 600) + 300,  // 300-900건
        '50-59세': Math.floor(Math.random() * 400) + 150   // 150-550건
    };
    
    return {
        totalMessages: totalMessages,
        totalUsers: users.length,
        todayUsers: todayUsers,
        todayConversations: Math.floor(Math.random() * 50) + 10, // 샘플 오늘의 대화 수 (10-60 사이)
        categoryCount: categoryCount,
        topUserChatCount: Object.fromEntries(sortedUsers),
        ageGroupUsageData: ageGroupUsageData
    };
}

// 대시보드 데이터 표시
function displayDashboardData(data, startDate, endDate) {
    // 카드 데이터 표시
    document.getElementById('total-messages').textContent = data.totalMessages.toLocaleString();
    document.getElementById('total-users').textContent = data.totalUsers.toLocaleString();
    document.getElementById('today-users').textContent = data.todayUsers.toLocaleString();
    
    // 오늘의 대화 수 추가
    const todayConversationsElement = document.getElementById('today-conversations');
    if (todayConversationsElement) {
        todayConversationsElement.textContent = data.todayConversations?.toLocaleString() || '0';
    }
    
    // 카테고리별 질문 횟수 차트
    renderCategoryQuestionsChart(data.categoryCount);
    
    // 사용자별 채팅 횟수 차트
    renderUserChatCountChart(data.topUserChatCount);
    
    // 연령별 사용량 차트 (초기 로드 시 총 사용량 차트 표시)
    // renderAgeGroupUsageChart(data.ageGroupUsageData, '연령별 총 사용량', '사용량 (건)'); // 직접 호출 대신 updateAgeGroupChart 사용
    updateAgeGroupChart('usage', data.ageGroupUsageData);
    
    // 카드 제목 업데이트 함수
    updateCardTitles(startDate, endDate);
}

// 카드 제목 업데이트 함수
function updateCardTitles(startDate, endDate) {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // 대시보드 카드 요소들 찾기
    const cards = document.querySelectorAll('.dashboard-card h3');
    
    if (startDateStr === endDateStr) {
        // 시작일과 종료일이 같은 경우
        const today = new Date().toISOString().split('T')[0];
        const dateLabel = startDateStr === today ? '오늘' : startDateStr;
        
        if (cards[0]) cards[0].textContent = `${dateLabel} 메시지 수`;
        if (cards[1]) cards[1].textContent = `${dateLabel} 접속자 수`;
        if (cards[2]) cards[2].textContent = '오늘 접속자 수';
    } else {
        // 기간 범위가 다른 경우
        if (cards[0]) cards[0].textContent = '총 메시지 수';
        if (cards[1]) cards[1].textContent = '기간 접속자 수';
        if (cards[2]) cards[2].textContent = '오늘 접속자 수';
    }
}

// 카테고리별 질문 횟수 차트 렌더링
function renderCategoryQuestionsChart(categoryData) {
    const ctx = document.getElementById('categoryQuestionsChart').getContext('2d');
    
    // 기존 차트가 있으면 제거
    if (window.categoryChart instanceof Chart) {
        window.categoryChart.destroy();
    }
    
    // 데이터 준비 - 값에 따라 내림차순 정렬
    const sortedEntries = Object.entries(categoryData).sort((a, b) => b[1] - a[1]);
    const labels = sortedEntries.map(entry => entry[0]);
    const data = sortedEntries.map(entry => entry[1]);
    const total = data.reduce((a, b) => a + b, 0);
    
    // 최대값을 50의 배수로 올림
    const maxValue = Math.ceil(Math.max(...data) / 50) * 50;
    
    // 카테고리별 구분하기 쉬운 색상과 아이콘 매핑
    const categoryColors = {
        '코드': { color: '#3182F6', icon: '💻', description: '개발/코딩' },
        '메일': { color: '#F59E0B', icon: '📧', description: '메일/커뮤니케이션' },
        '규정': { color: '#EF4444', icon: '📋', description: '규정/정책' },
        'e-Acc': { color: '#10B981', icon: '💳', description: '전자결재/회계' },
        '예산': { color: '#8B5CF6', icon: '💰', description: '예산/재무' },
        '일반': { color: '#6B7280', icon: '💬', description: '일반 문의' },
        'HR': { color: '#F97316', icon: '👥', description: '인사/복리후생' }
    };
    
    // 각 카테고리에 맞는 색상 배열 생성
    const backgroundColors = labels.map(label => {
        const categoryInfo = categoryColors[label];
        return categoryInfo ? categoryInfo.color : '#94A3B8';
    });
    
    // 수평 막대 차트 생성
    window.categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '질문 횟수',
                data: data,
                backgroundColor: backgroundColors.map(color => color + '20'), // 투명도 추가
                borderColor: backgroundColors,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
                barThickness: 35,
                maxBarThickness: 45
            }]
        },
        options: {
            indexAxis: 'y', // 수평 막대 차트로 설정
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            const label = context[0].label;
                            const categoryInfo = categoryColors[label];
                            return categoryInfo ? 
                                `📊 ${categoryInfo.icon} ${label} (${categoryInfo.description})` : 
                                `📊 ${label}`;
                        },
                        label: function(context) {
                            const value = context.raw;
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            
                            // 질문 건수 기준으로 순위 계산
                            const sortedByValue = [...data].sort((a, b) => b - a);
                            const rank = sortedByValue.indexOf(value) + 1;
                            
                            return [
                                `❓ 질문 건수: ${value.toLocaleString()}건`,
                                `📈 전체 비율: ${percentage}%`,
                                `🏆 순위: ${rank}위/${labels.length}위`
                            ];
                        },
                        footer: function(context) {
                            const value = context[0].raw;
                            if (value === 0) {
                                return '💡 이 카테고리의 질문이 없습니다';
                            } else if (value === Math.max(...data)) {
                                return '🎯 가장 많이 질문하는 카테고리입니다!';
                            } else if (value === Math.min(...data.filter(v => v > 0))) {
                                return '📝 질문이 가장 적은 카테고리입니다';
                            }
                            return '';
                        }
                    },
                    padding: 16,
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#F8FAFC',
                    bodyColor: '#E2E8F0',
                    footerColor: '#94A3B8',
                    titleFont: {
                        size: 16,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 14,
                        weight: '500'
                    },
                    footerFont: {
                        size: 12,
                        style: 'italic'
                    },
                    cornerRadius: 12,
                    borderColor: 'rgba(148, 163, 184, 0.3)',
                    borderWidth: 1,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: '#E2E8F0',
                        drawBorder: false,
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#64748B',
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        stepSize: Math.max(1, Math.ceil(maxValue / 10)),
                        callback: function(value) {
                            return `${value.toLocaleString()}건`;
                        },
                        max: maxValue
                    },
                    title: {
                        display: true,
                        text: '질문 건수',
                        color: '#475569',
                        font: {
                            size: 13,
                            weight: '600'
                        }
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#1E293B',
                        font: {
                            size: 16, // Y축 글자 크기 16px로 설정
                            weight: '600'
                        },
                        callback: function(value, index) {
                            const label = this.getLabelForValue(value);
                            const categoryInfo = categoryColors[label];
                            return categoryInfo ? 
                                `${categoryInfo.icon} ${label}` : 
                                label;
                        }
                    }
                }
            },
            animation: {
                duration: 1200,
                easing: 'easeOutQuart'
            },
            layout: {
                padding: {
                    top: 10,
                    right: 20,
                    bottom: 10,
                    left: 10
                }
            },
            onHover: (event, activeElements) => {
                event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
            }
        }
    });
}

// 사용자별 채팅 횟수 테이블 렌더링 (페이지네이션 포함)
let currentUserData = [];
let originalUserData = [];
let currentPage = 1;
let itemsPerPage = 30;
let currentSortType = 'chatCount'; // 'chatCount', 'department', 'name'
let currentSortOrder = 'desc'; // 'asc', 'desc'
let currentDepartmentFilter = 'all'; // 부서 필터

function renderUserChatCountChart(userData) {
    // 데이터 준비 - 값에 따라 내림차순 정렬
    const sortedEntries = Object.entries(userData).sort((a, b) => b[1].chatCount - a[1].chatCount);
    const total = Object.values(userData).reduce((a, b) => a + b.chatCount, 0);
    
    // 전역 변수에 데이터 저장
    originalUserData = sortedEntries.map(([userName, data], index) => ({
        userName,
        chatCount: data.chatCount,
        department: data.department,
        originalRank: index + 1,
        percentage: Math.round((data.chatCount / total) * 100),
        recentActivity: getRandomRecentTime()
    }));
    
    // 현재 데이터를 원본 데이터로 초기화
    currentUserData = [...originalUserData];
    currentSortType = 'chatCount';
    currentSortOrder = 'desc';
    
    // 페이지네이션 이벤트 리스너 설정 (한 번만)
    setupPaginationEvents();
    
    // 정렬 이벤트 리스너 설정
    setupSortingEvents();
    
    // 부서 필터 이벤트 리스너 설정
    setupDepartmentFilterEvents();
    
    // 테이블 렌더링
    renderTablePage();
    
    // 페이지네이션 컨트롤 업데이트
    updatePaginationControls();
}

// 사용자별 부서 정보 매핑
function getUserDepartment(userName) {
    const userDepartments = {
        '홍길동': '경영관리실',
        '김철수': 'New Tech사업부',
        '이영희': '솔루션사업부',
        '박민수': 'FCM사업부',
        '최지원': 'SCM사업부',
        '정수민': 'Innovation Center',
        '강지훈': 'Biz AI사업부',
        '조민지': 'HRS사업부',
        '윤서준': 'DTE본부',
        '한미영': 'PUBLIC CLOUD사업부',
        '장현우': 'ITS사업부',
        '송지은': 'BAC사업부',
        '임준호': 'NGE본부',
        '오성민': 'DX사업부',
        '김지혜': 'LG CNS 연구소'
    };
    return userDepartments[userName] || '기타';
}

// 최근 활동 시간 생성 함수
function getRandomRecentTime() {
    const now = new Date();
    const hours = Math.floor(Math.random() * 24);
    const minutes = Math.floor(Math.random() * 60);
    
    if (hours < 1) {
        return `${minutes}분 전`;
    } else if (hours < 24) {
        return `${hours}시간 전`;
    } else {
        const days = Math.floor(Math.random() * 7) + 1;
        return `${days}일 전`;
    }
}

// 현재 페이지 테이블 렌더링
function renderTablePage() {
    const tableBody = document.getElementById('userChatTableBody');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, currentUserData.length);
    const pageData = currentUserData.slice(startIndex, endIndex);
    
    // 기존 내용 제거
    tableBody.innerHTML = '';
    
    // 테이블 행 생성
    pageData.forEach((user, pageIndex) => {
        const globalIndex = startIndex + pageIndex;
        const row = document.createElement('tr');
        
        // 순위별 클래스 추가
        if (user.originalRank === 1) {
            row.className = 'top-user rank-1';
        } else if (user.originalRank === 2) {
            row.className = 'top-user rank-2';
        } else if (user.originalRank === 3) {
            row.className = 'top-user rank-3';
        } else {
            row.className = '';
        }
        
        // 순위에 따른 메달 이모티콘 (필터링 기준)
        let rankDisplay;
        if (currentDepartmentFilter === 'all') {
            // 전체 부서 표시시 원래 순위 사용
            rankDisplay = `${user.originalRank}`;
            if (user.originalRank === 1) rankDisplay = '🥇 1';
            else if (user.originalRank === 2) rankDisplay = '🥈 2';
            else if (user.originalRank === 3) rankDisplay = '🥉 3';
        } else {
            // 부서 필터링시 필터된 순위 사용
            const filteredRank = user.filteredRank || globalIndex + 1;
            rankDisplay = `${filteredRank}`;
            if (filteredRank === 1) rankDisplay = '🥇 1';
            else if (filteredRank === 2) rankDisplay = '🥈 2';
            else if (filteredRank === 3) rankDisplay = '🥉 3';
        }
        
        row.innerHTML = `
            <td class="rank-cell">${rankDisplay}</td>
            <td class="user-cell">
                <div class="user-info">
                    <span class="user-avatar">👤</span>
                    <span class="user-name">${user.userName}</span>
                </div>
            </td>
            <td class="department-cell">${user.department}</td>
            <td class="chat-count-cell">
                <div class="count-display">
                    <span class="count-number">${user.chatCount.toLocaleString()}</span>
                    <span class="count-unit">건</span>
                </div>
            </td>
            <td class="percentage-cell">
                <div class="percentage-bar">
                    <div class="percentage-fill" style="width: ${user.percentage}%"></div>
                    <span class="percentage-text">${user.percentage}%</span>
                </div>
            </td>
            <td class="activity-cell">${user.recentActivity}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // 페이지 정보 업데이트
    updatePageInfo();
}

// 페이지 정보 업데이트
function updatePageInfo() {
    const total = currentUserData.length;
    const totalChatCount = currentUserData.reduce((sum, user) => sum + user.chatCount, 0);
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, total);
    
    // 상단 페이지 정보
    document.getElementById('tablePageInfo').textContent = `${startIndex}-${endIndex} / ${total}명`;
    
    // 하단 페이지네이션 정보
    document.getElementById('paginationInfo').innerHTML = `
        총 <strong>${total}명</strong> | 
        전체 채팅 <strong>${totalChatCount.toLocaleString()}건</strong> | 
        평균 <strong>${Math.round(totalChatCount / total)}건/인</strong>
    `;
}

// 페이지네이션 컨트롤 업데이트
function updatePaginationControls() {
    const totalPages = Math.ceil(currentUserData.length / itemsPerPage);
    const pageNumbers = document.getElementById('pageNumbers');
    
    // 페이지 번호 생성
    pageNumbers.innerHTML = '';
    
    // 페이지 번호 범위 계산 (현재 페이지 중심으로 5개)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToPage(i);
        pageNumbers.appendChild(pageBtn);
    }
    
    // 버튼 상태 업데이트
    document.getElementById('firstPage').disabled = currentPage === 1;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
    document.getElementById('lastPage').disabled = currentPage === totalPages;
}

// 페이지 이동
function goToPage(page) {
    const totalPages = Math.ceil(currentUserData.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTablePage();
        updatePaginationControls();
    }
}

// 페이지네이션 이벤트 설정
function setupPaginationEvents() {
    // 중복 이벤트 방지
    const firstBtn = document.getElementById('firstPage');
    if (firstBtn.onclick) return;
    
    document.getElementById('firstPage').onclick = () => goToPage(1);
    document.getElementById('prevPage').onclick = () => goToPage(currentPage - 1);
    document.getElementById('nextPage').onclick = () => goToPage(currentPage + 1);
    document.getElementById('lastPage').onclick = () => goToPage(Math.ceil(currentUserData.length / itemsPerPage));
    
    // 페이지당 아이템 수 변경
    document.getElementById('itemsPerPage').onchange = function() {
        itemsPerPage = parseInt(this.value);
        currentPage = 1; // 첫 페이지로 리셋
        renderTablePage();
        updatePaginationControls();
        updateTableInfo();
    };
}

// 정렬 이벤트 리스너 설정
function setupSortingEvents() {
    // 부서 컬럼 클릭 이벤트 제거 (이제 필터로 대체)
    const departmentHeader = document.querySelector('[data-sort="department"]');
    if (departmentHeader) {
        departmentHeader.style.cursor = 'default';
        departmentHeader.onclick = null;
        // 정렬 아이콘 제거
        const sortIcon = departmentHeader.querySelector('.sort-icon');
        if (sortIcon) {
            sortIcon.remove();
        }
    }
}

// 부서 필터 이벤트 리스너 설정
function setupDepartmentFilterEvents() {
    const departmentFilter = document.getElementById('departmentFilter');
    if (departmentFilter) {
        departmentFilter.addEventListener('change', function() {
            currentDepartmentFilter = this.value;
            applyDepartmentFilter();
        });
    }
}

// 부서 필터 적용 함수
function applyDepartmentFilter() {
    if (currentDepartmentFilter === 'all') {
        // 전체 부서 표시
        currentUserData = [...originalUserData];
    } else {
        // 선택된 부서만 필터링
        currentUserData = originalUserData.filter(user => user.department === currentDepartmentFilter);
    }
    
    // 필터링 후 순위 재계산
    currentUserData.forEach((user, index) => {
        user.filteredRank = index + 1;
    });
    
    // 첫 페이지로 이동
    currentPage = 1;
    
    // 테이블 재렌더링
    renderTablePage();
    updatePaginationControls();
    updateTableInfo();
}

// 테이블 정보 업데이트 (필터링된 결과 반영)
function updateTableInfo() {
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, currentUserData.length);
    const totalCount = currentUserData.length;
    
    const tablePageInfo = document.getElementById('tablePageInfo');
    if (tablePageInfo) {
        if (currentDepartmentFilter !== 'all') {
            const filterName = currentDepartmentFilter;
            tablePageInfo.textContent = `${startIndex}-${endIndex} / ${totalCount}명 (${filterName})`;
        } else {
            tablePageInfo.textContent = `${startIndex}-${endIndex} / ${totalCount}명`;
        }
    }
}

// 정렬 아이콘 업데이트
function updateSortIcons() {
    // 모든 정렬 아이콘 초기화
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.textContent = '⇅';
        icon.style.color = '#94A3B8';
    });
    
    // 현재 정렬 컬럼의 아이콘 업데이트
    const currentHeader = document.querySelector(`[data-sort="${currentSortType}"]`);
    if (currentHeader) {
        const icon = currentHeader.querySelector('.sort-icon');
        if (icon) {
            icon.textContent = currentSortOrder === 'asc' ? '↑' : '↓';
            icon.style.color = '#3B82F6';
        }
    }
}

// 연령별 사용량 차트 렌더링 함수
function renderAgeGroupUsageChart(ageGroupData, chartTitle, yAxisLabel) {
    const ctx = document.getElementById('ageGroupUsageChart').getContext('2d');
    
    // 기존 차트가 있으면 제거
    if (window.ageGroupChart instanceof Chart) {
        window.ageGroupChart.destroy();
    }
    
    // 데이터 유효성 검사
    if (!ageGroupData || typeof ageGroupData !== 'object') {
        console.warn('연령별 사용량 데이터가 없습니다. 기본 데이터를 사용합니다.');
        ageGroupData = {
            '20-29세': 0,
            '30-39세': 0,
            '40-49세': 0,
            '50-59세': 0,
            '60-69세': 0
        };
    }
    
    // 데이터 준비 - 나이순으로 정렬
    const sortedEntries = Object.entries(ageGroupData).sort((a, b) => {
        const ageA = parseInt(a[0].split('-')[0]);
        const ageB = parseInt(b[0].split('-')[0]);
        return ageA - ageB;
    });
    
    // 라벨 매핑 (20-29세 → 20대)
    const labelMapping = {
        '20-29세': '20대',
        '30-39세': '30대', 
        '40-49세': '40대',
        '50-59세': '50대',
        '60-69세': '60대'
    };
    
    const labels = sortedEntries.map(entry => labelMapping[entry[0]] || entry[0]);
    const data = sortedEntries.map(entry => entry[1]);
    const total = data.reduce((a, b) => a + b, 0);
    
    // 나이대별 색상 매핑 (원본 키로 매핑)
    const ageGroupColors = {
        '20-29세': '#3182F6',  // 파란색 (젊은 세대)
        '30-39세': '#10B981',  // 초록색 (활발한 세대)
        '40-49세': '#F59E0B',  // 주황색 (중견 세대)
        '50-59세': '#EF4444',  // 빨간색 (시니어 세대)
        '60-69세': '#8B5CF6'   // 보라색 (60대)
    };
    
    const backgroundColors = sortedEntries.map(entry => ageGroupColors[entry[0]] || '#94A3B8');
    
    // 최대값을 100의 배수로 올림 (Y축 스케일 조정)
    const maxValue = Math.ceil(Math.max(...data) / 100) * 100;
    
    // 수직 바 차트 생성
    window.ageGroupChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: chartTitle,
                data: data,
                backgroundColor: backgroundColors.map(color => color + '30'), // 투명도 추가
                borderColor: backgroundColors,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
                barThickness: 60,
                maxBarThickness: 80
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // 바 차트에서는 범례 숨김
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            return `📊 ${context[0].label} ${chartTitle}`; // 동적 제목
                        },
                        label: function(context) {
                            const value = context.raw;
                            let displayValue = value.toLocaleString();
                            let unit = '건';
                            if (chartTitle.includes('사용률')) {
                                unit = '%';
                                displayValue = `${value}%`;
                            } else if (chartTitle.includes('평균 사용량')) {
                                unit = '건/인';
                                displayValue = `${value}건`;
                            }

                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            
                            // 사용량 기준으로 순위 계산
                            const sortedByValue = [...data].sort((a, b) => b - a);
                            const rank = sortedByValue.indexOf(value) + 1;
                            
                            return [
                                `💬 ${yAxisLabel}: ${displayValue}`,
                                `📈 전체 비율: ${percentage}%`,
                                `🏆 순위: ${rank}위/${labels.length}위`
                            ];
                        },
                        footer: function(context) {
                            const value = context[0].raw;
                            if (value === 0) {
                                return '💡 이 연령대의 사용량이 없습니다';
                            } else if (value === Math.max(...data)) {
                                return '🎯 가장 많이 사용하는 연령대입니다!';
                            } else if (value === Math.min(...data.filter(v => v > 0))) {
                                return '📝 사용량이 가장 적은 연령대입니다';
                            }
                            return '';
                        }
                    },
                    padding: 16,
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#F8FAFC',
                    bodyColor: '#E2E8F0',
                    footerColor: '#94A3B8',
                    titleFont: {
                        size: 16,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 14,
                        weight: '500'
                    },
                    footerFont: {
                        size: 12,
                        style: 'italic'
                    },
                    cornerRadius: 12,
                    borderColor: 'rgba(148, 163, 184, 0.3)',
                    borderWidth: 1,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#1E293B',
                        font: {
                            size: 15,
                            weight: '600'
                        }
                    },
                    title: {
                        display: true,
                        text: '연령대',
                        color: '#475569',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#E2E8F0',
                        drawBorder: false,
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#64748B',
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        stepSize: chartTitle.includes('평균 사용량') ? 1 : Math.max(1, Math.ceil(maxValue / 10)),
                        callback: function(value) {
                            if (chartTitle.includes('사용률')) {
                                return `${value}%`;
                            } else if (chartTitle.includes('평균 사용량')) {
                                return `${value}건`;
                            } else {
                                return `${value.toLocaleString()}건`;
                            }
                        },
                        max: maxValue
                    },
                    title: {
                        display: true,
                        text: yAxisLabel,
                        color: '#475569',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    }
                }
            },
            animation: {
                duration: 1200,
                easing: 'easeOutQuart'
            },
            layout: {
                padding: {
                    top: 20,
                    right: 20,
                    bottom: 10,
                    left: 10
                }
            },
            onHover: (event, activeElements) => {
                event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
            }
        }
    });
}

// 연령별 차트 업데이트 함수
async function updateAgeGroupChart(chartType, initialData = null) {
    const startDate = document.getElementById('start-date').valueAsDate;
    const endDate = document.getElementById('end-date').valueAsDate;

    if (!startDate || !endDate) {
        alert('시작일과 종료일을 모두 선택해주세요.');
        return;
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const adminRole = localStorage.getItem('adminRole');
    const userId = localStorage.getItem('userId');

    let apiUrl = '';
    let chartTitle = '';
    let yAxisLabel = '';

    // 버튼 활성화/비활성화 처리
    document.querySelectorAll('.chart-button').forEach(button => {
        button.classList.remove('active');
    });

    switch (chartType) {
        case 'usage':
            apiUrl = `/api/dashboard/age-groups?startDate=${startDateStr}&endDate=${endDateStr}`;
            chartTitle = '연령별 총 사용량';
            yAxisLabel = '사용량 (건)';
            document.getElementById('ageUsageBtn').classList.add('active');
            break;
        case 'average':
            apiUrl = `/api/dashboard/age-groups/average?startDate=${startDateStr}&endDate=${endDateStr}`;
            chartTitle = '연령별 평균 사용량';
            yAxisLabel = '평균 사용량 (건/인)';
            document.getElementById('ageAverageUsageBtn').classList.add('active');
            break;
        case 'rate':
            apiUrl = `/api/dashboard/age-groups/rate?startDate=${startDateStr}&endDate=${endDateStr}`;
            chartTitle = '연령별 사용률';
            yAxisLabel = '사용률 (%)';
            document.getElementById('ageUsageRateBtn').classList.add('active');
            break;
        default:
            console.error('알 수 없는 차트 유형:', chartType);
            return;
    }

    try {
        let dataToRender;
        if (initialData && chartType === 'usage') {
            // 초기 로드 시에는 이미 받아온 데이터를 사용
            dataToRender = initialData;
        } else {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Role': adminRole,
                    'X-User-ID': userId
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                // API 응답 구조에 따라 데이터 추출
                if (chartType === 'usage') {
                    dataToRender = result.data.ageGroupUsageData;
                } else if (chartType === 'average') {
                    dataToRender = result.data.ageGroupAverageUsageData;
                } else if (chartType === 'rate') {
                    dataToRender = result.data.ageGroupUsageRateData;
                }
            } else {
                throw new Error(result.message || '데이터 로드 실패');
            }
        }

        renderAgeGroupUsageChart(dataToRender, chartTitle, yAxisLabel);

    } catch (error) {
        console.error(`연령별 ${chartType} 차트 데이터 로드 오류:`, error);
        alert(`연령별 ${chartType} 차트 데이터를 불러오는 중 오류가 발생했습니다: ` + error.message);
        // 오류 발생 시 기본값으로 차트 렌더링
        renderAgeGroupUsageChart({
            '20-29세': 0,
            '30-39세': 0,
            '40-49세': 0,
            '50-59세': 0,
            '60-69세': 0
        }, chartTitle, yAxisLabel);
    }
}

// 전체 샘플 대화 데이터 가져오기
function getAllConversationsData() {
    // conversations.js의 testConversations 전체 샘플 데이터
    return [
        {
            id: 1,
            userName: "홍길동",
            department: "경영관리실",
            category: "코드",
            roomTitle: "프로젝트 회의",
            lastMessage: "안녕하세요",
            lastMessageTime: "2025-04-12 10:00:00"
        },
        {
            id: 2,
            userName: "김철수",
            department: "New Tech사업부",
            category: "메일",
            roomTitle: "이메일 문의",
            lastMessage: "문의드립니다",
            lastMessageTime: "2025-04-13 11:00:00"
        },
        {
            id: 3,
            userName: "이영희",
            department: "솔루션사업부",
            category: "규정",
            roomTitle: "규정 문의",
            lastMessage: "규정 확인 부탁드립니다",
            lastMessageTime: "2025-04-14 12:00:00"
        },
        {
            id: 4,
            userName: "박민수",
            department: "FCM사업부",
            category: "e-Acc",
            roomTitle: "e-Acc 사용 오류",
            lastMessage: "e-Acc에서 결재 진행이 안됩니다",
            lastMessageTime: "2025-04-15 09:15:00"
        },
        {
            id: 5,
            userName: "최지원",
            department: "SCM사업부",
            category: "예산",
            roomTitle: "예산 관련 문의",
            lastMessage: "4분기 예산 조정 방법 문의드립니다",
            lastMessageTime: "2025-04-16 10:30:00"
        },
        {
            id: 6,
            userName: "정수민",
            department: "Innovation Center",
            category: "일반",
            roomTitle: "회의실 예약",
            lastMessage: "오늘 오후 회의실 예약 가능한가요?",
            lastMessageTime: "2025-04-17 11:45:00"
        },
        {
            id: 7,
            userName: "강지훈",
            department: "Biz AI사업부",
            category: "HR",
            roomTitle: "휴가 신청 문의",
            lastMessage: "연차 신청 절차 확인 부탁드립니다",
            lastMessageTime: "2025-04-18 13:20:00"
        },
        {
            id: 8,
            userName: "조민지",
            department: "HRS사업부",
            category: "코드",
            roomTitle: "AI 모델 개발 관련",
            lastMessage: "새로운 ML 모델 적용 방안에 대해 논의하고 싶습니다",
            lastMessageTime: "2025-04-19 09:00:00"
        },
        {
            id: 9,
            userName: "윤서준",
            department: "DTE본부",
            category: "메일",
            roomTitle: "메일 시스템 오류",
            lastMessage: "메일 발송이 되지 않는 문제가 발생했습니다",
            lastMessageTime: "2025-04-20 10:45:00"
        },
        {
            id: 10,
            userName: "한미영",
            department: "PUBLIC CLOUD사업부",
            category: "코드",
            roomTitle: "클라우드 배포 이슈",
            lastMessage: "클라우드 환경에서 배포 중 에러가 발생합니다",
            lastMessageTime: "2025-04-21 13:30:00"
        },
        {
            id: 11,
            userName: "장현우",
            department: "ITS사업부",
            category: "규정",
            roomTitle: "보안 규정 확인",
            lastMessage: "외부 접속에 관한 보안 규정을 확인하고 싶습니다",
            lastMessageTime: "2025-04-22 15:20:00"
        },
        {
            id: 12,
            userName: "송지은",
            department: "BAC사업부",
            category: "일반",
            roomTitle: "프로젝트 진행상황",
            lastMessage: "프로젝트 진행상황 공유 드립니다",
            lastMessageTime: "2025-04-23 09:10:00"
        },
        {
            id: 13,
            userName: "임준호",
            department: "NGE본부",
            category: "HR",
            roomTitle: "인사 이동 관련",
            lastMessage: "인사 이동 일정 문의드립니다",
            lastMessageTime: "2025-04-24 10:45:00"
        },
        {
            id: 14,
            userName: "오성민",
            department: "경영관리실",
            category: "예산",
            roomTitle: "예산 승인 요청",
            lastMessage: "추가 예산 승인 요청드립니다",
            lastMessageTime: "2025-04-25 11:30:00"
        },
        {
            id: 15,
            userName: "권민재",
            department: "New Tech사업부",
            category: "코드",
            roomTitle: "신기술 도입 검토",
            lastMessage: "신규 기술 도입 검토 요청드립니다",
            lastMessageTime: "2025-04-26 14:15:00"
        },
        {
            id: 16,
            userName: "나은지",
            department: "솔루션사업부",
            category: "메일",
            roomTitle: "고객사 메일 문의",
            lastMessage: "고객사로부터 온 메일 관련 문의드립니다",
            lastMessageTime: "2025-04-27 09:05:00"
        },
        {
            id: 17,
            userName: "황준혁",
            department: "FCM사업부",
            category: "e-Acc",
            roomTitle: "e-Acc 사용자 권한",
            lastMessage: "e-Acc 사용자 권한 변경 요청드립니다",
            lastMessageTime: "2025-04-28 10:20:00"
        },
        {
            id: 18,
            userName: "서지연",
            department: "SCM사업부",
            category: "일반",
            roomTitle: "업무 협조 요청",
            lastMessage: "프로젝트 관련 업무 협조 요청드립니다",
            lastMessageTime: "2025-04-29 11:45:00"
        },
        {
            id: 19,
            userName: "류동현",
            department: "Innovation Center",
            category: "코드",
            roomTitle: "혁신 기술 검토",
            lastMessage: "새로운 혁신 기술 검토 의견 부탁드립니다",
            lastMessageTime: "2025-04-30 13:30:00"
        },
        {
            id: 20,
            userName: "김태희",
            department: "Biz AI사업부",
            category: "코드",
            roomTitle: "AI 모델 성능 개선",
            lastMessage: "AI 모델 성능 개선 방안에 대해 논의하고 싶습니다",
            lastMessageTime: "2025-05-01 15:00:00"
        },
        {
            id: 21,
            userName: "이승현",
            department: "HRS사업부",
            category: "HR",
            roomTitle: "채용 일정 문의",
            lastMessage: "신규 채용 일정 관련 문의드립니다",
            lastMessageTime: "2025-05-02 09:30:00"
        },
        {
            id: 22,
            userName: "박소연",
            department: "DTE본부",
            category: "e-Acc",
            roomTitle: "비용 처리 방법",
            lastMessage: "외부 행사 비용 처리 방법 문의드립니다",
            lastMessageTime: "2025-05-03 11:00:00"
        },
        {
            id: 23,
            userName: "최현준",
            department: "PUBLIC CLOUD사업부",
            category: "규정",
            roomTitle: "클라우드 서비스 규정",
            lastMessage: "클라우드 서비스 이용 규정 확인 부탁드립니다",
            lastMessageTime: "2025-05-04 13:15:00"
        },
        {
            id: 24,
            userName: "정다은",
            department: "ITS사업부",
            category: "일반",
            roomTitle: "시스템 점검 일정",
            lastMessage: "시스템 정기 점검 일정 공유드립니다",
            lastMessageTime: "2025-05-05 14:40:00"
        },
        {
            id: 25,
            userName: "강태윤",
            department: "BAC사업부",
            category: "예산",
            roomTitle: "예산 사용 내역",
            lastMessage: "1분기 예산 사용 내역 보고드립니다",
            lastMessageTime: "2025-05-12 16:20:00"
        }
    ];
}

// 전체 샘플 사용자 데이터 가져오기
function getAllUsersData() {
    // users.js의 사용자 데이터 참조
    return [
        {id: 1, name: '홍길동', loginId: 'hong', department: '경영관리실', position: '상무', title: '사업부장', role: '2'},
        {id: 2, name: '김철수', loginId: 'kim', department: 'DTE본부', position: '전무', title: '본부장', role: '3'},
        {id: 3, name: '이영희', loginId: 'lee', department: 'New Tech사업부', position: '위원', title: '팀원', role: '5'},
        {id: 4, name: '박지성', loginId: 'park', department: '대표이사', position: '대표', title: '대표이사', role: '0'},
        {id: 5, name: '최민수', loginId: 'choi', department: 'HRS사업부', position: '위원', title: '팀장', role: '4'},
        {id: 6, name: '정수민', loginId: 'jung', department: 'Innovation Center', position: '위원', title: '팀원', role: '5'},
        {id: 7, name: '강지훈', loginId: 'kang', department: 'Biz AI 사업부', position: '위원', title: '팀원', role: '5'},
        {id: 8, name: '조민지', loginId: 'cho', department: 'HRS사업부', position: '위원', title: '팀원', role: '5'},
        {id: 9, name: '윤서준', loginId: 'yoon', department: 'DTE본부', position: '위원', title: '팀원', role: '5'},
        {id: 10, name: '한미영', loginId: 'han', department: 'PUBLIC CLOUD사업부', position: '위원', title: '팀원', role: '5'},
        {id: 11, name: '장현우', loginId: 'jang', department: 'ITS사업부', position: '위원', title: '팀원', role: '5'},
        {id: 12, name: '송지은', loginId: 'song', department: 'BAC사업부', position: '위원', title: '팀원', role: '5'},
        {id: 13, name: '임준호', loginId: 'lim', department: 'NGE본부', position: '위원', title: '팀원', role: '5'},
        {id: 14, name: '오성민', loginId: 'oh', department: '경영관리실', position: '위원', title: '팀원', role: '5'},
        {id: 15, name: '권민재', loginId: 'kwon', department: 'New Tech사업부', position: '위원', title: '팀원', role: '5'},
        {id: 16, name: '나은지', loginId: 'na', department: '솔루션사업부', position: '위원', title: '팀원', role: '5'},
        {id: 17, name: '황준혁', loginId: 'hwang', department: 'FCM사업부', position: '위원', title: '팀원', role: '5'},
        {id: 18, name: '서지연', loginId: 'seo', department: 'SCM사업부', position: '위원', title: '팀원', role: '5'},
        {id: 19, name: '류동현', loginId: 'ryu', department: 'Innovation Center', position: '위원', title: '팀원', role: '5'},
        {id: 20, name: '김태희', loginId: 'kimth', department: 'Biz AI 사업부', position: '위원', title: '팀원', role: '5'},
        {id: 21, name: '이승현', loginId: 'leesh', department: 'HRS사업부', position: '위원', title: '팀원', role: '5'},
        {id: 22, name: '박소연', loginId: 'parksy', department: 'DTE본부', position: '위원', title: '팀원', role: '5'},
        {id: 23, name: '최현준', loginId: 'choihj', department: 'PUBLIC CLOUD사업부', position: '위원', title: '팀원', role: '5'},
        {id: 24, name: '정다은', loginId: 'jungde', department: 'ITS사업부', position: '위원', title: '팀원', role: '5'},
        {id: 25, name: '강태윤', loginId: 'kangty', department: 'BAC사업부', position: '위원', title: '팀원', role: '5'},
        {id: 26, name: '사용자26', loginId: 'user26', department: 'NGE본부', position: '위원', title: '팀원', role: '5'},
        {id: 27, name: '사용자27', loginId: 'user27', department: '경영관리실', position: '위원', title: '팀원', role: '5'},
        {id: 28, name: '사용자28', loginId: 'user28', department: 'New Tech사업부', position: '위원', title: '팀원', role: '5'},
        {id: 29, name: '사용자29', loginId: 'user29', department: '솔루션사업부', position: '위원', title: '팀원', role: '5'},
        {id: 30, name: '사용자30', loginId: 'user30', department: 'FCM사업부', position: '위원', title: '팀원', role: '5'},
        {id: 31, name: '사용자31', loginId: 'user31', department: 'SCM사업부', position: '위원', title: '팀원', role: '5'},
        {id: 32, name: '사용자32', loginId: 'user32', department: 'Innovation Center', position: '위원', title: '팀원', role: '5'},
        {id: 33, name: '사용자33', loginId: 'user33', department: 'Biz AI 사업부', position: '위원', title: '팀원', role: '5'},
        {id: 34, name: '사용자34', loginId: 'user34', department: 'HRS사업부', position: '위원', title: '팀원', role: '5'},
        {id: 35, name: '사용자35', loginId: 'user35', department: 'DTE본부', position: '위원', title: '팀원', role: '5'},
        {id: 36, name: '사용자36', loginId: 'user36', department: 'PUBLIC CLOUD사업부', position: '위원', title: '팀원', role: '5'},
        {id: 37, name: '사용자37', loginId: 'user37', department: 'ITS사업부', position: '위원', title: '팀원', role: '5'},
        {id: 38, name: '사용자38', loginId: 'user38', department: 'BAC사업부', position: '위원', title: '팀원', role: '5'},
        {id: 39, name: '사용자39', loginId: 'user39', department: 'NGE본부', position: '위원', title: '팀원', role: '5'},
        {id: 40, name: '사용자40', loginId: 'user40', department: '경영관리실', position: '위원', title: '팀원', role: '5'},
        {id: 41, name: '사용자41', loginId: 'user41', department: 'New Tech사업부', position: '위원', title: '팀원', role: '5'},
        {id: 42, name: '사용자42', loginId: 'user42', department: '솔루션사업부', position: '위원', title: '팀원', role: '5'},
        {id: 43, name: '사용자43', loginId: 'user43', department: 'FCM사업부', position: '위원', title: '팀원', role: '5'},
        {id: 44, name: '사용자44', loginId: 'user44', department: 'SCM사업부', position: '위원', title: '팀원', role: '5'},
        {id: 45, name: '사용자45', loginId: 'user45', department: 'Innovation Center', position: '위원', title: '팀원', role: '5'},
        {id: 46, name: '사용자46', loginId: 'user46', department: 'Biz AI 사업부', position: '위원', title: '팀원', role: '5'},
        {id: 47, name: '사용자47', loginId: 'user47', department: 'HRS사업부', position: '위원', title: '팀원', role: '5'},
        {id: 48, name: '사용자48', loginId: 'user48', department: 'DTE본부', position: '위원', title: '팀원', role: '5'},
        {id: 49, name: '사용자49', loginId: 'user49', department: 'PUBLIC CLOUD사업부', position: '위원', title: '팀원', role: '5'},
        {id: 50, name: '사용자50', loginId: 'user50', department: 'ITS사업부', position: '위원', title: '팀원', role: '5'},
        {id: 51, name: '사용자51', loginId: 'user51', department: 'BAC사업부', position: '위원', title: '팀원', role: '5'},
        {id: 52, name: '사용자52', loginId: 'user52', department: 'NGE본부', position: '위원', title: '팀원', role: '5'},
        {id: 53, name: '사용자53', loginId: 'user53', department: '경영관리실', position: '위원', title: '팀원', role: '5'},
        {id: 54, name: '사용자54', loginId: 'user54', department: 'New Tech사업부', position: '위원', title: '팀원', role: '5'},
        {id: 55, name: '사용자55', loginId: 'user55', department: '솔루션사업부', position: '위원', title: '팀원', role: '5'},
        {id: 56, name: '사용자56', loginId: 'user56', department: 'FCM사업부', position: '위원', title: '팀원', role: '5'},
        {id: 57, name: '사용자57', loginId: 'user57', department: 'SCM사업부', position: '위원', title: '팀원', role: '5'},
        {id: 58, name: '사용자58', loginId: 'user58', department: 'Innovation Center', position: '위원', title: '팀원', role: '5'},
        {id: 59, name: '사용자59', loginId: 'user59', department: 'Biz AI 사업부', position: '위원', title: '팀원', role: '5'},
        {id: 60, name: '사용자60', loginId: 'user60', department: 'HRS사업부', position: '위원', title: '팀원', role: '5'}
    ];
} 