// app.js
App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        traceUser: true,
        env: 'cloudbase-5gx4izq3da5eda5e' // 实际云环境ID
      });
    }

    // 初始化应用数据
    this.initData();
    
    // 检查是否有已保存的用户信息
    this.checkLoginStatus();
    
    // 解决Foundation.onLoad错误的兼容性处理
    if (typeof wx.getSystemInfoSync === 'function') {
      try {
        const systemInfo = wx.getSystemInfoSync();
        this.globalData.systemInfo = systemInfo;
      } catch (e) {
        console.warn('获取系统信息失败', e);
      }
    }
    
    // 自动同步数据
    this.syncData();
  },
  
  // 初始化应用数据
  initData() {
    // 初始化器材列表
    if (!wx.getStorageSync('equipmentList')) {
      wx.setStorageSync('equipmentList', []);
    }
    
    // 初始化回收站
    if (!wx.getStorageSync('deletedEquipmentList')) {
      wx.setStorageSync('deletedEquipmentList', []);
    }
    
    // 初始化活动日志
    if (!wx.getStorageSync('activityLog')) {
      wx.setStorageSync('activityLog', []);
    }
    
    // 初始化同步状态
    if (!wx.getStorageSync('syncStatus')) {
      wx.setStorageSync('syncStatus', {
        lastSyncTime: null,
        isSyncing: false,
        pendingChanges: []
      });
    }
  },
  
  // 检查用户登录状态
  checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.globalData.userInfo = userInfo;
        
        // 验证token有效性
        if (!userInfo.isGuest) {
          this.verifyToken(userInfo.token);
        }
      }
    } catch (e) {
      console.error('检查用户登录状态失败', e);
    }
  },
  
  // 验证token有效性
  verifyToken(token) {
    wx.cloud.callFunction({
      name: 'verifyToken',
      data: { token }
    }).then(res => {
      if (!res.result.valid) {
        // Token无效，清除登录状态
        this.clearLoginStatus();
      }
    }).catch(err => {
      console.error('验证token失败', err);
    });
  },
  
  // 清除登录状态
  clearLoginStatus() {
    try {
      wx.removeStorageSync('userInfo');
      this.globalData.userInfo = null;
    } catch (e) {
      console.error('清除登录状态失败', e);
    }
  },
  
  // 获取器材列表
  getEquipmentList() {
    try {
      return wx.getStorageSync('equipmentList') || [];
    } catch (e) {
      console.error('获取器材列表失败', e);
      return [];
    }
  },
  
  // 添加器材
  addEquipment(equipment) {
    try {
      const list = this.getEquipmentList();
      // 检查编码是否已存在
      const exists = list.some(item => item.code === equipment.code);
      if (exists) {
        return { success: false, message: '该器材编码已存在' };
      }
      
      // 生成唯一ID
      const newEquipment = {
        ...equipment,
        id: 'eq_' + Date.now() + Math.floor(Math.random() * 1000),
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        _syncStatus: 'pending' // 待同步状态
      };
      
      list.push(newEquipment);
      wx.setStorageSync('equipmentList', list);
      
      // 记录待同步的变更
      this.recordPendingChange('add', newEquipment.id);
      
      return { success: true, data: newEquipment };
    } catch (e) {
      console.error('添加器材失败', e);
      return { success: false, message: '添加失败，请重试' };
    }
  },
  
  // 更新器材
  updateEquipment(equipment) {
    try {
      let list = this.getEquipmentList();
      const index = list.findIndex(item => item.id === equipment.id);
      
      if (index === -1) {
        return { success: false, message: '未找到该器材' };
      }
      
      // 检查编码是否与其他器材冲突
      const codeExists = list.some(item => 
        item.id !== equipment.id && item.code === equipment.code
      );
      
      if (codeExists) {
        return { success: false, message: '该器材编码已存在' };
      }
      
      // 保留原创建时间，更新修改时间
      const updatedEquipment = { 
        ...list[index], 
        ...equipment, 
        updateTime: new Date().toISOString(),
        _syncStatus: 'pending' // 待同步状态
      };
      
      list[index] = updatedEquipment;
      wx.setStorageSync('equipmentList', list);
      
      // 记录待同步的变更
      this.recordPendingChange('update', equipment.id);
      
      return { success: true, data: updatedEquipment };
    } catch (e) {
      console.error('更新器材失败', e);
      return { success: false, message: '更新失败，请重试' };
    }
  },
  
  // 删除器材到回收站
  deleteEquipment(id) {
    try {
      let list = this.getEquipmentList();
      const index = list.findIndex(item => item.id === id);
      
      if (index === -1) {
        return { success: false, message: '未找到该器材' };
      }
      
      // 获取要删除的器材
      const deletedItem = {
        ...list[index],
        deleteTime: new Date().toISOString(),
        _syncStatus: 'pending' // 待同步状态
      };
      
      // 从列表中移除
      list.splice(index, 1);
      wx.setStorageSync('equipmentList', list);
      
      // 添加到回收站
      let deletedList = wx.getStorageSync('deletedEquipmentList') || [];
      deletedList.push(deletedItem);
      wx.setStorageSync('deletedEquipmentList', deletedList);
      
      // 记录待同步的变更
      this.recordPendingChange('delete', id);
      
      return { success: true };
    } catch (e) {
      console.error('删除器材失败', e);
      return { success: false, message: '删除失败，请重试' };
    }
  },
  
  // 从回收站恢复器材
  restoreEquipment(id) {
    try {
      let deletedList = wx.getStorageSync('deletedEquipmentList') || [];
      const index = deletedList.findIndex(item => item.id === id);
      
      if (index === -1) {
        return { success: false, message: '未找到该器材' };
      }
      
      // 获取要恢复的器材
      const restoredItem = {
        ...deletedList[index],
        _syncStatus: 'pending', // 待同步状态
        deleteTime: undefined
      };
      
      // 从回收站移除
      deletedList.splice(index, 1);
      wx.setStorageSync('deletedEquipmentList', deletedList);
      
      // 添加回器材列表
      let equipmentList = this.getEquipmentList();
      equipmentList.push(restoredItem);
      wx.setStorageSync('equipmentList', equipmentList);
      
      // 记录待同步的变更
      this.recordPendingChange('restore', id);
      
      return { success: true };
    } catch (e) {
      console.error('恢复器材失败', e);
      return { success: false, message: '恢复失败，请重试' };
    }
  },
  
  // 永久删除器材
  permanentlyDelete(id) {
    try {
      let deletedList = wx.getStorageSync('deletedEquipmentList') || [];
      const index = deletedList.findIndex(item => item.id === id);
      
      if (index === -1) {
        return { success: false, message: '未找到该器材' };
      }
      
      // 从回收站移除
      deletedList.splice(index, 1);
      wx.setStorageSync('deletedEquipmentList', deletedList);
      
      // 记录待同步的变更
      this.recordPendingChange('permanentDelete', id);
      
      return { success: true };
    } catch (e) {
      console.error('永久删除器材失败', e);
      return { success: false, message: '删除失败，请重试' };
    }
  },
  
  // 记录待同步的变更
  recordPendingChange(action, id) {
    try {
      const syncStatus = wx.getStorageSync('syncStatus') || { pendingChanges: [] };
      
      // 检查是否已有相同ID的变更，如果有则更新
      const changeIndex = syncStatus.pendingChanges.findIndex(
        change => change.id === id
      );
      
      if (changeIndex > -1) {
        syncStatus.pendingChanges[changeIndex] = {
          action,
          id,
          timestamp: new Date().toISOString()
        };
      } else {
        syncStatus.pendingChanges.push({
          action,
          id,
          timestamp: new Date().toISOString()
        });
      }
      
      wx.setStorageSync('syncStatus', syncStatus);
    } catch (e) {
      console.error('记录待同步变更失败', e);
    }
  },
  
  // 添加活动日志
  addActivityLog(log) {
    try {
      let logs = wx.getStorageSync('activityLog') || [];
      const newLog = {
        id: 'log_' + Date.now() + Math.floor(Math.random() * 1000),
        ...log,
        createTime: new Date().toISOString(),
        operator: this.globalData.userInfo?.username || '未知用户',
        _syncStatus: 'pending' // 待同步状态
      };
      
      logs.push(newLog);
      
      // 限制日志数量，只保留最近200条
      if (logs.length > 200) {
        logs = logs.slice(-200);
      }
      
      wx.setStorageSync('activityLog', logs);
      
      // 记录待同步的变更
      this.recordPendingChange('addLog', newLog.id);
      
      return newLog;
    } catch (e) {
      console.error('添加活动日志失败', e);
    }
  },
  
  // 获取活动日志
  getActivityLog() {
    try {
      return wx.getStorageSync('activityLog') || [];
    } catch (e) {
      console.error('获取活动日志失败', e);
      return [];
    }
  },
  
  // 数据同步
  async syncData(showLoading = true) {
    const syncStatus = wx.getStorageSync('syncStatus') || { 
      isSyncing: false,
      pendingChanges: []
    };
    
    // 如果正在同步中，直接返回
    if (syncStatus.isSyncing) {
      return { success: false, message: '正在同步中' };
    }
    
    // 检查网络状态
    const networkType = await new Promise(resolve => {
      wx.getNetworkType({
        success(res) {
          resolve(res.networkType);
        },
        fail() {
          resolve('none');
        }
      });
    });
    
    if (networkType === 'none') {
      return { success: false, message: '无网络连接，无法同步' };
    }
    
    // 检查登录状态
    if (!this.globalData.userInfo || this.globalData.userInfo.isGuest) {
      return { success: false, message: '游客模式下无法同步数据' };
    }
    
    try {
      if (showLoading) {
        wx.showLoading({ title: '同步中...', mask: true });
      }
      
      // 更新同步状态为正在同步
      syncStatus.isSyncing = true;
      wx.setStorageSync('syncStatus', syncStatus);
      
      // 1. 先拉取云端最新数据
      const pullResult = await this.pullCloudData();
      if (!pullResult.success) {
        throw new Error(pullResult.message || '拉取云端数据失败');
      }
      
      // 2. 再推送本地变更到云端
      const pushResult = await this.pushLocalChanges();
      if (!pushResult.success) {
        throw new Error(pushResult.message || '推送本地数据失败');
      }
      
      // 3. 更新同步时间
      syncStatus.lastSyncTime = new Date().toISOString();
      syncStatus.isSyncing = false;
      wx.setStorageSync('syncStatus', syncStatus);
      
      if (showLoading) {
        wx.hideLoading();
        wx.showToast({ title: '同步成功', icon: 'success' });
      }
      
      // 通知所有页面数据已更新
      this.notifyDataUpdated();
      
      return { success: true };
    } catch (error) {
      console.error('同步数据失败', error);
      
      // 恢复同步状态
      syncStatus.isSyncing = false;
      wx.setStorageSync('syncStatus', syncStatus);
      
      if (showLoading) {
        wx.hideLoading();
        wx.showToast({ title: '同步失败', icon: 'none' });
      }
      
      return { success: false, message: error.message || '同步失败，请重试' };
    }
  },
  
  // 拉取云端数据
  async pullCloudData() {
    try {
      const lastSyncTime = wx.getStorageSync('syncStatus')?.lastSyncTime;
      
      const result = await wx.cloud.callFunction({
        name: 'pullChanges',
        data: { lastSyncTime }
      });
      
      if (result.result.success) {
        // 处理拉取到的器材数据
        if (Array.isArray(result.result.equipments)) {
          this.mergeEquipmentData(result.result.equipments);
        }
        
        // 处理拉取到的日志数据
        if (Array.isArray(result.result.logs)) {
          this.mergeLogData(result.result.logs);
        }
        
        return { success: true };
      } else {
        return { 
          success: false, 
          message: result.result.message || '拉取云端数据失败' 
        };
      }
    } catch (error) {
      console.error('拉取云端数据失败', error);
      return { success: false, message: error.message };
    }
  },
  
  // 推送本地变更到云端
  async pushLocalChanges() {
    try {
      const syncStatus = wx.getStorageSync('syncStatus') || { pendingChanges: [] };
      
      // 如果没有待同步的变更，直接返回成功
      if (syncStatus.pendingChanges.length === 0) {
        return { success: true };
      }
      
      // 收集需要同步的数据
      const equipmentList = this.getEquipmentList();
      const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
      const activityLogs = this.getActivityLog();
      
      const changesToSync = syncStatus.pendingChanges.map(change => {
        let data = null;
        
        // 根据变更类型获取对应的数据
        if (change.action === 'add' || change.action === 'update' || change.action === 'delete') {
          data = equipmentList.find(item => item.id === change.id) || 
                 deletedList.find(item => item.id === change.id);
        } else if (change.action === 'restore' || change.action === 'permanentDelete') {
          data = deletedList.find(item => item.id === change.id) ||
                 equipmentList.find(item => item.id === change.id);
        } else if (change.action === 'addLog') {
          data = activityLogs.find(log => log.id === change.id);
        }
        
        return {
          ...change,
          data: data ? { ...data } : null
        };
      }).filter(change => change.data !== null);
      
      // 如果没有有效数据需要同步，清理待同步列表并返回
      if (changesToSync.length === 0) {
        syncStatus.pendingChanges = [];
        wx.setStorageSync('syncStatus', syncStatus);
        return { success: true };
      }
      
      // 调用云函数同步变更
      const result = await wx.cloud.callFunction({
        name: 'pushChanges',
        data: { changes: changesToSync }
      });
      
      if (result.result.success) {
        // 清理已同步成功的变更
        const successfulIds = result.result.successfulIds || [];
        syncStatus.pendingChanges = syncStatus.pendingChanges.filter(
          change => !successfulIds.includes(change.id)
        );
        wx.setStorageSync('syncStatus', syncStatus);
        
        return { success: true };
      } else {
        return { 
          success: false, 
          message: result.result.message || '推送本地数据失败' 
        };
      }
    } catch (error) {
      console.error('推送本地数据失败', error);
      return { success: false, message: error.message };
    }
  },
  
  // 合并器材数据
  mergeEquipmentData(cloudEquipments) {
    try {
      let localEquipments = this.getEquipmentList();
      let localDeleted = wx.getStorageSync('deletedEquipmentList') || [];
      
      // 处理云端器材数据
      cloudEquipments.forEach(cloudItem => {
        // 检查本地是否已存在该器材
        const localIndex = localEquipments.findIndex(item => item.id === cloudItem.id);
        const deletedIndex = localDeleted.findIndex(item => item.id === cloudItem.id);
        
        // 解析日期，处理时间戳
        const cloudUpdateTime = new Date(cloudItem.updateTime);
        let localUpdateTime = null;
        
        if (localIndex > -1) {
          localUpdateTime = new Date(localEquipments[localIndex].updateTime);
        } else if (deletedIndex > -1) {
          localUpdateTime = new Date(localDeleted[deletedIndex].updateTime);
        }
        
        // 如果云端数据更新，使用云端数据
        if (!localUpdateTime || cloudUpdateTime > localUpdateTime) {
          // 移除本地数据中的该记录
          if (localIndex > -1) {
            localEquipments.splice(localIndex, 1);
          }
          if (deletedIndex > -1) {
            localDeleted.splice(deletedIndex, 1);
          }
          
          // 根据云端数据状态决定添加到哪个列表
          if (cloudItem.isDeleted) {
            localDeleted.push({ ...cloudItem, _syncStatus: 'synced' });
          } else {
            localEquipments.push({ ...cloudItem, _syncStatus: 'synced' });
          }
        }
      });
      
      // 保存合并后的数据
      wx.setStorageSync('equipmentList', localEquipments);
      wx.setStorageSync('deletedEquipmentList', localDeleted);
    } catch (error) {
      console.error('合并器材数据失败', error);
    }
  },
  
  // 合并日志数据
  mergeLogData(cloudLogs) {
    try {
      let localLogs = this.getActivityLog() || [];
      
      cloudLogs.forEach(cloudLog => {
        // 检查本地是否已存在该日志
        const localIndex = localLogs.findIndex(log => log.id === cloudLog.id);
        
        if (localIndex === -1) {
          // 本地不存在，添加
          localLogs.push({ ...cloudLog, _syncStatus: 'synced' });
        } else {
          // 本地存在，检查是否需要更新
          const cloudCreateTime = new Date(cloudLog.createTime);
          const localCreateTime = new Date(localLogs[localIndex].createTime);
          
          if (cloudCreateTime > localCreateTime) {
            localLogs[localIndex] = { ...cloudLog, _syncStatus: 'synced' };
          }
        }
      });
      
      // 限制日志数量，只保留最近200条
      if (localLogs.length > 200) {
        localLogs = localLogs.slice(-200);
      }
      
      // 保存合并后的日志
      wx.setStorageSync('activityLog', localLogs);
    } catch (error) {
      console.error('合并日志数据失败', error);
    }
  },
  
  // 通知所有页面数据已更新
  notifyDataUpdated() {
    const pages = getCurrentPages();
    pages.forEach(page => {
      if (typeof page.onDataUpdated === 'function') {
        try {
          page.onDataUpdated();
        } catch (e) {
          console.error(`页面${page.route}数据更新失败`, e);
        }
      }
    });
  },
  
  globalData: {
    userInfo: null,
    systemInfo: null,
    filterStatus: 'all',
    syncStatus: {
      lastSyncTime: null,
      isSyncing: false
    }
  }
});
