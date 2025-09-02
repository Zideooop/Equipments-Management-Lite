const app = getApp();
const { safeNavigate, safeBack } = require('../../utils/navigation.js');
const themeConfig = require('../../models/theme.js').default; // 修正导入

Page({
  data: {
    // 版本信息
    version: '1.3.8',
    // 缓存大小
    cacheSize: '0KB',
    // 功能开关状态
    settings: {
      notification: true,
      autoSync: false,
      theme: { ...themeConfig } // 主题设置
    },
    // 主题模式选项
    themeModes: [
      { value: 'auto', text: '跟随系统' },
      { value: 'light', text: '浅色模式' },
      { value: 'dark', text: '深色模式' }
    ],
    themeModeText: ''
  },

  onLoad() {
    this.loadSettings();
    this.calculateCacheSize();
  },

  // 加载设置
  loadSettings() {
    const savedSettings = wx.getStorageSync('appSettings') || {};
    // 合并默认设置和保存的设置
    const settings = { ...this.data.settings, ...savedSettings };
    
    this.setData({
      settings,
      themeModeText: this.getThemeModeText(settings.theme.mode)
    });
  },

  // 获取主题模式显示文本
  getThemeModeText(mode) {
    const modeItem = this.data.themeModes.find(item => item.value === mode);
    return modeItem ? modeItem.text : '跟随系统';
  },

  // 计算缓存大小
  calculateCacheSize() {
    wx.getStorageInfo({
      success: (res) => {
        const size = res.currentSize;
        let cacheSize;
        if (size < 1024) {
          cacheSize = `${size}B`;
        } else if (size < 1024 * 1024) {
          cacheSize = `${(size / 1024).toFixed(1)}KB`;
        } else {
          cacheSize = `${(size / (1024 * 1024)).toFixed(2)}MB`;
        }
        this.setData({ cacheSize });
      }
    });
  },

  // 检测更新功能
  checkForUpdate() {
    wx.showLoading({ title: '检测更新中...' });
    
    // 微信小程序更新API
    const updateManager = wx.getUpdateManager();
    
    // 检测到有新版本
    updateManager.onCheckForUpdate((res) => {
      if (res.hasUpdate) {
        // 新版本下载完成
        updateManager.onUpdateReady(() => {
          wx.hideLoading();
          wx.showModal({
            title: '更新提示',
            content: '发现新版本，是否立即更新？',
            confirmText: '立即更新',
            cancelText: '稍后',
            success: (result) => {
              if (result.confirm) {
                // 应用新版本并重启
                updateManager.applyUpdate();
              }
            }
          });
        });
        
        // 新版本下载失败
        updateManager.onUpdateFailed(() => {
          wx.hideLoading();
          wx.showToast({
            title: '更新失败，请稍后重试',
            icon: 'none'
          });
        });
      } else {
        wx.hideLoading();
        wx.showToast({
          title: '当前已是最新版本',
          icon: 'none'
        });
      }
    });
  },

  // 显示占位提示
  showPlaceholderToast() {
    wx.showToast({
      title: '该功能正在开发中',
      icon: 'none'
    });
  },

  // 显示关于我们弹窗
  showAboutModal() {
    wx.showModal({
      title: '关于我们',
      content: '器材管理系统 v' + this.data.version + '\n\n一款专业的器材管理工具，帮助您高效管理各类器材的借还与库存。\n\n© 2025 器材管理系统 版权所有',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 显示隐私政策弹窗
  showPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们重视您的隐私保护，不会收集您的个人信息。\n\n1. 您的登录信息仅用于身份验证\n2. 器材数据存储在本地或经您授权的云端\n3. 我们不会向第三方分享您的数据\n\n详细隐私政策将在后续版本中提供',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 切换设置开关
  toggleSetting(e) {
    const key = e.currentTarget.dataset.key;
    const newSettings = { ...this.data.settings };
    
    // 如果是主题相关设置
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      newSettings[parent][child] = !newSettings[parent][child];
    } else {
      newSettings[key] = !newSettings[key];
    }
    
    this.setData({ settings: newSettings });
    wx.setStorageSync('appSettings', newSettings);
    
    // 如果是主题设置变更，应用主题
    if (key.includes('theme.')) {
      getApp().applyTheme(newSettings.theme);
    }
  },

  // 显示主题模式选择器
  showThemeModeSelect() {
    const { theme } = this.data.settings;
    wx.showActionSheet({
      itemList: this.data.themeModes.map(item => item.text),
      success: (res) => {
        const selectedMode = this.data.themeModes[res.tapIndex].value;
        const { settings } = this.data;
        settings.theme.mode = selectedMode;
        
        this.setData({
          settings,
          themeModeText: this.getThemeModeText(selectedMode)
        });
        
        wx.setStorageSync('appSettings', settings);
        // 应用主题
        getApp().applyTheme(settings.theme);
      }
    });
  },

  // 设置主题颜色
  setThemeColor(e) {
    const { color } = e.currentTarget.dataset;
    const { settings } = this.data;
    settings.theme.color = color;
    this.setData({ settings });
    wx.setStorageSync('appSettings', settings);
    
    // 应用主题
    getApp().applyTheme(settings.theme);
  },

  // 清理缓存
  clearCache() {
    wx.showModal({
      title: '清理缓存',
      content: '确定要清除所有缓存数据吗？',
      confirmText: '清理',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清理中...' });
          wx.clearStorage({
            success: () => {
              wx.hideLoading();
              this.calculateCacheSize();
              wx.showToast({ title: '缓存清理完成' });
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '清理失败', icon: 'none' });
            }
          });
        }
      }
    });
  },

  // 退出登录
  confirmLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出当前登录吗？',
      confirmText: '退出',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          app.globalData.userInfo = null;
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('token');
          wx.showToast({ title: '已退出登录' });
          safeNavigate('/pages/login/login');
        }
      }
    });
  },

  // 返回上一页
  navigateBack() {
    safeBack();
  },
  
  // 处理返回按钮
  onBack() {
    safeBack();
  },
  
  // 显示关于页面
  showAbout() {
    this.showAboutModal();
  },
  
  // 修改密码
  changePassword() {
    this.showPlaceholderToast();
  },
  
  // 跳转到编辑个人信息
  navigateToEditProfile() {
    this.showPlaceholderToast();
  }
});
    