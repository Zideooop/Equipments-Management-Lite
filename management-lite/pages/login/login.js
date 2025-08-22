// pages/login/login.js
Page({
  data: {
    username: '',
    password: ''
  },

  // 用户名输入
  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  // 登录
  login() {
    const { username, password } = this.data;
    
    // 简单验证
    if (!username) {
      wx.showToast({ title: '请输入用户名', icon: 'none' });
      return;
    }
    
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }
    
    // 这里是简化版登录逻辑，实际项目中应与后端验证
    // 临时演示：用户名和密码相同则登录成功
    if (username === password) {
      const userInfo = {
        nickName: username,
        loginTime: new Date().toISOString()
      };
      
      // 保存用户信息
      wx.setStorageSync('userInfo', userInfo);
      
      // 更新全局数据
      const app = getApp();
      app.globalData.userInfo = userInfo;
      
      wx.showToast({ title: '登录成功' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } else {
      wx.showToast({ title: '用户名或密码错误', icon: 'none' });
    }
  },

  // 跳转到注册页面
  goToRegister() {
    wx.showToast({
      title: '注册功能开发中',
      icon: 'none'
    });
  }
})
    