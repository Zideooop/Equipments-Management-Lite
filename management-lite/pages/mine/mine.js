// pages/mine/mine.js
Page({
  data: {
    userInfo: null,
    recycleCount: 0,
    lastSyncTime: ''
  },

  onShow() {
    // 获取用户信息
    const app = getApp();
    this.setData({ userInfo: app.globalData.userInfo });
    
    // 获取回收站数量
    const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
    this.setData({ recycleCount: deletedList.length });
    
    // 获取最后同步时间
    const lastSync = wx.getStorageSync('lastSyncTime');
    if (lastSync) {
      const date = new Date(lastSync);
      this.setData({
        lastSyncTime: `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      });
    }
  },

  // 跳转到登录页
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  // 跳转到个人资料页
  goToProfile() {
    wx.showToast({
      title: '个人资料功能开发中',
      icon: 'none'
    });
  },

  // 跳转到回收站
  goToRecycleBin() {
    wx.navigateTo({ url: '/pages/recycleBin/recycleBin' });
  },

  // 跳转到关于页面
  goToAbout() {
    wx.showModal({
      title: '关于器材管理系统',
      content: '版本: v1.0.0\n\n这是一个简单实用的器材管理系统，支持器材的添加、管理、借出和归还等功能。',
      showCancel: false
    });
  },

  // 数据同步
  syncData() {
    const app = getApp();
    wx.showLoading({ title: '同步中...' });
    
    app.syncData().then(result => {
      wx.hideLoading();
      if (result.success) {
        wx.setStorageSync('lastSyncTime', new Date().toISOString());
        this.onShow(); // 刷新页面
        wx.showToast({
          title: '同步成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result.message || '同步失败',
          icon: 'none'
        });
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.globalData.userInfo = null;
          wx.removeStorageSync('userInfo');
          this.setData({ userInfo: null });
          wx.showToast({ title: '已退出登录' });
        }
      }
    });
  }
})
    