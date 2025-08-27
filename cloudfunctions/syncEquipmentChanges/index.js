// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init();
const db = cloud.database();
const _ = db.command;

// 仅允许更新客户端可修改的字段，排除系统字段
const allowedFields = ['name', 'status', 'spec', 'description']; // 根据实际业务定义
const updateData = allowedFields.reduce((data, field) => {
  if (item[field] !== undefined) data[field] = item[field];
  return data;
}, {});
updateData.updateTime = new Date().toISOString(); // 系统控制更新时间


// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { updates = [], deletes = [] } = event;
    const wxContext = cloud.getWXContext();
    
    // 处理更新
    if (updates.length > 0) {
      for (const item of updates) {
        // 检查是否已存在
        const existing = await db.collection('equipment')
          .where({
            _openid: wxContext.OPENID,
            id: item.id
          })
          .get();
        
        if (existing.data.length > 0) {
          // 更新现有记录
          await db.collection('equipment')
            .where({
              _openid: wxContext.OPENID,
              id: item.id
            })
            .update({
              data: {
                ...item,
                updateTime: new Date().toISOString()
              }
            });
        } else {
          // 添加新记录
          await db.collection('equipment').add({
            data: {
              ...item,
              _openid: wxContext.OPENID,
              createTime: item.createTime || new Date().toISOString(),
              updateTime: new Date().toISOString()
            }
          });
        }
      }
    }
    
    // 处理删除
    if (deletes.length > 0) {
      await db.collection('equipment')
        .where({
          _openid: wxContext.OPENID,
          id: _.in(deletes)
        })
        .remove();
    }
    
    return {
      success: true,
      updatedCount: updates.length,
      deletedCount: deletes.length,
      message: '变更已同步到云端'
    };
  } catch (err) {
    console.error('同步变更失败:', err);
    return { success: false, message: err.message };
  }
};
    