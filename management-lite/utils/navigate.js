/**
 * 导航工具模块 - 统一管理页面跳转
 * 解决 "switchTab:fail can not switch to no-tabBar page" 错误
 */
module.exports = {
  /**
   * 安全导航方法
   * @param {string} url 目标页面路径
   */
  safeNavigate: function(url) {
    // 定义所有tabBar页面路径
    const tabBarPages = [
      '/pages/index/index',
      '/pages/manage/manage',
      '/pages/mine/mine'
    ];
    
    // 检查目标页面是否为tabBar页面
    const isTabBarPage = tabBarPages.some(tabPath => {
      // 处理带参数的URL情况
      const pureUrl = url.split('?')[0];
      return pureUrl === tabPath;
    });
    
    if (isTabBarPage) {
      // 对于tabBar页面使用switchTab
      wx.switchTab({
        url: url.split('?')[0], // 移除参数，switchTab不支持参数
        fail: (err) => {
          console.error('switchTab失败:', err);
          // 失败时降级使用navigateTo
          wx.navigateTo({ url });
        }
      });
    } else {
      // 非tabBar页面使用navigateTo
      wx.navigateTo({
        url,
        fail: (err) => {
          console.error('navigateTo失败:', err);
          // 尝试其他跳转方式
          wx.redirectTo({ url });
        }
      });
    }
  },
  
  /**
   * 安全返回方法
   * @param {string} defaultTab 当无法返回时的默认tab页面
   */
  safeBack: function(defaultTab = '/pages/index/index') {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 });
    } else {
      // 只有一个页面时，返回默认tab页面
      wx.switchTab({ url: defaultTab });
    }
  }
};
