// utils/navigation.js
const TabBarPages = [
  '/pages/index/index', 
  '/pages/manage/manage', 
  '/pages/mine/mine'
];

module.exports = {
  // 安全跳转（支持TabBar和普通页面）
  safeNavigate: function(options) {
    const config = typeof options === 'string' ? { url: options } : options;
    const { url } = config;
    
    if (typeof url !== 'string') {
      wx.showToast({ title: '跳转地址格式错误', icon: 'none' });
      return;
    }
    
    const isTabBar = TabBarPages.some(tabPath => url.startsWith(tabPath));
    const navigateConfig = { url, ...config };
    
    if (isTabBar) {
      wx.switchTab(navigateConfig);
    } else {
      const app = getApp();
      const pagePaths = app.globalData.pagePaths || [];
      const pureUrl = url.split('?')[0];
      
      // 核心修改：允许跳转，仅在失败时提示（避免因配置问题阻塞正常功能）
      if (pagePaths.includes(pureUrl) || url.includes('?')) {
        wx.navigateTo(navigateConfig);
      } else {
        // 先尝试跳转，失败后再提示
        wx.navigateTo({
          ...navigateConfig,
          fail: (err) => {
            wx.showToast({ title: `页面不存在或无法跳转`, icon: 'none' });
            console.error(`页面不存在: ${url}`, err);
          }
        });
      }
    }
  }
  ,
  
  // 安全返回（无历史页时跳转到默认Tab）
  safeBack: function(defaultTab = '/pages/index/index') {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
    } else {
      this.safeNavigate(defaultTab);
    }
  }
};