Page({
  data: {
    // 用户是否为游客模式
    isGuest: false,
    // 应用设置
    settings: {
      notification: true,
      autoSync: true,
      theme: {
        mode: 'auto', // auto, manual
        darkMode: false,
        color: 'blue' // blue, green, orange, purple
      }
    },
    // 主题模式文本
    themeModeText: '跟随系统',
    // 缓存大小
    cacheSize: '1.2MB',
    // 应用版本
    version: '1.0.0'
  },

  onLoad() {
    // 加载本地存储的设置
    this.loadSettings();
    // 检查用户登录状态
    this.checkLoginStatus();
    // 获取缓存大小
    this.getCacheSize();
    // 获取应用版本
    this.getAppVersion();
  },

  // 加载本地存储的设置
  loadSettings() {
    const storedSettings = wx.getStorageSync('appSettings');
    if (storedSettings) {
      this.setData({
        settings: storedSettings
      });
      this.updateThemeModeText();
    }
  },

  // 检查用户登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({
      isGuest: !userInfo
    });
  },

  // 获取缓存大小
  getCacheSize() {
    // 实际项目中应该计算真实缓存大小
    wx.getStorageInfo({
      success: (res) => {
        const size = res.currentSize / 1024; // 转换为MB
        this.setData({
          cacheSize: size.toFixed(2) + 'MB'
        });
      }
    });
  },

  // 获取应用版本
  getAppVersion() {
    const version = wx.getAccountInfoSync().miniProgram.version;
    if (version) {
      this.setData({
        version: version
      });
    }
  },

  // 返回上一页
  onBack() {
    wx.navigateBack();
  },

  // 导航到编辑个人信息页面
  navigateToEditProfile() {
    wx.navigateTo({
      url: '/pages/edit-profile/edit-profile'
    });
  },

  // 修改密码
  changePassword() {
    wx.navigateTo({
      url: '/pages/change-password/change-password'
    });
  },

  // 确认退出登录
  confirmLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前登录吗？',
      confirmText: '退出',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          this.logout();
        }
      }
    });
  },

  // 执行退出登录
  logout() {
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('token');
    this.setData({
      isGuest: true
    });
    
    wx.showToast({
      title: '已退出登录',
      icon: 'none'
    });
    
    // 跳转到登录页
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/login/login'
      });
    }, 1500);
  },

  // 切换设置开关
  toggleSetting(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;
    
    // 更新嵌套对象的处理
    if (key.includes('.')) {
      const keys = key.split('.');
      const newSettings = {...this.data.settings};
      newSettings[keys[0]][keys[1]] = value;
      this.setData({
        settings: newSettings
      });
    } else {
      this.setData({
        [`settings.${key}`]: value
      });
    }
    
    // 保存设置到本地存储
    app.saveEquipmentList('appSettings', this.data.settings);
    
    // 如果是主题模式变更，更新显示文本
    if (key === 'theme.mode') {
      this.updateThemeModeText();
    }
    
    // 触发主题更新
    if (key.includes('theme')) {
      this.updateTheme();
    }
  },

  // 更新主题模式文本
  updateThemeModeText() {
    const mode = this.data.settings.theme.mode;
    let text = '跟随系统';
    if (mode === 'manual') {
      text = this.data.settings.theme.darkMode ? '深色模式' : '浅色模式';
    }
    this.setData({
      themeModeText: text
    });
  },

  // 显示主题模式选择
  showThemeModeSelect() {
    wx.showActionSheet({
      itemList: ['跟随系统', '手动切换'],
      success: (res) => {
        const mode = res.tapIndex === 0 ? 'auto' : 'manual';
        this.setData({
          'settings.theme.mode': mode
        });
        this.updateThemeModeText();
        app.saveEquipmentList('appSettings', this.data.settings);
        this.updateTheme();
      }
    });
  },

  // 设置主题颜色
  setThemeColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      'settings.theme.color': color
    });
    app.saveEquipmentList('appSettings', this.data.settings);
    this.updateTheme();
  },

  // 更新主题
  updateTheme() {
    // 这里可以根据设置更新全局主题
    const theme = this.data.settings.theme;
    // 实际项目中可以通过wx.setNavigationBarColor等API更新导航栏颜色
    // 或者通过全局变量让其他页面也能获取到主题设置
    
    // 示例：根据主题颜色设置导航栏
    let navColor = '#3498db'; // 默认蓝色
    switch(theme.color) {
      case 'green':
        navColor = '#2ecc71';
        break;
      case 'orange':
        navColor = '#e67e22';
        break;
      case 'purple':
        navColor = '#9b59b6';
        break;
    }
    
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: navColor
    });
  },

  // 清理缓存
  clearCache() {
    wx.showModal({
      title: '清理缓存',
      content: '确定要清理应用缓存吗？',
      confirmText: '清理',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          this.setData({
            cacheSize: '0.00MB'
          });
          wx.showToast({
            title: '缓存已清理',
            icon: 'none'
          });
          
          // 重新加载设置
          this.loadSettings();
          this.checkLoginStatus();
        }
      }
    });
  },

  // 检查更新
  checkForUpdate() {
    wx.showLoading({
      title: '检查更新中...',
      mask: true
    });
    
    // 模拟检查更新
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '当前已是最新版本',
        icon: 'none'
      });
    }, 1500);
  },

  // 显示关于我们弹窗
  showAboutModal() {
    wx.showModal({
      title: '关于我们',
      content: '这是一个示例应用，用于展示设置页面功能。\n版本号：v' + this.data.version,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy-policy/privacy-policy'
    });
  }
});
