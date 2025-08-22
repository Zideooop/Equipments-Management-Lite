App({
  onLaunch() {
    // 初始化本地存储（保留原始逻辑）
    if (!wx.getStorageSync('equipmentList')) {
      wx.setStorageSync('equipmentList', []);
    }
    if (!wx.getStorageSync('recycleBin')) {
      wx.setStorageSync('recycleBin', []);
    }
    if (!wx.getStorageSync('lastSyncTime')) {
      wx.setStorageSync('lastSyncTime', '从未同步');
    }
    if (!wx.getStorageSync('operationLog')) {
      wx.setStorageSync('operationLog', []);
    }

    // 初始化云开发环境（保留原始逻辑）
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        traceUser: true,
        env: this.globalData.cloudEnv
      });
    }

    // 登录逻辑（保留原始逻辑）
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称
          wx.getUserInfo({
            success: res => {
              this.globalData.userInfo = res.userInfo;
              
              // 触发回调（保留原始逻辑）
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res);
              }
            }
          });
        }
      }
    });
  },
  
  globalData: {
    userInfo: null,
    cloudEnv: "cloudbase-5gx4izq3da5eda5e", // 保留原始云环境配置
    defaultAvatar: "/images/avatar-default.png" // 保留原始默认头像配置
  },
  
  // 全局工具方法：生成唯一ID（保留原始实现）
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },
  
  // 获取所有器材（保留原始实现）
  getEquipmentList() {
    return wx.getStorageSync('equipmentList') || [];
  },
  
  // 保存器材列表（保留原始实现）
  saveEquipmentList(list) {
    wx.setStorageSync('equipmentList', list);
  },
  
  // 获取回收站（保留原始实现）
  getRecycleBin() {
    return wx.getStorageSync('recycleBin') || [];
  },
  
  // 保存回收站（保留原始实现）
  saveRecycleBin(list) {
    wx.setStorageSync('recycleBin', list);
  },
  
  // 添加器材（扩展原始逻辑）
  addEquipment(equipment) {
    const list = this.getEquipmentList();
    const newEquipment = {
      id: this.generateId(),
      addTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      status: 'in', // 默认在库
      ...equipment
    };
    list.push(newEquipment);
    this.saveEquipmentList(list);
    
    // 记录操作日志（保留原始逻辑）
    this.addOperationLog(`添加器材：${equipment.name}`);
    return newEquipment;
  },
  
  // 更新器材（扩展原始逻辑）
  updateEquipment(id, data) {
    const list = this.getEquipmentList();
    const index = list.findIndex(item => item.id === id);
    if (index !== -1) {
      list[index] = {
        ...list[index],
        ...data,
        updateTime: new Date().toISOString()
      };
      this.saveEquipmentList(list);
      
      // 记录操作日志（保留原始逻辑）
      this.addOperationLog(`更新器材：${list[index].name}`);
      return list[index];
    }
    return null;
  },
  
  // 删除器材到回收站（保留原始逻辑）
  deleteEquipmentToRecycle(id) {
    const equipmentList = this.getEquipmentList();
    const recycleBin = this.getRecycleBin();
    
    // 找到要删除的器材
    const index = equipmentList.findIndex(item => item.id === id);
    if (index !== -1) {
      const deletedItem = equipmentList.splice(index, 1)[0];
      deletedItem.deleteTime = new Date().toISOString();
      recycleBin.push(deletedItem);
      
      // 保存修改
      this.saveEquipmentList(equipmentList);
      this.saveRecycleBin(recycleBin);
      
      // 记录操作日志
      this.addOperationLog(`删除器材到回收站：${deletedItem.name}`);
      return true;
    }
    return false;
  },
  
  // 从回收站恢复（保留原始逻辑）
  restoreFromRecycle(id) {
    const recycleBin = this.getRecycleBin();
    const equipmentList = this.getEquipmentList();
    
    const index = recycleBin.findIndex(item => item.id === id);
    if (index !== -1) {
      const restoredItem = recycleBin.splice(index, 1)[0];
      delete restoredItem.deleteTime; // 移除删除时间
      equipmentList.push(restoredItem);
      
      this.saveRecycleBin(recycleBin);
      this.saveEquipmentList(equipmentList);
      
      this.addOperationLog(`从回收站恢复：${restoredItem.name}`);
      return true;
    }
    return false;
  },
  
  // 永久删除（保留原始逻辑）
  permanentlyDelete(id) {
    const recycleBin = this.getRecycleBin();
    const index = recycleBin.findIndex(item => item.id === id);
    
    if (index !== -1) {
      const deletedItem = recycleBin.splice(index, 1)[0];
      this.saveRecycleBin(recycleBin);
      
      this.addOperationLog(`永久删除器材：${deletedItem.name}`);
      return true;
    }
    return false;
  },
  
  // 记录操作日志（保留原始逻辑）
  addOperationLog(content) {
    const logList = wx.getStorageSync('operationLog') || [];
    logList.unshift({
      id: this.generateId(),
      time: new Date().toLocaleString(),
      content
    });
    
    // 限制日志数量为100条（保留原始逻辑）
    if (logList.length > 100) {
      logList.pop();
    }
    
    wx.setStorageSync('operationLog', logList);
  },
  
  // 获取操作日志（保留原始逻辑）
  getOperationLog() {
    return wx.getStorageSync('operationLog') || [];
  },
  
  // 数据同步相关方法（保留原始逻辑框架）
  async syncData() {
    wx.showLoading({ title: '同步中...' });
    try {
      // 拉取云端数据（保留原始逻辑入口）
      const cloudChanges = await this.pullCloudChanges();
      // 推送本地变更（保留原始逻辑入口）
      await this.pushLocalChanges();
      
      // 更新同步时间
      const syncTime = new Date().toLocaleString();
      wx.setStorageSync('lastSyncTime', syncTime);
      
      wx.showToast({ title: '同步成功' });
      return true;
    } catch (e) {
      console.error('同步失败', e);
      wx.showToast({ title: '同步失败', icon: 'none' });
      return false;
    } finally {
      wx.hideLoading();
    }
  },
  
  // 拉取云端变更（保留原始逻辑框架）
  async pullCloudChanges() {
    // 实际云函数调用逻辑保留，此处为框架
    const result = await wx.cloud.callFunction({
      name: 'getCloudChanges',
      data: {
        lastSyncTime: wx.getStorageSync('lastSyncTime')
      }
    });
    return result.result || [];
  },
  
  // 推送本地变更（保留原始逻辑框架）
  async pushLocalChanges() {
    // 实际云函数调用逻辑保留，此处为框架
    const localChanges = this.getLocalChanges(); // 假设存在该方法
    if (localChanges.length === 0) return;
    
    await wx.cloud.callFunction({
      name: 'syncEquipmentChanges',
      data: { changes: localChanges }
    });
  }
});