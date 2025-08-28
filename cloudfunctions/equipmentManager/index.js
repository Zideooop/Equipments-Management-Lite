// cloudfunctions/equipmentManager/index.js
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database(); // 修正数据库实例获取方式
const _ = db.command;

exports.main = async (event, context) => {
  const { action, ...params } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    switch (action) {
      case 'add':
        return await handleAdd(params, openid);
      case 'sync':
        return await handleSync(params, openid);
      case 'pull':
        return await handlePull(params, openid);
      default:
        return { success: false, message: '未知操作' };
    }
  } catch (err) {
    console.error('操作失败', err);
    return { success: false, message: err.message || '操作失败' };
  }
};

async function handleAdd(equipment, openid) {
  if (!equipment.name || !equipment.type) {
    return { success: false, message: '设备名称和类型为必填项' };
  }

  const newEquipment = {
    ...equipment,
    _openid: openid,
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString(),
    isSynced: true,
    isDeleted: false
  };

  const res = await db.collection('equipment').add({ data: newEquipment });
  
  await db.collection('operationLogs').add({
    data: {
      type: 'add',
      equipmentId: res._id,
      operator: openid,
      time: new Date().toISOString()
    }
  });

  return { 
    success: true, 
    data: { ...newEquipment, _id: res._id },
    message: '设备新增成功'
  };
}

async function handleSync({ updates = [], deletes = [], permanentDeletes = [] }, openid) {
  const allowedFields = ['id', 'name', 'type', 'specification', 'model', 'quantity', 
                        'location', 'status', 'remarks', 'createTime', 'addTime', 
                        'updateTime', 'isDeleted'];
  
  const batch = db.batch();
  const currentTime = new Date().toISOString();

  for (const item of updates) {
    const filteredItem = Object.keys(item).reduce((acc, key) => {
      if (allowedFields.includes(key)) acc[key] = item[key];
      return acc;
    }, {});

    const syncData = {
      ...filteredItem,
      _openid: openid,
      updateTime: currentTime,
      isSynced: true
    };

    if (item.id) {
      batch.update({
        collection: 'equipment',
        where: { id: item.id, _openid: openid },
        data: syncData
      });
    } else {
      batch.add({
        collection: 'equipment',
        data: { ...syncData, createTime: currentTime }
      });
    }
  }

  for (const id of deletes) {
    batch.update({
      collection: 'equipment',
      where: { id, _openid: openid },
      data: {
        isDeleted: true,
        status: '已删除',
        updateTime: currentTime,
        isSynced: true
      }
    });

    batch.add({
      collection: 'equipmentDeleted',
      data: {
        id,
        deleteTime: currentTime,
        _openid: openid,
        isPermanent: false
      }
    });
  }

  for (const id of permanentDeletes) {
    batch.remove({
      collection: 'equipment',
      where: { id, _openid: openid }
    });

    batch.add({
      collection: 'equipmentDeleted',
      data: {
        id,
        deleteTime: currentTime,
        _openid: openid,
        isPermanent: true
      }
    });
  }

  const commitResult = await batch.commit();

  return { 
    success: true, 
    updatedCount: updates.length, 
    deletedCount: deletes.length + permanentDeletes.length,
    batchResult: commitResult.stats
  };
}

// 已修复updates未定义问题
async function handlePull({ lastSyncTime }, openid) {
  // 1. 查询更新的数据
  const updateResult = await db.collection('equipment')
    .where({
      _openid: openid,
      isDeleted: _.neq(true),
      updateTime: lastSyncTime ? _.gt(lastSyncTime) : _.exists(true)
    })
    .get();

  // 2. 查询删除的数据
  const deleteResult = await db.collection('equipmentDeleted')
    .where({
      _openid: openid,
      deleteTime: lastSyncTime ? _.gt(lastSyncTime) : _.exists(true)
    })
    .get();

  // 3. 提取永久删除的ID
  const deleteIds = deleteResult.data
    .filter(item => item.isPermanent)
    .map(item => item.id);

  // 4. 返回结果（使用updateResult.data作为updates的值）
  return { 
    success: true, 
    updates: updateResult.data,  // 这里是关键修复
    deletes: deleteIds,
    lastSyncTime: new Date().toISOString()
  };
}
    