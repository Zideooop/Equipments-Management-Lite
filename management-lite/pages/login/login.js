// pages/login/login.js
// 导航工具模块 - 统一管理页面跳转
let navigateUtils;
try {
  navigateUtils = require('../../utils/navigate.js');
} catch (e) {
  try {
    navigateUtils = require('/utils/navigate.js');
  } catch (e2) {
    navigateUtils = {
      safeNavigate: function(url) {
        const TabBarPages = ['/pages/index/index', '/pages/manage/manage', '/pages/mine/mine'];
        const isTabBar = TabBarPages.some(tabPath => url.startsWith(tabPath));
        
        if (isTabBar) {
          wx.switchTab({ url });
        } else {
          wx.navigateTo({ url });
        }
      },
      safeBack: function(defaultTab = '/pages/index/index') {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack({ delta: 1 });
        } else {
          wx.switchTab({ url: defaultTab });
        }
      }
    };
    console.warn('导航工具模块未找到，使用降级版本');
  }
}

const { safeNavigate, safeBack } = navigateUtils;

Page({
  data: {
    username: '',
    password: '',
    isLoading: false,
    showPassword: false,
    errorMsg: ''
  },

  onLoad() {
    // 检查是否已登录，若已登录则跳转到首页
    this.checkLoginStatus();
  },

  onShow() {
    // 每次显示页面都检查登录状态
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo && userInfo.token) {
        // 已登录，跳转到首页
        setTimeout(() => {
          safeNavigate('/pages/index/index');
        }, 500);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      // 忽略错误，继续显示登录页面
    }
  },

  // 用户名输入
  handleUsernameInput(e) {
    this.setData({
      username: e.detail.value.trim(),
      errorMsg: ''
    });
  },

  // 密码输入
  handlePasswordInput(e) {
    this.setData({
      password: e.detail.value.trim(),
      errorMsg: ''
    });
  },

  // 切换密码显示状态
  togglePasswordVisibility() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 登录处理
  handleLogin() {
    const { username, password } = this.data;
    
    // 输入验证
    if (!username) {
      this.setData({ errorMsg: '请输入用户名' });
      return;
    }
    
    if (!password) {
      this.setData({ errorMsg: '请输入密码' });
      return;
    }
    
    // 显示加载状态
    this.setData({ isLoading: true, errorMsg: '' });
    
    try {
      // 模拟登录请求
      setTimeout(() => {
        // 实际项目中应替换为真实接口调用
        // 这里使用简单验证作为示例
        if (username === 'admin' && password === 'admin') {
          // 登录成功，保存用户信息
          const userInfo = {
            id: '1',
            username: username,
            nickName: '管理员',
            token: Date.now().toString(),
            loginTime: new Date().toISOString()
          };
          
          // 保存到本地存储
          wx.setStorageSync('userInfo', userInfo);
          
          // 更新全局数据
          const app = getApp();
          app.globalData.userInfo = userInfo;
          
          // 记录登录日志
          app.addActivityLog({
            type: '登录',
            content: `${username} 登录系统`,
            equipmentId: ''
          });
          
          // 登录成功提示
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 1500
          });
          
          // 跳转到首页
          setTimeout(() => {
            safeNavigate('/pages/index/index');
          }, 1500);
        } else {
          // 登录失败
          this.setData({
            isLoading: false,
            errorMsg: '用户名或密码错误'
          });
        }
      }, 1500);
    } catch (error) {
      console.error('登录过程出错:', error);
      this.setData({
        isLoading: false,
        errorMsg: '登录失败，请重试'
      });
    }
  },

  // 跳转到注册页面
  navigateToRegister() {
    safeNavigate('/pages/register/register');
  },

  // 忘记密码
  handleForgotPassword() {
    wx.showModal({
      title: '忘记密码',
      content: '请联系系统管理员重置密码',
      showCancel: false
    });
  }
})
