/**
 * 导航工具类
 * 解决this上下文丢失问题，支持tabBar页面跳转
 * 版本：1.2.0
 */

// tabBar页面配置（请根据你的app.json实际配置修改）
const TABBAR_PAGES = [
  '/pages/index/index',    // 首页
  '/pages/mine/mine'       // 我的页面（示例）
  // 其他tabBar页面...
];

// 定义导航工具对象
const navigation = {
  /**
   * 判断是否为tabBar页面
   * @param {string} url - 页面路径
   * @returns {boolean}
   */
  isTabBarPage(url) {
    const baseUrl = url.split('?')[0]; // 移除参数部分
    return TABBAR_PAGES.includes(baseUrl);
  },

  /**
   * 安全返回上一页
   * @param {number} delta - 返回页数
   */
  safeBack(delta = 1) {
    try {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack({ 
          delta: Math.min(delta, pages.length - 1),
          fail: () => this.safeRedirect('/pages/index/index')
        });
      } else {
        this.safeRedirect('/pages/index/index');
      }
    } catch (error) {
      console.error('safeBack异常:', error);
      wx.showToast({ title: '返回失败', icon: 'none' });
    }
  },

  /**
   * 安全导航到新页面（修复this上下文问题）
   * @param {string} url - 目标页面路径
   * @param {Object} [params={}] - 页面参数
   * @returns {Promise}
   */
  safeNavigate(url, params = {}) {
    // 保存当前上下文（箭头函数会继承此this）
    const self = this;
    
    return new Promise((resolve, reject) => {
      try {
        // 校验URL格式
        if (typeof url !== 'string' || url.trim() === '') {
          reject(new Error('导航路径必须是字符串'));
          return;
        }

        // 处理基础路径和参数
        const baseUrl = url.split('?')[0];
        let fullUrl = baseUrl;

        // 非tabBar页面才处理参数
        if (!self.isTabBarPage(baseUrl)) {
          const paramStr = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');
          fullUrl = paramStr ? `${baseUrl}?${paramStr}` : baseUrl;
        }

        // 根据页面类型选择跳转方式
        if (self.isTabBarPage(baseUrl)) {
          // tabBar页面必须用switchTab
          wx.switchTab({
            url: fullUrl,
            success: resolve,
            fail: (err) => {
              console.error('tabBar跳转失败:', err);
              reject(err);
            }
          });
        } else {
          // 普通页面用navigateTo
          wx.navigateTo({
            url: fullUrl,
            success: resolve,
            fail: (err) => {
              console.error('页面跳转失败:', err);
              // 处理页面栈溢出
              if (err.errMsg.includes('page stack overflow')) {
                wx.redirectTo({ url: fullUrl, success: resolve, fail: reject });
              } else {
                reject(err);
              }
            }
          });
        }
      } catch (error) {
        console.error('safeNavigate异常:', error);
        reject(error);
      }
    });
  },

  /**
   * 安全重定向页面
   * @param {string} url - 目标页面路径
   * @param {Object} [params={}] - 页面参数
   */
  safeRedirect(url, params = {}) {
    try {
      if (typeof url !== 'string' || url.trim() === '') {
        throw new Error('重定向路径必须是字符串');
      }

      const baseUrl = url.split('?')[0];
      let fullUrl = baseUrl;

      if (!this.isTabBarPage(baseUrl)) {
        const paramStr = Object.keys(params)
          .map(key => `${key}=${encodeURIComponent(params[key])}`)
          .join('&');
        fullUrl = paramStr ? `${baseUrl}?${paramStr}` : baseUrl;
      }

      // tabBar页面用switchTab，其他用redirectTo
      if (this.isTabBarPage(baseUrl)) {
        wx.switchTab({ url: fullUrl });
      } else {
        wx.redirectTo({ url: fullUrl });
      }
    } catch (error) {
      console.error('safeRedirect异常:', error);
      wx.showToast({ title: '跳转失败', icon: 'none' });
    }
  }
};

// 绑定上下文，确保方法中的this始终指向navigation对象
module.exports = {
  safeNavigate: navigation.safeNavigate.bind(navigation),
  safeBack: navigation.safeBack.bind(navigation),
  safeRedirect: navigation.safeRedirect.bind(navigation)
};
