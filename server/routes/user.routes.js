const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 인증 미들웨어 제거

// 사용자 목록 조회 - GET /api/users
router.get('/', userController.getUsers);

// 특정 사용자 조회 - GET /api/users/:id
router.get('/:id', userController.getUserById);

// 아래 라우트는 Fiber API로 처리하므로 제거
// router.post('/', userController.createUser);
// router.put('/:id', userController.updateUser);
// router.delete('/:id', userController.deleteUser);

module.exports = router;
