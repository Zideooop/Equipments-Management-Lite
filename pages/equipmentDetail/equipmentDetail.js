// pages/equipmentDetail/equipmentDetail.js
const app = getApp();
const { safeNavigate, safeBack } = require('../../utils/navigation.js');

Page({
  data: {
    equipment: null,
    isLoading: true,
    fromRecycle: false,
    isGuest: true,
    isAdmin: false,
    borrowDialogVisible: false,
    returnDialogVisible: false,
    deleteDialogVisible: false,
    borrowInfo: {
      borrower: '',
      borrowDate: '',
      expectedReturnDate: '',
      notes: ''
    }
  },

  onLoad(options) {
    this.setData({
      fromRecycle: options.fromRecycle === 'true',
      // 初始化日期为今天
      'borrowInfo.borrowDate': this.formatDate(new Date())
    });
    
  // 设置预计归还日期为7天后
  const expectedDate = new Date();
  expectedDate.setDate(expectedDate.getDate() + 7);
  this.setData({
    'borrowInfo.expectedReturnDate': this.formatDate(expectedDate)
  });
  
  this.checkUserPermission();
  this.loadEquipmentDetail(options.id);
},

  // 检查用户权限
  checkUserPermission() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {};
    this.setData({
      isGuest: !userInfo || userInfo.isGuest || !userInfo.username,
      isAdmin: userInfo.role === 'admin'
    });
  },

  // 加载器材详情
  loadEquipmentDetail(id) {
    this.setData({ isLoading: true });
    
    try {
      const equipmentList = this.data.fromRecycle ? 
        app.getRecycleBin() : 
        (app.globalData.equipmentList || wx.getStorageSync('equipmentList') || []);
      
      const equipment = equipmentList.find(item => item.id === id);
      
      if (equipment) {
        this.setData({ equipment });
      } else {
        wx.showToast({ title: '未找到器材信息', icon: 'none' });
        setTimeout(() => safeBack(), 1000);
      }
    } catch (error) {
      console.error('加载器材详情失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 打开借还对话框
  openDialog(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      [`${type}DialogVisible`]: true
    });
  },

  // 关闭对话框
  closeDialog(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      [`${type}DialogVisible`]: false
    });
  },

  // 输入框变化
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`borrowInfo.${field}`]: e.detail.value
    });
  },

  // 日期选择变化
  onDateChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`borrowInfo.${field}`]: e.detail.value
    });
  },

  // 处理借出操作
  handleBorrow() {
    if (this.data.isGuest) {
      this.showLoginGuide();
      return;
    }

    const { equipment, borrowInfo } = this.data;
    if (!borrowInfo.borrower) {
      wx.showToast({ title: '请填写借阅人', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '处理中...' });
    
    try {
      // 更新器材状态
      equipment.status = '借出';
      equipment.borrowInfo = borrowInfo;
      equipment.borrowTime = new Date().toISOString();
      equipment.isSynced = false; // 标记为未同步
      
      // 更新全局数据
      const index = app.globalData.equipmentList.findIndex(item => item.id === equipment.id);
      if (index !== -1) {
        app.globalData.equipmentList[index] = equipment;
        wx.setStorageSync('equipmentList', app.globalData.equipmentList);
        
        // 记录操作日志
        this.addOperationLog('借出');
        
        // 标记数据已变更，需要同步
        app.markDataChanged();
        
        wx.hideLoading();
        wx.showToast({ title: '借出成功' });
        this.setData({ 
          equipment,
          borrowDialogVisible: false 
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('借出操作失败:', error);
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // 处理归还操作
  handleReturn() {
    if (this.data.isGuest) {
      this.showLoginGuide();
      return;
    }

    wx.showLoading({ title: '处理中...' });
    
    try {
      const { equipment } = this.data;
      // 更新器材状态
      equipment.status = '在库';
      equipment.returnTime = new Date().toISOString();
      equipment.isSynced = false; // 标记为未同步
      
      // 更新全局数据
      const index = app.globalData.equipmentList.findIndex(item => item.id === equipment.id);
      if (index !== -1) {
        app.globalData.equipmentList[index] = equipment;
        wx.setStorageSync('equipmentList', app.globalData.equipmentList);
        
        // 记录操作日志
        this.addOperationLog('归还');
        
        // 标记数据已变更，需要同步
        app.markDataChanged();
        
        wx.hideLoading();
        wx.showToast({ title: '归还成功' });
        this.setData({ 
          equipment,
          returnDialogVisible: false 
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('归还操作失败:', error);
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // 处理删除/恢复操作
  handleDeleteOrRestore() {
    if (this.data.isGuest) {
      this.showLoginGuide();
      return;
    }

    const { equipment, fromRecycle } = this.data;
    const actionType = fromRecycle ? '恢复' : '删除';
    
    wx.showLoading({ title: '处理中...' });
    
    try {
      if (fromRecycle) {
        // 从回收站恢复
        const recycleBin = app.getRecycleBin();
        const newRecycleBin = recycleBin.filter(item => item.id !== equipment.id);
        app.saveRecycleBin(newRecycleBin);
        
        // 添加回器材列表
        equipment.isDeleted = false;
        equipment.status = '在库';
        equipment.isSynced = false; // 标记为未同步
        app.globalData.equipmentList.push(equipment);
        wx.setStorageSync('equipmentList', app.globalData.equipmentList);
      } else {
        // 删除到回收站
        app.globalData.equipmentList = app.globalData.equipmentList.filter(
          item => item.id !== equipment.id
        );
        wx.setStorageSync('equipmentList', app.globalData.equipmentList);
        
        // 添加到回收站
        const recycleBin = app.getRecycleBin();
        equipment.isDeleted = true;
        equipment.isSynced = false; // 标记为未同步
        recycleBin.push(equipment);
        app.saveRecycleBin(recycleBin);
      }
      
      // 记录操作日志
      this.addOperationLog(actionType);
      
      // 标记数据已变更，需要同步
      app.markDataChanged();
      
      wx.hideLoading();
      wx.showToast({ title: `${actionType}成功` });
      setTimeout(() => safeBack(), 1000);
    } catch (error) {
      wx.hideLoading();
      console.error(`${actionType}操作失败:`, error);
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  /**
   * 跳转到编辑页面
   */
  goToEdit() {
    const { id } = this.data.equipment;
    if (id) {
      // 跳转到编辑页面，使用已有的添加页面
      safeNavigate('/pages/add/add', { id });
    } else {
      wx.showToast({ title: '获取器材信息失败', icon: 'none' });
    }
  },

  /**
   * 打开借出对话框
   */
  openBorrowDialog() {
    // 检查器材当前状态是否允许借出
    if (this.data.equipment.status !== '在库') {
      wx.showToast({ 
        title: `当前状态为${this.data.equipment.status}，无法借出`, 
        icon: 'none' 
      });
      return;
    }
    
    // 显示借出对话框
    this.setData({
      borrowDialogVisible: true
    });
  },

  /**
   * 将器材移到回收站
   */
  deleteToRecycle() {
    const { id, name } = this.data.equipment;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要将【${name}】移到回收站吗？`,
      confirmText: '确认',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.handleDeleteOrRestore();
        }
      }
    });
  },

  // 添加操作日志
  addOperationLog(actionType) {
    const { equipment } = this.data;
    const app = getApp();
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo') || {};
    
    let content = '';
    switch (actionType) {
      case '借出':
        content = `${userInfo.username} 借出了 ${equipment.name}，位于${equipment.location || '未设置位置'}`;
        break;
      case '归还':
        content = `${userInfo.username} 归还了 ${equipment.name}，位于${equipment.location || '未设置位置'}`;
        break;
      case '删除':
        content = `${userInfo.username} 删除了 ${equipment.name}(${equipment.type})`;
        break;
      case '恢复':
        content = `${userInfo.username} 恢复了 ${equipment.name}(${equipment.type})`;
        break;
      default:
        content = `${userInfo.username} 操作了 ${equipment.name}`;
    }
    
    const newActivity = {
      id: `log-${Date.now()}`,
      type: actionType,
      content,
      location: equipment.location,
      createTime: new Date().toISOString(),
      equipmentId: equipment.id
    };
    
    // 更新活动日志
    let activityLog = app.globalData.activityLog || wx.getStorageSync('activityLog') || [];
    activityLog.unshift(newActivity);
    app.globalData.activityLog = activityLog;
    wx.setStorageSync('activityLog', activityLog);
  },

  // 登录引导
  showLoginGuide() {
    wx.showModal({
      title: '登录提示',
      content: '登录后可进行借还操作',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/login/login' });
        }
      }
    });
  },

  // 返回
  goBack() {
    safeBack();
  }
})
