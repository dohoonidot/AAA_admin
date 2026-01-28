const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');

// 인증 미들웨어 제거
router.get('/', DashboardController.getDashboardData);
router.get('/messages', DashboardController.getTotalMessages);
router.get('/categories', DashboardController.getCategoryQuestions);
router.get('/user-chats', DashboardController.getUserChatCount);
router.get('/age-groups', DashboardController.getAgeGroupUsage);
router.get('/age-groups/average', DashboardController.getAgeGroupAverageUsageData);
router.get('/age-groups/rate', DashboardController.getAgeGroupUsageRateData);

module.exports = router;
