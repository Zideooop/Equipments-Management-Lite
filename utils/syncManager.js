class SyncManager {
  constructor() {
    this.isSyncing = false;
  }
  
  // 完整同步流程：先推送到云端，再从云端拉取
  async fullSync() {
    if (this.isSyncing) {
      return { success: false, message: '同步已在进行中' };
    }
    
    try {
      this.isSyncing = true;
      
      // 1. 推送本地变更到云端
      const pushResult = await this.pushLocalChanges();
      if (!pushResult.success) {
        throw new Error(pushResult.message || '推送本地变更失败');
      }
      
      // 2. 从云端拉取最新数据
      const pullResult = await this.pullCloudChanges();
      if (!pullResult.success) {
        throw new Error(pullResult.message || '拉取云端数据失败');
      }
      
      // 3. 更新最后同步时间
      wx.setStorageSync('lastSyncTime', new Date().toISOString());
      
      return {
        success: true,
        pushed: pushResult.pushedCount,
        pulled: pullResult.pulledCount,
        message: '同步完成'
      };
    } catch (err) {
      console.error('同步失败:', err);
      return { success: false, message: err.message || '同步失败' };
    } finally {
      this.isSyncing = false;
    }
  }
  
  // 推送本地变更到云端
  async pushLocalChanges() {
    try {
      const equipmentList = wx.getStorageSync('equipmentList') || [];
      const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
      
      // 筛选未同步的变更
      const unsyncedUpdates = equipmentList.filter(item => !item.isSynced);
      const unsyncedDeletes = deletedList.filter(item => !item.isSynced);
      
      if (unsyncedUpdates.length === 0 && unsyncedDeletes.length === 0) {
        return { success: true, pushedCount: 0, message: '无未同步变更' };
      }
      
      // 调用云函数同步变更
      const res = await wx.cloud.callFunction({
        name: 'syncEquipmentChanges',
        data: {
          updates: unsyncedUpdates,
          deletes: unsyncedDeletes.map(item => item.id)
        }
      });
      
      if (!res.result.success) {
        return { success: false, message: res.result.message };
      }
      
      // 更新本地同步状态
      const updatedEquipmentList = equipmentList.map(item => {
        if (unsyncedUpdates.some(u => u.id === item.id)) {
          return { ...item, isSynced: true };
        }
        return item;
      });
      
      const updatedDeletedList = deletedList.map(item => {
        if (unsyncedDeletes.some(d => d.id === item.id)) {
          return { ...item, isSynced: true };
        }
        return item;
      });
      
      wx.setStorageSync('equipmentList', updatedEquipmentList);
      wx.setStorageSync('deletedEquipmentList', updatedDeletedList);
      
      const app = getApp();
      app.globalData.equipmentCache.list = updatedEquipmentList;
      app.globalData.equipmentCache.deletedList = updatedDeletedList;
      
      return {
        success: true,
        pushedCount: unsyncedUpdates.length + unsyncedDeletes.length,
        message: '本地变更已同步到云端'
      };
    } catch (err) {
      console.error('推送本地变更失败:', err);
      return { success: false, message: err.message };
    }
  }
  
  // 从云端拉取最新数据
  async pullCloudChanges() {
    try {
      const lastSyncTime = wx.getStorageSync('lastSyncTime') || null;
      
      // 调用云函数拉取数据
      const res = await wx.cloud.callFunction({
        name: 'getCloudChanges',
        data: { lastSyncTime }
      });
      
      if (!res.result.success) {
        return { success: false, message: res.result.message };
      }
      
      const { updates, deletes } = res.result;
      
      if (updates.length === 0 && deletes.length === 0) {
        return { success: true, pulledCount: 0, message: '云端无新变更' };
      }
      
      let equipmentList = wx.getStorageSync('equipmentList') || [];
      let deletedList = wx.getStorageSync('deletedEquipmentList') || [];
      
      // 应用更新
      updates.forEach(cloudItem => {
        const localIndex = equipmentList.findIndex(item => item.id === cloudItem.id);
        
        if (localIndex > -1) {
          const localTime = new Date(equipmentList[localIndex].updateTime).getTime();
          const cloudTime = new Date(cloudItem.updateTime).getTime();
          
          if (cloudTime > localTime) {
            equipmentList[localIndex] = { ...cloudItem, isSynced: true };
          }
        } else if (!cloudItem.isDeleted) {
          equipmentList.push({ ...cloudItem, isSynced: true });
        }
      });
      
      // 应用删除
      deletes.forEach(deletedId => {
        const localIndex = equipmentList.findIndex(item => item.id === deletedId);
        
        if (localIndex > -1) {
          const deletedItem = {
            ...equipmentList[localIndex],
            isDeleted: true,
            deleteTime: new Date().toISOString(),
            isSynced: true
          };
          
          equipmentList.splice(localIndex, 1);
          deletedList.push(deletedItem);
        }
      });
      
      wx.setStorageSync('equipmentList', equipmentList);
      wx.setStorageSync('deletedEquipmentList', deletedList);
      
      const app = getApp();
      app.globalData.equipmentCache.list = equipmentList;
      app.globalData.equipmentCache.deletedList = deletedList;
      
      return {
        success: true,
        pulledCount: updates.length + deletes.length,
        message: '已获取云端最新数据'
      };
    } catch (err) {
      console.error('拉取云端数据失败:', err);
      return { success: false, message: err.message };
    }
  }
}

module.exports = SyncManager;
    