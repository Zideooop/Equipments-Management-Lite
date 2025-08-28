// pages/mine/mine.js
const app = getApp();
// 修复：正确引入导航工具（路径根据实际项目结构调整）
const { safeNavigate, safeBack } = require('../../utils/navigation.js');

Page({
  data: {
    userInfo: null,
    recycleCount: 0, // 回收站数量
    lastSyncTime: '未同步' // 最后同步时间
  },

  onLoad() {
    // 初始化数据
    this.loadUserInfo();
    this.loadRecycleCount();
    this.loadLastSyncTime();
  },

  onShow() {
    this.loadUserInfo();
    this.loadRecycleCount();
  },

  // 加载用户信息
  loadUserInfo() {
    const app = getApp();
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    this.setData({ userInfo });
  },

  // 加载回收站数量
  loadRecycleCount() {
    const app = getApp();
    const recycleBin = app.getRecycleBin() || [];
    this.setData({ recycleCount: recycleBin.length });
  },

  // 加载最后同步时间
  loadLastSyncTime() {
    const lastSyncTime = wx.getStorageSync('lastSyncTime') || '未同步';
    this.setData({ lastSyncTime });
  },

  // 跳转到回收站
  goToRecycleBin() {
    safeNavigate('/pages/recycleBin/recycleBin');
  },

// 替换原goToAbout方法
goToAbout() {
  wx.showModal({
    title: '关于系统',
    content: '器材管理系统 v1.2.0\n\n功能说明：\n- 支持器材的添加、编辑、删除\n- 提供器材借还记录管理\n- 回收站功能，防止误删除\n- 数据本地存储与同步',
    showCancel: false,
    confirmText: '我知道了'
  });
},
  

  goToLogin() {
    safeNavigate('/pages/login/login');
  },

  // 跳转到个人资料页
  goToProfile() {
    wx.showToast({
      title: '个人资料页暂未开放',
      icon: 'none',
      duration: 2000
    })
  },

  // 数据同步
  syncData() {
    const app = getApp();
    app.syncData().then(success => {
      if (success) {
        this.loadLastSyncTime();
        this.loadRecycleCount();
      }
    });
  },



  // 跳转到借还记录页面
  goToBorrowRecord() {
    safeNavigate('/pages/borrowRecord/borrowRecord');
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmText: '退出',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.globalData.userInfo = null;
          wx.removeStorageSync('userInfo');
          app.addOperationLog('用户退出登录');
          this.setData({ userInfo: null });
          safeNavigate('/pages/login/login');
        }
      }
    });
  }
});
