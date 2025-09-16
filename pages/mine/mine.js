const app = getApp();
const navigation = require('../../utils/navigation.js');
const themeConfig = require('../../models/theme.js').default;

Page({
  data: {
    userInfo: {},
    isGuest: true,
    syncStatus: '',
    lastSyncTime: '',
    isSyncing: false,
    settings: {
      notification: true,
      autoSync: false,
      theme: { ...themeConfig }
    }
  },

  onLoad() {
    this.updateUserStatus();
    this.loadSyncStatus();
    this.loadSettings();
    this.initEventListeners();
  },

  onShow() {
    this.updateUserStatus();
    this.loadSyncStatus();
    this.loadSettings();
  },

  onUnload() {
    if (this.syncListener) {
      app.globalEvent.off('syncCompleted', this.syncListener);
    }
  },

  initEventListeners() {
    this.syncListener = (data) => {
      this.loadSyncStatus();
    };
    app.globalEvent.on('syncCompleted', this.syncListener);
  },

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

  loadSettings() {
    const savedSettings = wx.getStorageSync('appSettings') || {};
    const settings = { ...this.data.settings, ...savedSettings };
    this.setData({ settings });
    this.applySettings(settings);
  },

  applySettings() {
    const app = getApp();
    if (app.themeManager) {
      app.themeManager.applyTheme({
        mode: this.data.themeMode,
        color: this.data.themeColor
      });
    }
  },

  saveSettings() {
    app.saveEquipmentList('appSettings', this.data.settings);
    this.applySettings(this.data.settings);
    wx.showToast({ title: '设置已保存' });
  },

  toggleSetting(e) {
    const key = e.currentTarget.dataset.key;
    const settings = { ...this.data.settings };
    settings[key] = !settings[key];
    this.setData({ settings });
    this.saveSettings();
  },

  // 修复核心功能入口跳转问题：简化判断逻辑，确保导航正常
  navigateToManage() {
    if (this.data.isGuest) {
      this.showLoginGuide('器材管理功能需要登录后使用');
      return;
    }
    // 直接使用wx.navigateTo确保跳转生效
    wx.navigateTo({
      url: '/pages/equipmentHub/equipmentHub',
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  navigateToRecycle() {
    if (this.data.isGuest) {
      this.showLoginGuide('回收站功能需要登录后使用');
      return;
    }
    wx.navigateTo({
      url: '/pages/recycleBin/recycleBin',
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  navigateToRecords() {
    if (this.data.isGuest) {
      this.showLoginGuide('操作记录功能需要登录后使用');
      return;
    }
    wx.navigateTo({
      url: '/pages/index/index?scrollTo=records',
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  navigateToSetting() {
    wx.navigateTo({
      url: '/pages/setting/setting',
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

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
          
          app.saveEquipmentList('lastSyncTime', now.toISOString());
          app.saveEquipmentList('syncStatus', 'success');
          
          this.setData({
            lastSyncTime: formattedTime,
            syncStatus: 'success'
          });
          
          app.globalEvent.emit('syncCompleted', {
            timestamp: now.toISOString()
          });
          
          wx.showToast({ title: '同步成功' });
        } else {
          app.saveEquipmentList('syncStatus', 'failed');
          this.setData({ syncStatus: 'failed' });
          wx.showToast({ title: '同步失败', icon: 'none' });
        }
      })
      .catch(() => {
        this.setData({ isSyncing: false, syncStatus: 'failed' });
        app.saveEquipmentList('syncStatus', 'failed');
        wx.showToast({ title: '同步失败', icon: 'none' });
      });
  },

  showLoginGuide(content) {
    wx.showModal({
      title: '请先登录',
      content: content || '该功能需要登录后使用',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/login/login',
            fail: (err) => {
              console.error('跳转登录失败:', err);
              wx.showToast({ title: '跳转失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login',
      fail: (err) => {
        console.error('前往登录页失败:', err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  // 移除编辑资料功能（如果不需要）
  editProfile() {
    wx.navigateTo({
      url: '/pages/profile/edit',
      fail: (err) => {
        console.error('前往编辑页失败:', err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

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

  logout() {
    // 清除登录状态
    app.globalData.userInfo = null;
    app.globalData.isGuest = true;
    app.globalData.isAdmin = false;
    wx.removeStorageSync('userInfo');
    
    // 跳转到首页
    wx.switchTab({
      url: '/pages/index/index',
      fail: (err) => {
        console.error('退出登录跳转失败:', err);
      }
    });
  }
});
