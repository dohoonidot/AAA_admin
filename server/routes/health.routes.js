const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// 데이터베이스 연결 상태 확인 API
router.get('/db', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    res.status(200).json({
      status: 'success',
      message: 'DB 연결 성공',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'DB 연결 실패',
      error: error.message
    });
  }
});

// 기본 서버 상태 확인 API
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: '서버가 정상적으로 실행 중입니다.',
    timestamp: new Date()
  });
});

module.exports = router; 