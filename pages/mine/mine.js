const app = getApp();
const { safeNavigate, safeBack } = require('../../utils/navigation.js');
const themeConfig = require('../../models/theme.js').default; // 修正路径和导入方式

Page({
  data: {
    userInfo: {},
    isGuest: true,
    syncStatus: '',
    lastSyncTime: '',
    isSyncing: false, // 同步中状态
    // 设置项数据
    settings: {
      notification: true,  // 消息通知开关
      autoSync: false,     // 自动同步开关
      theme: { ...themeConfig } // 主题设置
    }
  },

  onLoad() {
    this.updateUserStatus();
    this.loadSyncStatus();
    this.loadSettings(); // 加载设置项
  },

  onShow() {
    this.updateUserStatus();
    this.loadSyncStatus();
    this.loadSettings(); // 重新加载设置
  },

  // 更新用户状态
  updateUserStatus() {
    const globalUser = app.globalData.userInfo || {};
    const storageUser = wx.getStorageSync('userInfo') || {};
    const userInfo = { ...storageUser, ...globalUser };
    const isGuest = !userInfo || userInfo.isGuest || !userInfo.username;
    
    this.setData({
      userInfo: userInfo,
      isGuest: isGuest
    });
  },

  // 加载同步状态
  loadSyncStatus() {
    const lastSyncTime = wx.getStorageSync('lastSyncTime');
    const syncStatus = wx.getStorageSync('syncStatus') || '';
    
    if (lastSyncTime) {
      const date = new Date(lastSyncTime);
      const formattedTime = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      this.setData({
        lastSyncTime: formattedTime,
        syncStatus: syncStatus
      });
    } else {
      this.setData({
        lastSyncTime: '未同步',
        syncStatus: ''
      });
    }
  },

  // 加载设置项
  loadSettings() {
    const savedSettings = wx.getStorageSync('appSettings') || {};
    // 合并默认设置和保存的设置
    const settings = { ...this.data.settings, ...savedSettings };
    this.setData({ settings });
    
    // 应用设置（如深色模式）
    this.applySettings(settings);
  },

  // 应用设置
  applySettings(settings) {
    // 调用全局主题应用方法
    getApp().applyTheme(settings.theme);
  },

  // 保存设置项
  saveSettings() {
    wx.setStorageSync('appSettings', this.data.settings);
    this.applySettings(this.data.settings);
    wx.showToast({ title: '设置已保存' });
  },

  // 切换设置开关
  toggleSetting(e) {
    const key = e.currentTarget.dataset.key;
    const settings = { ...this.data.settings };
    settings[key] = !settings[key];
    this.setData({ settings });
    this.saveSettings();
  },

  // 跳转到器材管理中心（合并后的入口）
  navigateToManage() {
    if (this.data.isGuest) {
      this.showLoginGuide('器材管理功能需要登录后使用');
      return;
    }
    // 统一跳转至整合后的器材管理中心
    safeNavigate('/pages/equipmentHub/equipmentHub');
  },

  // 跳转到回收站
  navigateToRecycle() {
    if (this.data.isGuest) {
      this.showLoginGuide('回收站功能需要登录后使用');
      return;
    }
    safeNavigate('/pages/recycleBin/recycleBin');
  },

  // 跳转到首页操作记录
  navigateToRecords() {
    if (this.data.isGuest) {
      this.showLoginGuide('操作记录功能需要登录后使用');
      return;
    }
    // 跳转到首页并滚动到操作记录区域
    safeNavigate('/pages/index/index?scrollTo=records');
  },

  // 跳转到设置页面
  navigateToSetting() {
    safeNavigate('/pages/setting/setting');
  },

  // 数据同步
  syncData() {
    if (this.data.isGuest) {
      this.showLoginGuide('数据同步功能需要登录后使用');
      return;
    }
    
    this.setData({ isSyncing: true });
    app.syncData()
      .then((result) => {
        this.setData({ isSyncing: false });
        if (result.success) {
          const now = new Date();
          const formattedTime = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          
          wx.setStorageSync('lastSyncTime', now.toISOString());
          wx.setStorageSync('syncStatus', 'success');
          
          this.setData({
            lastSyncTime: formattedTime,
            syncStatus: 'success'
          });
          wx.showToast({ title: '同步成功' });
        } else {
          wx.setStorageSync('syncStatus', 'failed');
          this.setData({ syncStatus: 'failed' });
          wx.showToast({ title: '同步失败', icon: 'none' });
        }
      })
      .catch(() => {
        this.setData({ isSyncing: false, syncStatus: 'failed' });
        wx.setStorageSync('syncStatus', 'failed');
        wx.showToast({ title: '同步失败', icon: 'none' });
      });
  },

  // 显示登录引导
  showLoginGuide(content) {
    wx.showModal({
      title: '请先登录',
      content: content || '该功能需要登录后使用',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          safeNavigate('/pages/login/login');
        }
      }
    });
  },

  // 去登录
  goToLogin() {
    safeNavigate('/pages/login/login');
  },

  // 编辑资料
  editProfile() {
    safeNavigate('/pages/profile/edit');
  },

  // 确认退出登录
  confirmLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出当前登录吗？',
      confirmText: '退出',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.logout();
        }
      }
    });
  },

  // 退出登录
  logout() {
    app.globalData.userInfo = null;
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('token');
    this.updateUserStatus();
    wx.showToast({ title: '已退出登录' });
    safeNavigate('/pages/index/index');
  }
});
    