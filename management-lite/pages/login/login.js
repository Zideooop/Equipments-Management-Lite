// pages/login/login.js
const navigateUtils = require('../../utils/navigate.js');
const { safeNavigate, safeBack } = navigateUtils;

Page({
  data: {
    username: '',
    password: '',
    isLoading: false,
    showPassword: false,
    errorMsg: ''
  },

  onLoad: function() {
    console.log('登录页面加载完成');
    this.checkLoginStatus();
  },

  onReady: function() {
    console.log('登录页面准备就绪');
  },

  onShow: function() {
    this.checkLoginStatus();
  },

  checkLoginStatus: function() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo && (userInfo.token || userInfo.isGuest)) {
        setTimeout(() => {
          // 修复登录跳转逻辑，确保跳转到首页
          safeNavigate('/pages/index/index');
        }, 500);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
    }
  },

  handleUsernameInput: function(e) {
    this.setData({
      username: e.detail.value.trim(),
      errorMsg: ''
    });
  },

  handlePasswordInput: function(e) {
    this.setData({
      password: e.detail.value.trim(),
      errorMsg: ''
    });
  },

  togglePasswordVisibility: function() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  handleLogin: function() {
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
    
    // 调用云函数进行登录验证
    wx.cloud.callFunction({
      name: 'login',
      data: {
        username: username,
        password: password
      }
    }).then(res => {
      this.setData({ isLoading: false });
      
      if (res.result.success) {
        // 登录成功，保存用户信息
        const userInfo = res.result.userInfo;
        
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
        
        // 同步数据
        app.syncData(false);
        
        // 跳转到首页
        setTimeout(() => {
          safeNavigate('/pages/index/index');
        }, 1500);
      } else {
        // 登录失败
        this.setData({
          errorMsg: res.result.message || '用户名或密码错误'
        });
      }
    }).catch(err => {
      console.error('登录过程出错:', err);
      this.setData({
        isLoading: false,
        errorMsg: '登录失败，请重试'
      });
    });
  },

  wechatLogin: function() {
    this.setData({ isLoading: true, errorMsg: '' });
    
    wx.showLoading({ title: '登录中...' });
    
    // 调用微信登录接口
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          // 获取用户信息
          wx.getUserProfile({
            desc: '用于完善会员资料',
            success: (userInfoRes) => {
              // 调用云函数完成登录
              wx.cloud.callFunction({
                name: 'login',
                data: {
                  code: loginRes.code,
                  userInfo: userInfoRes.userInfo
                }
              }).then(res => {
                wx.hideLoading();
                this.setData({ isLoading: false });
                
                if (res.result.success) {
                  // 登录成功，保存用户信息
                  const userInfo = res.result.userInfo;
                  
                  // 保存到本地存储
                  wx.setStorageSync('userInfo', userInfo);
                  
                  // 更新全局数据
                  const app = getApp();
                  app.globalData.userInfo = userInfo;
                  
                  // 记录登录日志
                  app.addActivityLog({
                    type: '登录',
                    content: `${userInfo.nickName} 通过微信登录系统`,
                    equipmentId: ''
                  });
                  
                  wx.showToast({
                    title: '微信登录成功',
                    icon: 'success',
                    duration: 1500
                  });
                  
                  // 同步数据
                  app.syncData(false);
                  
                  // 跳转到首页
                  setTimeout(() => {
                    safeNavigate('/pages/index/index');
                  }, 1500);
                } else {
                  this.setData({
                    errorMsg: res.result.message || '登录失败，请重试'
                  });
                }
              }).catch(err => {
                wx.hideLoading();
                this.setData({ isLoading: false });
                console.error('云函数登录失败:', err);
                this.setData({
                  errorMsg: '登录失败，请重试'
                });
              });
            },
            fail: (err) => {
              wx.hideLoading();
              this.setData({ isLoading: false });
              console.error('获取用户信息失败:', err);
              this.setData({
                errorMsg: '请允许获取用户信息以完成登录'
              });
            }
          });
        } else {
          wx.hideLoading();
          this.setData({ isLoading: false });
          console.error('登录失败：' + loginRes.errMsg);
          this.setData({
            errorMsg: '登录失败，请重试'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        this.setData({ isLoading: false });
        console.error('登录接口调用失败:', err);
        this.setData({
          errorMsg: '登录失败，请重试'
        });
      }
    });
  },

  guestLogin: function() {
    // 游客登录
    const guestInfo = {
      username: 'guest',
      nickName: '游客',
      isGuest: true,
      loginTime: new Date().toISOString()
    };
    
    // 保存到本地存储
    wx.setStorageSync('userInfo', guestInfo);
    
    // 更新全局数据
    const app = getApp();
    app.globalData.userInfo = guestInfo;
    
    // 记录登录日志
    app.addActivityLog({
      type: '登录',
      content: '游客登录系统',
      equipmentId: ''
    });
    
    wx.showToast({
      title: '游客登录成功',
      icon: 'success',
      duration: 1500
    });
    
    // 跳转到首页
    setTimeout(() => {
      safeNavigate('/pages/index/index');
    }, 1500);
  },

  navigateToRegister: function() {
    safeNavigate('/pages/register/register');
  },

  handleForgotPassword: function() {
    wx.showModal({
      title: '忘记密码',
      content: '请联系系统管理员重置密码',
      showCancel: false
    });
  }
});
