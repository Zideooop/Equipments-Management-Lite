// app.js
App({
  onLaunch() {
    // 初始化本地存储
    this.initStorage();
    
    // 尝试从本地存储获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
    
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true,
        env: this.globalData.cloudEnv
      });
    }
  },

  globalData: {
    userInfo: null,
    cloudEnv: 'your-cloud-env-id', // 替换为你的云环境ID
    equipmentTypes: ['办公设备', '实验仪器', '体育器材', '教学用具', '其他']
  },

  // 初始化本地存储
  initStorage() {
    const equipmentList = wx.getStorageSync('equipmentList');
    const deletedEquipmentList = wx.getStorageSync('deletedEquipmentList');
    const activityLog = wx.getStorageSync('activityLog');
    
    if (!equipmentList) wx.setStorageSync('equipmentList', []);
    if (!deletedEquipmentList) wx.setStorageSync('deletedEquipmentList', []);
    if (!activityLog) wx.setStorageSync('activityLog', []);
  },

  // 获取器材列表
  getEquipmentList() {
    return wx.getStorageSync('equipmentList') || [];
  },

  // 保存器材
  saveEquipment(equipmentData) {
    const Equipment = require('./models/equipment');
    const equipment = new Equipment(equipmentData);
    const validation = equipment.validate();
    
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }
    
    const equipmentList = wx.getStorageSync('equipmentList') || [];
    const index = equipmentList.findIndex(item => item.id === equipment.id);
    
    // 判断是新增还是更新
    if (index > -1) {
      // 更新现有器材
      equipmentList[index] = { ...equipmentList[index], ...equipment, updateTime: new Date().toISOString() };
    } else {
      // 添加新器材
      equipmentList.push(equipment);
      
      // 记录活动日志
      this.addActivityLog({
        type: '添加',
        content: `新增器材：${equipment.name}`,
        equipmentId: equipment.id,
        equipmentName: equipment.name
      });
    }
    
    // 保存到本地存储
    wx.setStorageSync('equipmentList', equipmentList);
    return { success: true, equipment };
  },

  // 标记器材为已删除（移至回收站）
  markAsDeleted(equipmentId) {
    const equipmentList = wx.getStorageSync('equipmentList') || [];
    const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
    
    // 查找器材
    const index = equipmentList.findIndex(item => item.id === equipmentId);
    if (index === -1) {
      return { success: false, message: '未找到该器材' };
    }
    
    // 移至回收站
    const deletedItem = equipmentList.splice(index, 1)[0];
    deletedItem.deletedTime = new Date().toISOString();
    deletedList.push(deletedItem);
    
    // 保存更改
    wx.setStorageSync('equipmentList', equipmentList);
    wx.setStorageSync('deletedEquipmentList', deletedList);
    
    // 记录活动日志
    this.addActivityLog({
      type: '删除',
      content: `删除器材：${deletedItem.name}`,
      equipmentId: deletedItem.id,
      equipmentName: deletedItem.name
    });
    
    return { success: true };
  },

  // 从回收站恢复器材
  restoreEquipment(equipmentId) {
    const equipmentList = wx.getStorageSync('equipmentList') || [];
    const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
    
    // 查找被删除的器材
    const index = deletedList.findIndex(item => item.id === equipmentId);
    if (index === -1) {
      return { success: false, message: '未找到该器材' };
    }
    
    // 恢复器材
    const restoredItem = deletedList.splice(index, 1)[0];
    delete restoredItem.deletedTime; // 移除删除时间标记
    equipmentList.push(restoredItem);
    
    // 保存更改
    wx.setStorageSync('equipmentList', equipmentList);
    wx.setStorageSync('deletedEquipmentList', deletedList);
    
    // 记录活动日志
    this.addActivityLog({
      type: '恢复',
      content: `恢复器材：${restoredItem.name}`,
      equipmentId: restoredItem.id,
      equipmentName: restoredItem.name
    });
    
    return { success: true };
  },

  // 永久删除器材
  permanentlyDelete(equipmentId) {
    const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
    
    // 查找被删除的器材
    const index = deletedList.findIndex(item => item.id === equipmentId);
    if (index === -1) {
      return { success: false, message: '未找到该器材' };
    }
    
    // 永久删除
    const deletedItem = deletedList.splice(index, 1)[0];
    
    // 保存更改
    wx.setStorageSync('deletedEquipmentList', deletedList);
    
    // 记录活动日志
    this.addActivityLog({
      type: '永久删除',
      content: `永久删除器材：${deletedItem.name}`,
      equipmentId: deletedItem.id,
      equipmentName: deletedItem.name
    });
    
    return { success: true };
  },

  // 添加活动日志
  addActivityLog(logData) {
    const activityLog = wx.getStorageSync('activityLog') || [];
    const newLog = {
      id: Date.now().toString(),
      ...logData,
      time: new Date().toISOString(),
      formattedTime: this.formatDateTime(new Date())
    };
    
    activityLog.unshift(newLog); // 添加到最前面
    wx.setStorageSync('activityLog', activityLog);
    return newLog;
  },

  // 获取活动日志
  getActivityLog(limit = 10) {
    const activityLog = wx.getStorageSync('activityLog') || [];
    return limit ? activityLog.slice(0, limit) : activityLog;
  },

  // 格式化日期时间
  formatDateTime(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  // 同步数据到云端
  async syncData() {
    try {
      // 检查是否支持云函数
      if (!wx.cloud) {
        return { success: false, message: '当前环境不支持云函数' };
      }
      
      // 获取本地数据
      const localEquipments = this.getEquipmentList();
      const localLogs = this.getActivityLog();
      
      // 调用云函数同步数据
      const result = await wx.cloud.callFunction({
        name: 'syncEquipmentData',
        data: {
          equipments: localEquipments,
          logs: localLogs,
          lastSyncTime: wx.getStorageSync('lastSyncTime') || ''
        }
      });
      
      if (result.result.success) {
        // 保存同步时间
        const now = new Date().toISOString();
        wx.setStorageSync('lastSyncTime', now);
        
        // 如果有新数据，更新本地存储
        if (result.result.cloudData) {
          wx.setStorageSync('equipmentList', result.result.cloudData.equipments);
          wx.setStorageSync('activityLog', result.result.cloudData.logs);
        }
        
        return {
          success: true,
          pushed: result.result.pushedCount,
          pulled: result.result.pulledCount,
          message: '同步完成'
        };
      } else {
        return { success: false, message: result.result.message || '同步失败' };
      }
    } catch (error) {
      console.error('同步失败:', error);
      return { success: false, message: '同步失败，请检查网络' };
    }
  }
})
    