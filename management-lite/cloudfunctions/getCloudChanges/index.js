// 云函数入口文件
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { lastSyncTime } = event;
    const wxContext = cloud.getWXContext();

    // 查询更新的数据
    let updateQuery = db.collection('equipment')
      .where({ _openid: wxContext.OPENID });

    // 如果有上次同步时间，只查询更新的数据
    if (lastSyncTime) {
      updateQuery = updateQuery.where({
        updateTime: db.command.gt(lastSyncTime),
        isDeleted: false
      });
    } else {
      updateQuery = updateQuery.where({ isDeleted: false });
    }

    const updatesRes = await updateQuery.get();

    // 查询删除的数据
    let deleteQuery = db.collection('equipment')
      .where({ _openid: wxContext.OPENID, isDeleted: true });

    if (lastSyncTime) {
      deleteQuery = deleteQuery.where({ deleteTime: db.command.gt(lastSyncTime) });
    }

    const deletesRes = await deleteQuery.get();
    const deletes = deletesRes.data.map(item => item.id);

    return {
      success: true,
      updates: updatesRes.data,
      deletes: deletes
    };
  } catch (err) {
    console.error('getCloudChanges 错误:', err);
    return { success: false, message: err.message };
  }
};