// app.js
const { generateEquipmentId } = require('./models/equipment.js');

App({
  onLaunch() {
    this.globalData.pagePaths = this.pages || [];

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        traceUser: true,
      });
    }
  
    this.initStorage();
    
    this.checkLoginStatus().then(isLoggedIn => {
      if (isLoggedIn) {
        setTimeout(() => {
          this.syncData({ silent: true }).catch(err => {
            console.error('延迟同步失败', err);
          });
        }, 1000);
      }
    });
  },

  globalData: {
    pagePaths: [],
    userInfo: null,
    equipmentList: [],
    syncStatus: 'idle',
    lastSyncTime: null
  },

  initStorage() {
    const equipmentList = wx.getStorageSync('equipmentList') || [];
    const userInfo = wx.getStorageSync('userInfo') || null;
    const lastSyncTime = wx.getStorageSync('lastSyncTime') || null;
    
    this.globalData.equipmentList = equipmentList;
    this.globalData.userInfo = userInfo;
    this.globalData.lastSyncTime = lastSyncTime;
  },

  checkLoginStatus() {
    return new Promise((resolve, reject) => {
      const userInfo = this.globalData.userInfo;
      
      if (!userInfo || !userInfo.token) {
        resolve(false);
        return;
      }
      
      wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'verifyToken',
          token: userInfo.token
        },
        success: (res) => {
          if (res.result.success && res.result.valid) {
            resolve(true);
          } else {
            this.clearLoginStatus();
            resolve(false);
          }
        },
        fail: (err) => {
          console.error('验证登录状态失败', err);
          resolve(false);
        }
      });
    });
  },

  getRecycleBin() {
    return wx.getStorageSync('recycleBin') || [];
  },

  saveRecycleBin(data) {
    wx.setStorageSync('recycleBin', data);
  },

  addOperationLog(content) {
    let logs = wx.getStorageSync('operationLogs') || [];
    logs.unshift({
      id: Date.now().toString(),
      content,
      time: new Date().toISOString()
    });
    if (logs.length > 100) {
      logs = logs.slice(0, 100);
    }
    wx.setStorageSync('operationLogs', logs);
  },

  clearLoginStatus() {
    this.globalData.userInfo = null;
    wx.removeStorageSync('userInfo');
  },

  saveEquipmentList(list) {
    this.globalData.equipmentList = list;
    wx.setStorageSync('equipmentList', list);
    return list;
  },

  getEquipmentList() {
    return [...this.globalData.equipmentList];
  },

  addEquipment(equipment) {
    const list = this.getEquipmentList();
    const id = generateEquipmentId(equipment.type);
    
    const newEquipment = {
      id,
      createTime: new Date().toISOString(),
      addTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      status: '在库',
      isSynced: false,
      ...equipment
    };
    
    list.unshift(newEquipment);
    this.saveEquipmentList(list);
    
    this.syncData({ silent: true }).catch(err => {
      console.error('添加后同步失败', err);
    });
    
    return newEquipment;
  },

  updateEquipment(id, updatedData) {
    const list = this.getEquipmentList();
    const index = list.findIndex(item => item.id === id);
    
    if (index === -1) {
      console.error('设备不存在', id);
      return false;
    }
    
    list[index] = {
      ...list[index],
      ...updatedData,
      updateTime: new Date().toISOString(),
      isSynced: false
    };
    
    this.saveEquipmentList(list);
    
    this.syncData({ silent: true }).catch(err => {
      console.error('更新后同步失败', err);
    });
    
    return list[index];
  },

  deleteEquipment(id) {
    const result = this.updateEquipment(id, {
      isDeleted: true,
      status: '已删除',
      isSynced: false
    });
    
    if (result) {
      this.syncData({ silent: true }).catch(err => {
        console.error('删除后同步失败', err);
      });
    }
    
    return result;
  },

  permanentlyDeleteEquipment(id) {
    let list = this.getEquipmentList();
    list = list.filter(item => item.id !== id);
    
    this.saveEquipmentList(list);
    
    this.syncData({ silent: true }).catch(err => {
      console.error('永久删除后同步失败', err);
    });
    
    return true;
  },

  manualSync() {
    return this.syncData({ silent: false });
  },

  async syncData({ silent = true } = {}) {
    if (this.globalData.syncStatus === 'syncing') {
      return { success: false, message: '正在同步中' };
    }
    
    this.globalData.syncStatus = 'syncing';
    
    if (!silent) {
      wx.showLoading({ title: '同步中...', mask: true });
    }
    
    try {
      // 1. 拉取云端变更（使用正确的action: 'pull'）
      const pullResult = await this.pullCloudChanges();
      if (!pullResult.success) {
        throw new Error(pullResult.message || '拉取云端变更失败');
      }
      
      // 2. 推送本地变更（使用正确的action: 'sync'）
      const pushResult = await this.pushLocalChanges();
      if (!pushResult.success) {
        throw new Error(pushResult.message || '推送本地变更失败');
      }
      
      const now = new Date().toISOString();
      this.globalData.lastSyncTime = now;
      wx.setStorageSync('lastSyncTime', now);
      
      this.globalData.syncStatus = 'success';
      
      if (!silent) {
        wx.hideLoading();
        wx.showToast({ 
          title: '同步成功', 
          icon: 'success',
          duration: 1500
        });
      }
      
      return {
        success: true,
        message: '同步完成',
        pulled: pullResult.updatedCount + pullResult.deletedCount,
        pushed: pushResult.updatedCount + pushResult.deletedCount
      };
    } catch (err) {
      this.globalData.syncStatus = 'failed';
      
      if (!silent) {
        wx.hideLoading();
        wx.showToast({ 
          title: '同步失败', 
          icon: 'none',
          duration: 2000
        });
      }
      
      console.error('同步失败', err);
      
      return {
        success: false,
        message: err.message || '同步失败'
      };
    }
  },

  // 拉取云端变更 - 使用正确的action: 'pull'
  async pullCloudChanges() {
    try {
      const lastSyncTime = this.globalData.lastSyncTime;
      
      const res = await wx.cloud.callFunction({
        name: 'equipmentManager',
        data: {
          action: 'pull',  // 与云函数中定义的action匹配
          lastSyncTime: lastSyncTime
        }
      });
      
      if (!res.result.success) {
        return { success: false, message: res.result.message };
      }
      
      const { updates, deletes } = res.result;
      let equipmentList = this.getEquipmentList();
      
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
      
      if (deletes.length > 0) {
        equipmentList = equipmentList.filter(item => !deletes.includes(item.id));
      }
      
      this.saveEquipmentList(equipmentList);
      
      return {
        success: true,
        updatedCount: updates.length,
        deletedCount: deletes.length
      };
    } catch (err) {
      console.error('拉取云端变更失败', err);
      return { success: false, message: err.message };
    }
  },

  // 推送本地变更 - 使用正确的action: 'sync'
  async pushLocalChanges() {
    try {
      const equipmentList = this.getEquipmentList();
      
      const updates = equipmentList
        .filter(item => !item.isSynced && !item.isDeleted)
        .map(item => ({ ...item }));
      const deletes = equipmentList
        .filter(item => !item.isSynced && item.isDeleted)
        .map(item => item.id);
      
      if (updates.length === 0 && deletes.length === 0) {
        return {
          success: true,
          updatedCount: 0,
          deletedCount: 0,
          message: '没有需要同步的内容'
        };
      }
      
      const res = await wx.cloud.callFunction({
        name: 'equipmentManager',
        data: {
          action: 'sync',  // 与云函数中定义的action匹配
          updates,
          deletes
        }
      });
      
      if (!res.result.success) {
        return { success: false, message: res.result.message };
      }
      
      const updatedList = equipmentList.map(item => {
        if (!item.isSynced && (!item.isDeleted || deletes.includes(item.id))) {
          return { ...item, isSynced: true };
        }
        return item;
      });
      
      this.saveEquipmentList(updatedList);
      
      return {
        success: true,
        updatedCount: updates.length,
        deletedCount: deletes.length
      };
    } catch (err) {
      console.error('推送本地变更失败', err);
      return { success: false, message: err.message };
    }
  }
});
    