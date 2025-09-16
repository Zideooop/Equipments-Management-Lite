// 同步管理器 - 处理数据同步逻辑
const APP = getApp();
const { CONFIG } = APP;

// 工具类 - 封装通用操作
class SyncUtils {
  // 确保全局事件总线存在
  static ensureGlobalEvent() {
    if (!APP.globalEvent) {
      APP.globalEvent = {
        events: {},
        on(name, callback) {
          if (!this.events[name]) this.events[name] = [];
          this.events[name].push(callback);
        },
        emit(name, data) {
          if (this.events[name]) {
            this.events[name].forEach(callback => callback(data));
          }
        }
      };
    }
    return APP.globalEvent;
  }

  // 安全的存储操作
  static safeStorageOperation(operation, key, data) {
    try {
      switch (operation) {
        case 'get':
          return APP.utils.safeArray(wx.getStorageSync(key));
        case 'set':
          return wx.setStorageSync(key, APP.utils.safeArray(data));
        case 'clear':
          return wx.setStorageSync(key, []);
        default:
          throw new Error('不支持的存储操作');
      }
    } catch (error) {
      console.error(`存储操作失败 [${operation}:${key}]`, error);
      wx.clearStorageSync(key);
      return operation === 'get' ? [] : null;
    }
  }

  // 格式化时间戳
  static formatTimestamp() {
    return new Date().toISOString();
  }
}

// 核心同步管理器类
class SyncManager {
  constructor() {
    // 状态管理
    this.status = CONFIG.SYNC_STATUSES.IDLE;
    this.error = null;
    this.cloudFunctionAvailable = null;
    
    // 初始化
    this.init();
  }

  // 初始化操作
  init() {
    // 确保本地存储初始化
    SyncUtils.safeStorageOperation('get', CONFIG.STORAGE_KEYS.LOCAL_CHANGES);
    // 确保事件总线初始化
    SyncUtils.ensureGlobalEvent();
  }

  // 事件通知
  notify(event, data) {
    const eventBus = SyncUtils.ensureGlobalEvent();
    eventBus.emit(event, {
      ...data,
      status: this.status,
      timestamp: SyncUtils.formatTimestamp()
    });
  }

  // 检查云函数可用性
  async checkCloudFunction() {
    if (this.cloudFunctionAvailable !== null) return this.cloudFunctionAvailable;
    
    try {
      const result = await wx.cloud.callFunction({
        name: CONFIG.CLOUD_FUNCTION,
        data: { action: 'check' },
        timeout: 3000
      });
      
      this.cloudFunctionAvailable = result?.result?.success === true;
      return this.cloudFunctionAvailable;
    } catch (error) {
      console.error('云函数检查失败', error);
      this.cloudFunctionAvailable = false;
      return false;
    }
  }

  // 获取本地变更记录
  getLocalChanges() {
    return SyncUtils.safeStorageOperation('get', CONFIG.STORAGE_KEYS.LOCAL_CHANGES);
  }

  // 保存本地变更
  saveLocalChanges(changes) {
    // 过滤并去重有效变更
    const validChanges = APP.utils.safeArray(changes)
      .filter(change => 
        change && change.id && CONFIG.CHANGE_TYPES.includes(change.type)
      )
      .reduce((acc, current) => {
        // 去重逻辑：保留最新的同ID同类型变更
        const existingIndex = APP.utils.safeArray(acc).findIndex(
          item => item.id === current.id && item.type === current.type
        );
        if (existingIndex > -1) {
          acc[existingIndex] = current;
        } else {
          acc.push(current);
        }
        return acc;
      }, []);
      
    SyncUtils.safeStorageOperation('set', CONFIG.STORAGE_KEYS.LOCAL_CHANGES, validChanges);
    return validChanges;
  }

  // 标记数据变更
  markDataChanged(change) {
    if (!change || !change.id || !change.type) {
      console.error('无效的变更记录', change);
      return false;
    }

    const changes = this.getLocalChanges();
    changes.push({
      ...change,
      timestamp: SyncUtils.formatTimestamp()
    });
    
    this.saveLocalChanges(changes);
    this.notify('dataChanged', { changeCount: changes.length });
    return true;
  }

  // 移除已同步的变更
  removeSyncedChanges(syncedIds) {
    const changes = this.getLocalChanges();
    const remaining = APP.utils.safeArray(changes).filter(change => !syncedIds.includes(change.id));
    this.saveLocalChanges(remaining);
    return remaining;
  }

  // 更新最后同步时间
  updateLastSyncTime() {
    const now = SyncUtils.formatTimestamp();
    SyncUtils.safeStorageOperation('set', CONFIG.STORAGE_KEYS.LAST_SYNC_TIME, now);
    if (APP.globalData) {
      APP.globalData.lastSyncTime = now;
    }
    return now;
  }

  // 拉取云端变更
  async pullCloudChanges() {
    try {
      const lastSyncTime = SyncUtils.safeStorageOperation('get', CONFIG.STORAGE_KEYS.LAST_SYNC_TIME) || 
                          '1970-01-01T00:00:00.000Z';
      
      const result = await wx.cloud.callFunction({
        name: CONFIG.CLOUD_FUNCTION,
        data: {
          action: 'pull',
          lastSyncTime
        },
        timeout: 15000
      });

      if (!result?.result?.success) {
        throw new Error(`拉取失败: ${result?.result?.message || '未知错误'}`);
      }

      // 处理云端变更
      await this.handleCloudChanges(result.result);
      this.updateLastSyncTime();
      
      return {
        success: true,
        updatedCount: result.result.updates?.length || 0,
        deletedCount: result.result.deletes?.length || 0
      };
    } catch (error) {
      console.error('拉取云端变更失败', error);
      throw error;
    }
  }

  // 处理云端变更数据（修复：同步后通知页面更新）
  async handleCloudChanges(cloudData) {
    if (!cloudData || (!cloudData.updates?.length && !cloudData.deletes?.length)) {
      return;
    }

    // 确保设备列表存在且为数组
    if (!APP.globalData.equipmentList || !Array.isArray(APP.globalData.equipmentList)) {
      APP.globalData.equipmentList = [];
    }

    let equipmentList = [...APP.globalData.equipmentList];

    // 处理更新
    if (cloudData.updates?.length) {
      APP.utils.safeArray(cloudData.updates).forEach(cloudItem => {
        const index = APP.utils.safeArray(equipmentList).findIndex(item => item.id === cloudItem.id);
        if (index > -1) {
          equipmentList[index] = { ...equipmentList[index], ...cloudItem, isSynced: true };
        } else {
          equipmentList.push({ ...cloudItem, isSynced: true });
        }
      });
    }

    // 处理删除
    if (cloudData.deletes?.length) {
      equipmentList = APP.utils.safeArray(equipmentList).filter(item => !cloudData.deletes.includes(item.id));
    }

    // 保存更新后的列表
    APP.globalData.equipmentList = equipmentList;
    if (APP.saveEquipmentList) {
      APP.saveEquipmentList(equipmentList);
    } else {
      wx.setStorageSync('equipmentList', equipmentList);
    }

    // 通知页面设备列表已更新
    this.notify('equipmentUpdated', { 
      updatedCount: cloudData.updates?.length || 0,
      deletedCount: cloudData.deletes?.length || 0,
      data: equipmentList
    });

    // 同步操作日志（如果有）
    if (cloudData.operationLogs?.length) {
      const existingLogs = APP.globalData.activityLog || [];
      // 合并日志并去重
      const mergedLogs = Array.from(new Map([
        ...APP.utils.safeArray(existingLogs).map(log => [log.id, log]),
        ...APP.utils.safeArray(cloudData.operationLogs).map(log => [log.id, log])
      ]).values());
      // 按时间排序
      mergedLogs.sort((a, b) => new Date(b.time) - new Date(a.time));
      // 保存到全局和存储
      APP.globalData.activityLog = mergedLogs;
      wx.setStorageSync('operationLogs', mergedLogs);
      // 通知页面日志已更新
      this.notify('operationLogsUpdated', {
        logCount: mergedLogs.length
      });
    }
  }

  // 推送本地变更
  async pushLocalChanges() {
    const localChanges = this.getLocalChanges();
    if (APP.utils.safeArray(localChanges).length === 0) {
      return { success: true, message: '无待同步数据' };
    }

    try {
      let syncedCount = 0;
      const totalBatches = Math.ceil(APP.utils.safeArray(localChanges).length / CONFIG.MAX_BATCH_SIZE);
      
      // 分批处理
      for (let i = 0; i < totalBatches; i++) {
        const start = i * CONFIG.MAX_BATCH_SIZE;
        const end = start + CONFIG.MAX_BATCH_SIZE;
        const batch = APP.utils.safeArray(localChanges).slice(start, end);
        
        const result = await wx.cloud.callFunction({
          name: CONFIG.CLOUD_FUNCTION,
          data: {
            action: 'push',
            changes: batch
          },
          timeout: 15000
        });

        if (!result?.result?.success) {
          throw new Error(`第 ${i+1}/${totalBatches} 批推送失败: ${result?.result?.message || '未知错误'}`);
        }

        // 记录已同步的ID
        const syncedIds = APP.utils.safeArray(batch).map(change => change.id);
        this.removeSyncedChanges(syncedIds);
        syncedCount += syncedIds.length;
        
        // 发送批次同步进度
        this.notify('syncProgress', {
          batch: i + 1,
          totalBatches,
          syncedCount,
          total: localChanges.length
        });
      }

      return {
        success: true,
        syncedCount,
        totalCount: localChanges.length
      };
    } catch (error) {
      console.error('推送本地变更失败', error);
      throw error;
    }
  }

  // 完整同步流程（修复：同步完成后触发全局事件）
  async fullSync() {
    // 检查状态，避免重复同步
    if (this.status === CONFIG.SYNC_STATUSES.SYNCING) {
      console.warn('同步正在进行中，已忽略重复请求');
      return { success: false, message: '同步正在进行中' };
    }

    try {
      // 检查云函数可用性
      const cloudAvailable = await this.checkCloudFunction();
      if (!cloudAvailable) {
        throw new Error('云函数不可用，同步无法进行');
      }

      // 更新状态并通知
      this.status = CONFIG.SYNC_STATUSES.SYNCING;
      this.error = null;
      this.notify('syncStatusChanged', { isSyncing: true });

      // 先拉取后推送
      const pullResult = await this.pullCloudChanges();
      const pushResult = await this.pushLocalChanges();

      // 同步成功
      this.status = CONFIG.SYNC_STATUSES.SUCCESS;
      this.updateLastSyncTime();
      const syncResult = {
        isSyncing: false,
        success: true,
        ...pullResult,
        ...pushResult,
        pendingChanges: this.getLocalChanges().length,
        equipment: {
          updatedCount: pullResult.updatedCount,
          deletedCount: pullResult.deletedCount
        },
        operationLog: {
          updatedCount: pushResult.syncedCount || 0,
          deletedCount: 0
        },
        message: pushResult.message || '同步完成'
      };
      this.notify('syncStatusChanged', syncResult);
      // 触发全局同步完成事件，通知所有页面刷新
      this.notify('syncCompleted', {
        ...syncResult,
        timestamp: SyncUtils.formatTimestamp()
      });

      return { success: true, pullResult, pushResult };
    } catch (error) {
      // 同步失败
      this.status = CONFIG.SYNC_STATUSES.FAILED;
      this.error = error;
      const failResult = {
        isSyncing: false,
        success: false,
        error: error.message,
        pendingChanges: this.getLocalChanges().length
      };
      this.notify('syncStatusChanged', failResult);
      this.notify('syncCompleted', failResult);
      
      throw error;
    }
  }

  // 取消同步（应急处理）
  cancelSync() {
    this.status = CONFIG.SYNC_STATUSES.IDLE;
    this.notify('syncStatusChanged', {
      isSyncing: false,
      cancelled: true,
      pendingChanges: this.getLocalChanges().length
    });
  }
}

module.exports = new SyncManager();