// cloudfunctions/equipmentManager/index.js
const cloud = require('wx-server-sdk');
cloud.init({
  traceUser: true,
  env: "cloudbase-5gx4izq3da5eda5e"  // 与app.js保持一致的环境ID
});
// 重新获取数据库实例（确保初始化完成后再获取）
const db = cloud.database({
  throwOnNotFound: false // 避免因查询不到数据抛出异常
});
const _ = db.command;

// 缓存机制，减轻服务器压力
const cache = {
  pullResults: {},
  cacheDuration: 5000 // 缓存5秒
};

exports.main = async (event, context) => {
  const { action, ...params } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 增加操作日志，便于调试
  console.log(`[云函数] 收到操作请求: ${action}`, {
    openid,
    params,
    timestamp: new Date().toISOString()
  });

  try {
    switch (action) {
      case 'add':
        return await handleAdd(params, openid);
      case 'sync':
        return await handleSync(params, openid);
      case 'pull':
        return await handlePull(params, openid);
      case 'push':
        return await handlePush(params, openid);
      case 'check':
        return { success: true, message: '函数存在', action: 'check' };
      case 'get':
        return await handleGet(params);
      case 'delete':
        return await handleDelete(params, openid);
      case 'checkIfPermanentlyDeleted':
        return await checkIfPermanentlyDeleted(params);
      default:
        return { 
          success: false, 
          message: `未知操作: ${action}`,
          receivedAction: action,
          availableActions: ['add', 'sync', 'pull', 'push', 'check', 'get', 'delete', 'checkIfPermanentlyDeleted']
        };
    }
  } catch (err) {
    console.error('操作失败', err);
    return { 
      success: false, 
      message: err.message || '操作失败',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };
  }
};

async function handleAdd(equipment, openid) {
  if (!equipment.name || !equipment.type) {
    return { success: false, message: '设备名称和类型为必填项' };
  }

  // 不使用_openid进行隔离，但保留创建者信息
  const newEquipment = {
    ...equipment,
    creatorOpenid: openid, // 仅记录创建者，不用于数据隔离
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString(),
    isSynced: true,
    isDeleted: false,
    id: equipment.id || `eq_${Date.now()}_${Math.floor(Math.random() * 1000)}`
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

  // 清除缓存，确保新增数据能被立即拉取
  clearCache();
  
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

    // 移除_openid隔离，使用creatorOpenid记录创建者
    const syncData = {
      ...filteredItem,
      creatorOpenid: item.creatorOpenid || openid,
      updateTime: currentTime,
      isSynced: true
    };

    if (item.id) {
      batch.update({
        collection: 'equipment',
        where: { id: item.id }, // 不限制_openid，允许跨用户更新
        data: syncData
      });
    } else {
      batch.add({
        collection: 'equipment',
        data: { ...syncData, createTime: currentTime, id: `eq_${Date.now()}_${Math.floor(Math.random() * 1000)}` }
      });
    }
  }

  for (const id of deletes) {
    batch.update({
      collection: 'equipment',
      where: { id }, // 不限制_openid
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
        operatorOpenid: openid, // 记录操作人而非限制
        isPermanent: false
      }
    });
  }

  for (const id of permanentDeletes) {
    batch.remove({
      collection: 'equipment',
      where: { id } // 不限制_openid
    });

    batch.add({
      collection: 'equipmentDeleted',
      data: {
        id,
        deleteTime: currentTime,
        operatorOpenid: openid,
        isPermanent: true
      }
    });
  }

  const commitResult = await batch.commit();
  
  // 清除缓存
  clearCache();
  
  return { 
    success: true, 
    updatedCount: updates.length, 
    deletedCount: deletes.length + permanentDeletes.length,
    batchResult: commitResult.stats
  };
}

async function handlePull({ lastSyncTime }, openid) {
  // 检查缓存
  const cacheKey = `pull_${lastSyncTime}`;
  const now = Date.now();
  if (cache.pullResults[cacheKey] && now - cache.pullResults[cacheKey].timestamp < cache.cacheDuration) {
    console.log(`[Pull] 使用缓存数据: ${cacheKey}`);
    return cache.pullResults[cacheKey].data;
  }

  // 确保lastSyncTime有效
  const effectiveTime = lastSyncTime && typeof lastSyncTime === 'string' 
    ? lastSyncTime 
    : '1970-01-01T00:00:00.000Z';
  
  // 1. 查询更新的数据 - 取消_openid限制，获取所有用户的更新
  const updateResult = await db.collection('equipment')
    .where({
      updateTime: _.gt(effectiveTime),
      isDeleted: _.neq(true) // 排除已删除的
    })
    .get();

  console.log(`[Pull] 找到 ${updateResult.data.length} 条更新数据`, {
    effectiveTime,
    updateCount: updateResult.data.length
  });

  // 2. 查询删除的数据 - 取消_openid限制
  const deleteResult = await db.collection('equipmentDeleted')
    .where({
      deleteTime: _.gt(effectiveTime)
    })
    .get();

  // 3. 提取所有删除的ID
  const deleteIds = deleteResult.data.map(item => item.id);

  // 缓存结果
  const result = { 
    success: true, 
    updates: updateResult.data,
    deletes: deleteIds,
    lastSyncTime: new Date().toISOString(),
    debugInfo: {
      effectiveTime,
      updateCount: updateResult.data.length,
      deleteCount: deleteIds.length
    }
  };
  
  cache.pullResults[cacheKey] = {
    timestamp: now,
    data: result
  };

  return result;
}

async function handlePush({ changes }, openid) {
  if (!changes || !Array.isArray(changes)) {
    return { success: false, message: '变更数据必须为数组' };
  }

  // 限制批量处理大小，减轻服务器压力
  const MAX_BATCH_SIZE = 50;
  if (changes.length > MAX_BATCH_SIZE) {
    return { 
      success: false, 
      message: `单次同步不能超过${MAX_BATCH_SIZE}条数据，请分批处理`,
      code: 'OVER_SIZE_LIMIT'
    };
  }

  const batch = db.batch();
  const currentTime = new Date().toISOString();
  const processedIds = [];

  for (const change of changes) {
    // 验证变更格式
    if (!change.type || !['add', 'update', 'delete'].includes(change.type)) {
      console.warn(`[Push] 跳过无效变更: ${JSON.stringify(change)}`);
      continue;
    }
    
    // 防止重复处理
    if (processedIds.includes(change.id)) {
      console.warn(`[Push] 跳过重复ID: ${change.id}`);
      continue;
    }
    processedIds.push(change.id);

    switch (change.type) {
      case 'add':
        // 确保新增数据包含必要字段
        if (!change.data || !change.data.name) {
          console.warn(`[Push] 跳过无效新增数据: ${JSON.stringify(change)}`);
          break;
        }
        batch.add({
          collection: 'equipment',
          data: {
            ...change.data,
            creatorOpenid: openid, // 记录创建者，不用于隔离
            createTime: currentTime,
            updateTime: currentTime,
            isSynced: true,
            isDeleted: false
          }
        });
        break;
        
      case 'update':
        if (change.data && change.data.id) {
          batch.update({
            collection: 'equipment',
            where: { id: change.data.id }, // 不限制_openid
            data: {
              ...change.data,
              updateTime: currentTime,
              isSynced: true
            }
          });
        } else {
          console.warn(`[Push] 跳过无效更新数据: ${JSON.stringify(change)}`);
        }
        break;
        
      case 'delete':
        if (change.id) {
          batch.update({
            collection: 'equipment',
            where: { id: change.id }, // 不限制_openid
            data: {
              isDeleted: true,
              updateTime: currentTime,
              isSynced: true
            }
          });
          
          // 记录删除日志
          batch.add({
            collection: 'equipmentDeleted',
            data: {
              id: change.id,
              deleteTime: currentTime,
              operatorOpenid: openid, // 记录操作人
              isPermanent: false
            }
          });
        } else {
          console.warn(`[Push] 跳过无效删除数据: ${JSON.stringify(change)}`);
        }
        break;
    }
  }

  const result = await batch.commit();
  
  // 清除缓存
  clearCache();
  
  return {
    success: true,
    message: `处理了 ${processedIds.length} 条有效变更`,
    affectedCount: result.stats.updated + result.stats.created + result.stats.removed,
    stats: result.stats
  };
}

// 新增：查询设备
async function handleGet({ id, all = false }) {
  if (id) {
    const result = await db.collection('equipment').where({ id }).get();
    return {
      success: true,
      data: result.data[0] || null
    };
  } else if (all) {
    const result = await db.collection('equipment').where({ isDeleted: _.neq(true) }).get();
    return {
      success: true,
      data: result.data
    };
  }
  return { success: false, message: '请提供设备ID或指定all=true' };
}

// 新增：删除设备
async function handleDelete({ id, permanent = false }, openid) {
  if (!id) {
    return { success: false, message: '设备ID不能为空' };
  }

  const batch = db.batch();
  const currentTime = new Date().toISOString();

  if (permanent) {
    // 永久删除
    batch.remove({
      collection: 'equipment',
      where: { id }
    });
  } else {
    // 标记删除
    batch.update({
      collection: 'equipment',
      where: { id },
      data: {
        isDeleted: true,
        status: '已删除',
        updateTime: currentTime
      }
    });
  }

  // 记录删除日志
  batch.add({
    collection: 'equipmentDeleted',
    data: {
      id,
      deleteTime: currentTime,
      operatorOpenid: openid,
      isPermanent: permanent
    }
  });

  const result = await batch.commit();
  
  clearCache();
  
  return {
    success: true,
    message: permanent ? '设备已永久删除' : '设备已标记删除',
    result
  };
}

// 新增：检查设备是否被永久删除
async function checkIfPermanentlyDeleted({ id }) {
  if (!id) {
    return { success: false, message: '设备ID不能为空' };
  }
  
  const result = await db.collection('equipmentDeleted')
    .where({ id, isPermanent: true })
    .get();
    
  return { 
    success: true, 
    isPermanentlyDeleted: result.data.length > 0 
  };
}

// 清除缓存的辅助函数
function clearCache() {
  cache.pullResults = {};
  console.log('[Cache] 已清除所有缓存');
}
