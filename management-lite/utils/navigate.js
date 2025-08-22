// 导航工具函数 - 统一管理页面跳转，避免错误使用switchTab
const TabBarPages = [
  '/pages/index/index',    // 首页（TabBar页面）
  '/pages/manage/manage',  // 管理页（TabBar页面）
  '/pages/mine/mine'       // 我的页（TabBar页面）
];

/**
 * 安全的页面跳转方法
 * @param {string} url 目标页面路径
 */
function safeNavigate(url) {
  // 判断是否为TabBar页面
  const isTabBar = TabBarPages.some(tabPath => url.startsWith(tabPath));
  
  if (isTabBar) {
    wx.switchTab({ url });
  } else {
    wx.navigateTo({ url });
  }
}

/**
 * 返回上一页或默认页面
 * @param {string} defaultTab 当没有上一页时的默认TabBar页面
 */
function safeBack(defaultTab = '/pages/index/index') {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    wx.navigateBack({ delta: 1 });
  } else {
    // 确保默认页面是TabBar页面
    if (TabBarPages.includes(defaultTab)) {
      wx.switchTab({ url: defaultTab });
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  }
}

module.exports = {
  safeNavigate,
  safeBack,
  TabBarPages
};
