const db = require('../config/db');

// 상품 목록 조회
const getProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;

        // 임시 데이터 - 실제로는 DB에서 조회
        const products = [
            {
                id: 1,
                title: '스타벅스 아메리카노',
                description: '따뜻한 아메리카노 한 잔으로 하루를 시작해보세요. 깊고 진한 에스프레소의 풍미를 느낄 수 있습니다.',
                price: 4500,
                price_display: '4,500원',
                image_url: null,
                is_active: true,
                created_at: new Date()
            },
            {
                id: 2,
                title: '투썸플레이스 케이크',
                description: '달콤한 생크림과 신선한 과일이 올라간 특별한 케이크입니다.',
                price: 25000,
                price_display: '25,000원',
                image_url: null,
                is_active: true,
                created_at: new Date()
            },
            {
                id: 3,
                title: '베이커리 세트',
                description: '갓 구운 빵과 페이스트리가 포함된 베이커리 세트입니다.',
                price: 15000,
                price_display: '15,000원',
                image_url: null,
                is_active: true,
                created_at: new Date()
            },
            {
                id: 4,
                title: 'CGV 영화 관람권',
                description: '최신 영화를 감상할 수 있는 CGV 영화 관람권입니다.',
                price: 12000,
                price_display: '12,000원',
                image_url: null,
                is_active: true,
                created_at: new Date()
            },
            {
                id: 5,
                title: '교보문고 도서상품권',
                description: '좋아하는 책을 구매할 수 있는 교보문고 도서상품권입니다.',
                price: 10000,
                price_display: '10,000원',
                image_url: null,
                is_active: true,
                created_at: new Date()
            },
            {
                id: 6,
                title: '올리브영 상품권',
                description: '화장품과 생활용품을 구매할 수 있는 올리브영 상품권입니다.',
                price: 20000,
                price_display: '20,000원',
                image_url: null,
                is_active: true,
                created_at: new Date()
            }
        ];

        const totalProducts = products.length;
        const paginatedProducts = products.slice(offset, offset + limit);

        res.json({
            success: true,
            data: {
                products: paginatedProducts,
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(totalProducts / limit),
                    total_items: totalProducts,
                    items_per_page: limit
                }
            }
        });
    } catch (error) {
        console.error('상품 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '상품 목록을 불러오는 중 오류가 발생했습니다.'
        });
    }
};

// 상품 상세 조회
const getProductById = async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        
        // 임시 데이터 - 실제로는 DB에서 조회
        const products = [
            {
                id: 1,
                title: '스타벅스 아메리카노',
                description: '따뜻한 아메리카노 한 잔으로 하루를 시작해보세요. 깊고 진한 에스프레소의 풍미를 느낄 수 있습니다.',
                price: 4500,
                price_display: '4,500원',
                image_url: null,
                is_active: true
            }
            // ... 다른 상품들
        ];

        const product = products.find(p => p.id === productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: '상품을 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('상품 상세 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '상품 정보를 불러오는 중 오류가 발생했습니다.'
        });
    }
};

// 상품 검색
const searchProducts = async (req, res) => {
    try {
        const searchQuery = req.params.query.toLowerCase();
        
        // 임시 데이터에서 검색 - 실제로는 DB 쿼리 사용
        const allProducts = [
            // ... 상품 데이터
        ];

        const filteredProducts = allProducts.filter(product => 
            product.title.toLowerCase().includes(searchQuery) ||
            product.description.toLowerCase().includes(searchQuery)
        );

        res.json({
            success: true,
            data: {
                products: filteredProducts,
                search_query: searchQuery,
                total_results: filteredProducts.length
            }
        });
    } catch (error) {
        console.error('상품 검색 오류:', error);
        res.status(500).json({
            success: false,
            message: '상품 검색 중 오류가 발생했습니다.'
        });
    }
};

// 조직도 데이터 조회
const getOrganization = async (req, res) => {
    try {
        // 실제로는 사용자 테이블에서 부서별로 조회
        const organizationData = [
            {
                name: "경영관리실",
                members: [
                    { id: 1, name: "김사장", position: "사장", email: "kim@company.com" },
                    { id: 2, name: "이부장", position: "부장", email: "lee@company.com" },
                    { id: 3, name: "박과장", position: "과장", email: "park@company.com" }
                ]
            },
            {
                name: "New Tech사업부",
                members: [
                    { id: 4, name: "최부장", position: "부장", email: "choi@company.com" },
                    { id: 5, name: "정과장", position: "과장", email: "jung@company.com" },
                    { id: 6, name: "한대리", position: "대리", email: "han@company.com" },
                    { id: 7, name: "윤사원", position: "사원", email: "yoon@company.com" }
                ]
            },
            {
                name: "솔루션사업부",
                members: [
                    { id: 8, name: "강부장", position: "부장", email: "kang@company.com" },
                    { id: 9, name: "송과장", position: "과장", email: "song@company.com" },
                    { id: 10, name: "구대리", position: "대리", email: "gu@company.com" }
                ]
            },
            {
                name: "Innovation Center",
                members: [
                    { id: 11, name: "임팀장", position: "팀장", email: "lim@company.com" },
                    { id: 12, name: "오과장", position: "과장", email: "oh@company.com" },
                    { id: 13, name: "신대리", position: "대리", email: "shin@company.com" },
                    { id: 14, name: "문사원", position: "사원", email: "moon@company.com" }
                ]
            }
        ];

        res.json({
            success: true,
            data: organizationData
        });
    } catch (error) {
        console.error('조직도 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '조직도 정보를 불러오는 중 오류가 발생했습니다.'
        });
    }
};

// 선물 발송
const sendGift = async (req, res) => {
    try {
        const { product_id, recipients, message } = req.body;
        const sender_id = req.user.id; // 인증 미들웨어에서 제공

        if (!product_id || !recipients || recipients.length === 0) {
            return res.status(400).json({
                success: false,
                message: '상품과 받는 사람을 선택해주세요.'
            });
        }

        // 실제로는 다음과 같은 처리를 합니다:
        // 1. 상품 정보 확인
        // 2. 받는 사람 정보 확인
        // 3. 선물 발송 기록 저장
        // 4. 알림 발송 (이메일, 푸시 등)

        const giftRecord = {
            id: Date.now(), // 실제로는 DB에서 생성된 ID
            sender_id: sender_id,
            product_id: product_id,
            recipients: recipients,
            message: message || '',
            sent_at: new Date(),
            status: 'sent'
        };

        console.log('선물 발송 기록:', giftRecord);

        res.json({
            success: true,
            message: `${recipients.length}명에게 선물을 성공적으로 보냈습니다.`,
            data: {
                gift_id: giftRecord.id,
                recipients_count: recipients.length
            }
        });
    } catch (error) {
        console.error('선물 발송 오류:', error);
        res.status(500).json({
            success: false,
            message: '선물 발송 중 오류가 발생했습니다.'
        });
    }
};

// 외부 API를 통한 선물 발송
const sendGiftExternal = async (req, res) => {
    try {
        const { goods_code, users } = req.body;

        if (!goods_code || !users || users.length === 0) {
            return res.status(400).json({
                success: false,
                message: '상품과 받는 사람을 선택해주세요.'
            });
        }

        const requestBody = {
            goods_code: goods_code,
            users: users
        };

        console.log('🎁 외부 선물 보내기 API 호출:', requestBody);

        // 외부 API 호출 시도 (HTTP)
        let response;
        try {
            response = await fetch('http://211.43.205.49:9999/send_gift', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        } catch (fetchError) {
            console.error('외부 API 호출 실패:', fetchError);
            
            // HTTPS로 재시도
            try {
                response = await fetch('https://211.43.205.49:9999/send_gift', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
            } catch (httpsError) {
                console.error('HTTPS 호출도 실패:', httpsError);
                return res.status(500).json({
                    success: false,
                    message: '외부 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
                });
            }
        }

        const result = await response.json();
        console.log('외부 API 응답:', result);

        if (response.status === 200) {
            if (result.detail === null) {
                // 성공 시 로그 기록 (실제로는 DB에 저장)
                console.log('선물 발송 성공:', {
                    goods_code,
                    users_count: users.length,
                    timestamp: new Date()
                });

                res.json({
                    success: true,
                    message: `${users.length}명에게 선물을 성공적으로 보냈습니다.`,
                    data: {
                        goods_code,
                        recipients_count: users.length,
                        sent_at: new Date()
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: '선물 발송 실패: ' + result.detail
                });
            }
        } else {
            res.status(response.status).json({
                success: false,
                message: '선물 발송 실패: ' + (result.detail || '알 수 없는 오류')
            });
        }
    } catch (error) {
        console.error('선물 발송 처리 오류:', error);
        res.status(500).json({
            success: false,
            message: '선물 발송 중 오류가 발생했습니다.'
        });
    }
};

// 선물 발송 내역 조회
const getGiftHistory = async (req, res) => {
    try {
        const sender_id = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // 실제로는 DB에서 조회
        const giftHistory = [
            {
                id: 1,
                product_title: '스타벅스 아메리카노',
                recipients_count: 3,
                sent_at: new Date(),
                status: 'sent'
            }
        ];

        res.json({
            success: true,
            data: {
                history: giftHistory,
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(giftHistory.length / limit),
                    total_items: giftHistory.length
                }
            }
        });
    } catch (error) {
        console.error('선물 발송 내역 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '선물 발송 내역을 불러오는 중 오류가 발생했습니다.'
        });
    }
};

// 받은 선물 조회
const getReceivedGifts = async (req, res) => {
    try {
        const recipient_id = req.user.id;
        
        // 실제로는 DB에서 조회
        const receivedGifts = [
            {
                id: 1,
                product_title: '스타벅스 아메리카노',
                sender_name: '김사장',
                message: '수고하셨습니다!',
                received_at: new Date(),
                status: 'received'
            }
        ];

        res.json({
            success: true,
            data: receivedGifts
        });
    } catch (error) {
        console.error('받은 선물 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '받은 선물을 불러오는 중 오류가 발생했습니다.'
        });
    }
};

module.exports = {
    getProducts,
    getProductById,
    searchProducts,
    getOrganization,
    sendGift,
    sendGiftExternal,
    getGiftHistory,
    getReceivedGifts
}; 