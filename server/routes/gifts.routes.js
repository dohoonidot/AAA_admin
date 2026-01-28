const express = require('express');
const router = express.Router();
const giftsController = require('../controllers/gifts.controller');
const organizationController = require('../controllers/organization.controller');
const { authenticateToken } = require('../middleware/auth');

// 상품 목록 조회
router.get('/products', giftsController.getProducts);

// 상품 상세 조회
router.get('/products/:id', giftsController.getProductById);

// 상품 검색
router.get('/products/search/:query', giftsController.searchProducts);

// 조직도 데이터 조회
router.get('/organization', giftsController.getOrganization);

// 새로운 조직도 트리 데이터 조회
router.get('/organization-tree', organizationController.getOrganizationTree);

// 선물 발송 (내부)
router.post('/send', giftsController.sendGift);

// 선물 발송 (외부 API 연동)
router.post('/send-external', giftsController.sendGiftExternal);

// 선물 발송 내역 조회
router.get('/history', giftsController.getGiftHistory);

// 받은 선물 조회
router.get('/received', giftsController.getReceivedGifts);

module.exports = router; 