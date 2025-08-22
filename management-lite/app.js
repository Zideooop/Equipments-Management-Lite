// app.js
App({
  onLaunch() {
    // 初始化本地存储
    if (!wx.getStorageSync('equipmentList')) {
      wx.setStorageSync('equipmentList', []);
    }
    if (!wx.getStorageSync('deletedEquipmentList')) {
      wx.setStorageSync('deletedEquipmentList', []);
    }
    if (!wx.getStorageSync('activityLog')) {
      wx.setStorageSync('activityLog', []);
    }
    if (!wx.getStorageSync('userInfo')) {
      // 默认用户信息
      wx.setStorageSync('userInfo', {
        username: '管理员',
        phone: '13800138000'
      });
    }
    
    // 读取用户信息到全局
    this.globalData.userInfo = wx.getStorageSync('userInfo');
  },

  // 全局数据
  globalData: {
    userInfo: null,
    filterStatus: null // 用于传递筛选状态的全局变量
  },

  // 获取器材列表
  getEquipmentList() {
    return wx.getStorageSync('equipmentList') || [];
  },

  // 保存器材
  saveEquipment(equipment) {
    // 生成唯一ID
    const id = equipment.id || Date.now().toString();
    
    // 基础验证
    if (!equipment.name || !equipment.type) {
      return { success: false, message: '器材名称和类型为必填项' };
    }
    
    const equipmentList = wx.getStorageSync('equipmentList') || [];
    
    // 检查是否是更新操作
    const index = equipmentList.findIndex(item => item.id === id);
    
    const now = new Date().toISOString();
    const newEquipment = {
      ...equipment,
      id,
      updateTime: now,
      status: equipment.status || '在库'
    };
    
    if (index > -1) {
      // 更新现有器材
      newEquipment.createTime = equipmentList[index].createTime; // 保留创建时间
      equipmentList[index] = newEquipment;
      
      this.addActivityLog({
        type: '更新',
        content: `更新了器材【${newEquipment.name}】`,
        equipmentId: newEquipment.id
      });
    } else {
      // 添加新器材
      newEquipment.createTime = now;
      equipmentList.push(newEquipment);
      
      this.addActivityLog({
        type: '添加',
        content: `添加了新器材【${newEquipment.name}】`,
        equipmentId: newEquipment.id
      });
    }
    
    wx.setStorageSync('equipmentList', equipmentList);
    return { success: true, data: newEquipment };
  },

  // 删除器材（移至回收站）
  deleteEquipment(id) {
    const equipmentList = wx.getStorageSync('equipmentList') || [];
    const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
    
    const index = equipmentList.findIndex(item => item.id === id);
    
    if (index > -1) {
      const deletedItem = equipmentList.splice(index, 1)[0];
      deletedItem.deleteTime = new Date().toISOString();
      deletedList.push(deletedItem);
      
      wx.setStorageSync('equipmentList', equipmentList);
      wx.setStorageSync('deletedEquipmentList', deletedList);
      
      this.addActivityLog({
        type: '删除',
        content: `删除了器材【${deletedItem.name}】`,
        equipmentId: id
      });
      
      return { success: true };
    }
    
    return { success: false, message: '器材不存在' };
  },

  // 恢复器材
  restoreEquipment(id) {
    const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
    const equipmentList = wx.getStorageSync('equipmentList') || [];
    
    const index = deletedList.findIndex(item => item.id === id);
    
    if (index > -1) {
      const restoredItem = deletedList.splice(index, 1)[0];
      delete restoredItem.deleteTime;
      equipmentList.push(restoredItem);
      
      wx.setStorageSync('deletedEquipmentList', deletedList);
      wx.setStorageSync('equipmentList', equipmentList);
      
      this.addActivityLog({
        type: '恢复',
        content: `恢复了器材【${restoredItem.name}】`,
        equipmentId: id
      });
      
      return { success: true };
    }
    
    return { success: false, message: '器材不存在' };
  },

  // 永久删除器材
  permanentlyDelete(id) {
    const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
    const index = deletedList.findIndex(item => item.id === id);
    
    if (index > -1) {
      const permanentlyDeleted = deletedList.splice(index, 1)[0];
      wx.setStorageSync('deletedEquipmentList', deletedList);
      
      this.addActivityLog({
        type: '删除',
        content: `永久删除了器材【${permanentlyDeleted.name}】`,
        equipmentId: id
      });
      
      return { success: true };
    }
    
    return { success: false, message: '器材不存在' };
  },

  // 获取活动日志
  getActivityLog() {
    return wx.getStorageSync('activityLog') || [];
  },

  // 保存活动记录
  addActivityLog(activity) {
    const logs = wx.getStorageSync('activityLog') || [];
    logs.push({
      id: Date.now().toString(),
      createTime: new Date().toISOString(),
      ...activity
    });
    wx.setStorageSync('activityLog', logs);
  },

  // 更新器材状态（借出/归还）
  updateEquipmentStatus(id, status, borrowInfo = {}) {
    const equipmentList = wx.getStorageSync('equipmentList') || [];
    const index = equipmentList.findIndex(item => item.id === id);
    
    if (index > -1) {
      const equipment = equipmentList[index];
      const oldStatus = equipment.status;
      equipment.status = status;
      equipment.updateTime = new Date().toISOString();
      
      // 处理借出信息
      if (status === '借出') {
        // 记录借出信息，默认使用当前登录用户
        const userInfo = this.globalData.userInfo || {};
        equipment.borrower = borrowInfo.borrower || userInfo.username || '';
        equipment.contact = borrowInfo.contact || userInfo.phone || '';
        equipment.borrowTime = new Date().toISOString();
        equipment.returnTime = borrowInfo.returnTime || '';
        equipment.returnActualTime = '';
        
        this.addActivityLog({
          type: '借出',
          content: `借出了器材【${equipment.name}】给${equipment.borrower}`,
          equipmentId: id
        });
      } else if (status === '在库' && oldStatus === '借出') {
        // 记录归还信息
        equipment.returnActualTime = new Date().toISOString();
        
        this.addActivityLog({
          type: '归还',
          content: `器材【${equipment.name}】已归还`,
          equipmentId: id
        });
      }
      
      wx.setStorageSync('equipmentList', equipmentList);
      return { success: true, data: equipment };
    }
    
    return { success: false, message: '器材不存在' };
  }
})
