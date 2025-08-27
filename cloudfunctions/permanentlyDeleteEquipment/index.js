// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init();
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { id } = event;
    const wxContext = cloud.getWXContext();
    
    if (!id) {
      return { success: false, message: '缺少器材ID' };
    }
    
    // 从equipment集合中永久删除
    await db.collection('equipment')
      .where({
        _openid: wxContext.OPENID,
        id: id,
        isDeleted: true // 新增：仅删除已标记为删除的设备
      })
      .remove();
    
    return {
      success: true,
      message: '器材已永久删除',
      deletedId: id
    };
  } catch (err) {
    console.error('永久删除失败:', err);
    return { success: false, message: err.message };
  }
};
    