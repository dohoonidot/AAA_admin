const jwt = require('jsonwebtoken');

// JWT 비밀키 가져오기
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 인증 미들웨어를 항상 통과시키는 더미로 변경
const authenticateToken = (req, res, next) => {
  next();
};

module.exports = {
  authenticateToken
}; 