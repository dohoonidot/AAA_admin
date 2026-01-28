const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversation.controller');

// 대화 목록 조회
router.get('/', conversationController.getConversations);

// 대화 상세 조회
router.get('/:id', conversationController.getConversationById);

// 대화 내역 조회
router.get('/:id/messages/:archiveId', conversationController.getConversationMessages);

module.exports = router;
