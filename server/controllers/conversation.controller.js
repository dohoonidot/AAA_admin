const ConversationModel = require('../models/conversation.model');

// 대화 목록 조회
const getConversations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    
    // 권한 정보 가져오기
    const adminRole = req.headers['x-admin-role'] || '0';
    const userId = req.headers['x-user-id'];
    
    console.log('대화 목록 조회 - 권한:', adminRole, '사용자:', userId);
    
    // 필터 처리
    const filters = {
      userName: req.query.userName,
      department: req.query.department,
      category: req.query.category,
      is_deleted: req.query.is_deleted || 'false',
      adminRole: adminRole,
      userId: userId
    };
    
    const data = await ConversationModel.getConversations(page, limit, filters);
    res.json(data);
  } catch (error) {
    console.error('대화 목록 조회 중 오류:', error);
    res.status(500).json({ message: '대화 목록을 불러오는 중 오류가 발생했습니다.' });
  }
};

// 대화 상세 조회
const getConversationById = async (req, res) => {
  try {
    const id = req.params.id;
    
    // 권한 정보 가져오기
    const adminRole = req.headers['x-admin-role'] || '0';
    const userId = req.headers['x-user-id'];
    
    console.log('대화 상세 조회 - 권한:', adminRole, '사용자:', userId, '대화ID:', id);
    
    const conversation = await ConversationModel.getConversationById(id, adminRole, userId);
    
    if (!conversation) {
      return res.status(404).json({ message: '대화를 찾을 수 없습니다.' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('대화 상세 조회 중 오류:', error);
    res.status(500).json({ message: '대화 상세 정보를 불러오는 중 오류가 발생했습니다.' });
  }
};

// 대화 내역 조회
const getConversationMessages = async (req, res) => {
  try {
    const archiveId = req.params.archiveId;
    // 삭제된 대화 표시 여부 (쿼리 파라미터에서 가져옴, 기본값은 false)
    const showDeleted = req.query.show_deleted === 'true';
    
    // 권한 정보 가져오기
    const adminRole = req.headers['x-admin-role'] || '0';
    const userId = req.headers['x-user-id'];
    
    console.log('대화 내역 조회 - 권한:', adminRole, '사용자:', userId, 'archiveId:', archiveId);
    
    if (!archiveId) {
      return res.status(400).json({ message: 'archive_id가 필요합니다.' });
    }
    
    // showDeleted 파라미터와 권한 정보 전달
    const messages = await ConversationModel.getConversationMessages(archiveId, showDeleted, adminRole, userId);
    res.json({ messages });
  } catch (error) {
    console.error('대화 내역 조회 중 오류:', error);
    res.status(500).json({ message: '대화 내역을 불러오는 중 오류가 발생했습니다.' });
  }
};

module.exports = {
  getConversations,
  getConversationById,
  getConversationMessages
};
