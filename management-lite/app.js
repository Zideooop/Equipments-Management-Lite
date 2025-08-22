// app.js
App({
  onLaunch() {
    // 初始化本地存储结构
    this.initStorageStructure();
    
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
    
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true,
        env: 'your-cloud-env-id' // 替换为你的云环境ID
      });
    }
  },

  initStorageStructure() {
    // 初始化器材列表
    if (!wx.getStorageSync('equipmentList')) {
      wx.setStorageSync('equipmentList', []);
    }
    
    // 初始化回收站
    if (!wx.getStorageSync('deletedEquipmentList')) {
      wx.setStorageSync('deletedEquipmentList', []);
    }
    
    // 初始化活动记录
    if (!wx.getStorageSync('activityLog')) {
      wx.setStorageSync('activityLog', []);
    }
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
    
    let equipmentList = this.getEquipmentList();
    const index = equipmentList.findIndex(item => item.id === equipment.id);
    
    if (index > -1) {
      // 更新现有器材
      equipmentList[index] = equipment;
    } else {
      // 添加新器材
      equipmentList.push(equipment);
      
      // 记录活动
      this.logActivity({
        id: Date.now().toString(),
        type: '添加',
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        content: `添加了新器材: ${equipment.name}`,
        createTime: new Date().toISOString()
      });
    }
    
    wx.setStorageSync('equipmentList', equipmentList);
    return { success: true, equipment };
  },

  // 标记器材为已删除
  markAsDeleted(equipmentId) {
    let equipmentList = this.getEquipmentList();
    const equipment = equipmentList.find(item => item.id === equipmentId);
    
    if (!equipment) {
      return { success: false, message: '未找到该器材' };
    }
    
    // 从器材列表中移除
    equipmentList = equipmentList.filter(item => item.id !== equipmentId);
    wx.setStorageSync('equipmentList', equipmentList);
    
    // 添加到回收站
    let deletedList = wx.getStorageSync('deletedEquipmentList') || [];
    deletedList.push({
      ...equipment,
      deleteTime: new Date().toISOString(),
      isDeleted: true
    });
    wx.setStorageSync('deletedEquipmentList', deletedList);
    
    // 记录活动
    this.logActivity({
      id: Date.now().toString(),
      type: '删除',
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      content: `将器材 ${equipment.name} 移至回收站`,
      createTime: new Date().toISOString()
    });
    
    return { success: true };
  },

  // 恢复删除的器材
  restoreEquipment(equipmentId) {
    let deletedList = wx.getStorageSync('deletedEquipmentList') || [];
    const equipment = deletedList.find(item => item.id === equipmentId);
    
    if (!equipment) {
      return { success: false, message: '未找到该器材' };
    }
    
    // 从回收站移除
    deletedList = deletedList.filter(item => item.id !== equipmentId);
    wx.setStorageSync('deletedEquipmentList', deletedList);
    
    // 添加回器材列表
    let equipmentList = this.getEquipmentList();
    const restoredEquipment = { ...equipment, isDeleted: false };
    delete restoredEquipment.deleteTime;
    equipmentList.push(restoredEquipment);
    wx.setStorageSync('equipmentList', equipmentList);
    
    // 记录活动
    this.logActivity({
      id: Date.now().toString(),
      type: '恢复',
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      content: `从回收站恢复了器材 ${equipment.name}`,
      createTime: new Date().toISOString()
    });
    
    return { success: true };
  },

  // 永久删除器材
  permanentlyDelete(equipmentId) {
    let deletedList = wx.getStorageSync('deletedEquipmentList') || [];
    const equipment = deletedList.find(item => item.id === equipmentId);
    
    if (!equipment) {
      return { success: false, message: '未找到该器材' };
    }
    
    // 从回收站永久删除
    deletedList = deletedList.filter(item => item.id !== equipmentId);
    wx.setStorageSync('deletedEquipmentList', deletedList);
    
    // 记录活动
    this.logActivity({
      id: Date.now().toString(),
      type: '永久删除',
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      content: `永久删除了器材 ${equipment.name}`,
      createTime: new Date().toISOString()
    });
    
    return { success: true };
  },

  // 记录活动日志
  logActivity(activity) {
    let activityLog = wx.getStorageSync('activityLog') || [];
    activityLog.unshift(activity); // 添加到最前面
    // 限制日志数量为100条
    if (activityLog.length > 100) {
      activityLog = activityLog.slice(0, 100);
    }
    wx.setStorageSync('activityLog', activityLog);
  },

  // 获取活动日志
  getActivityLog() {
    return wx.getStorageSync('activityLog') || [];
  },

  // 数据同步
  async syncData() {
    if (!wx.cloud) {
      return { success: false, message: '当前环境不支持云同步' };
    }
    
    try {
      // 这里是简化版同步逻辑，实际项目中应实现完整的云端同步
      return { success: true, pushed: 0, pulled: 0, message: '同步完成' };
    } catch (err) {
      return { success: false, message: err.message || '同步失败' };
    }
  },

  globalData: {
    userInfo: null,
    equipmentCache: {
      list: [],
      deletedList: []
    }
  }
})
    