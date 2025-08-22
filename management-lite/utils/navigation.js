// utils/navigation.js
/**
 * 统一页面跳转工具函数
 * @param {string} url 页面路径
 * @param {boolean} isTabBar 是否为TabBar页面
 */
function navigateTo(url, isTabBar = false) {
  if (isTabBar) {
    wx.switchTab({ url });
  } else {
    wx.navigateTo({ url });
  }
}

/**
 * 判断页面是否为TabBar页面
 * @param {string} url 页面路径
 */
function isTabBarPage(url) {
  const tabBarPages = getApp().globalData.tabBarPages || [
    '/pages/index/index',
    '/pages/manage/manage',
    '/pages/recycleBin/recycleBin',
    '/pages/profile/profile'
  ];
  
  return tabBarPages.some(page => url.includes(page));
}

module.exports = {
  navigateTo,
  isTabBarPage
};
