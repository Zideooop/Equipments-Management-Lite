// pages/login/login.js
// 引用注册页面以避免被工具忽略
// require('../register/register.js'); 
// 在文件顶部添加
const { safeNavigate } = require('../../utils/navigation.js');

const app = getApp();

Page({
  data: {
    // 新增调试标记
    showDebug: true, // 正式版改为false
    username: '',
    password: '',
    rememberPassword: false,
    isLoading: false,
    showError: false,
    errorMsg: ''
  },

  // 游客登录
  visitorLogin() {
    const visitorInfo = {
      id: 'visitor_' + Date.now(),
      username: '游客_' + Math.random().toString(36).slice(-6),
      nickName: '游客用户',
      avatarUrl: '/images/page/page-profile.png', // 默认头像
      role: '游客',
      isGuest: true // 明确标记为游客
    };
    this.handleLoginSuccess(visitorInfo, false);
  },

  // 显示管理员登录
  showAdminLogin() {
    safeNavigate({
      url: '/pages/adminLogin/adminLogin', // 需创建管理员登录页
      fail: () => {
        this.showError('管理员页面未配置');
      }
    });
  },

  onLoad() {
    // 检查是否有保存的密码
    const savedUser = wx.getStorageSync('savedUser');
    if (savedUser && savedUser.rememberPassword) {
      this.setData({
        username: savedUser.username,
        password: savedUser.password,
        rememberPassword: savedUser.rememberPassword
      });
    }
  },

  // 输入框变化处理
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value,
      showError: false
    });
  },

  // 记住密码开关变化
  onRememberChange(e) {
    this.setData({ rememberPassword: e.detail.value });
  },

  // 显示错误信息
  showError(msg) {
    this.setData({
      showError: true,
      errorMsg: msg
    });
    setTimeout(() => {
      this.setData({ showError: false });
    }, 3000);
  },

  // 密码加密
  encryptPassword(password) {
    return require('../../utils/md5.js').md5(password);
  },

  // 处理登录成功 - 修复用户信息存储逻辑
  handleLoginSuccess(userInfo, rememberPassword) {
    // 保存用户信息到全局和本地存储，明确设置isGuest
    const userData = {
      ...userInfo,
      isGuest: userInfo.role === '游客' // 只有游客角色才标记为游客
    };
    
    app.globalData.userInfo = userData;
    wx.setStorageSync('userInfo', userData);

    // 如果需要记住密码，保存用户名和密码
    if (rememberPassword) {
      wx.setStorageSync('savedUser', {
        username: this.data.username,
        password: this.data.password,
        rememberPassword: true
      });
    } else {
      // 清除保存的密码
      wx.removeStorageSync('savedUser');
    }

    // 显示成功提示并跳转到首页
    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1500,
      success: () => {
        setTimeout(() => {
          // 返回首页并强制刷新
          const pages = getCurrentPages();
          if (pages.length > 1) {
            // 如果首页在页面栈中，返回并刷新
            wx.navigateBack({
              delta: pages.length - 1,
              success: () => {
                const homePage = getCurrentPages()[0];
                if (homePage) homePage.onShow();
              }
            });
          } else {
            // 否则直接跳转
            safeNavigate({ url: '/pages/index/index' });
          }
        }, 1500);
      }
    });
  },

  clearLoginStatus() {
    console.warn('清除登录状态，调用栈：', new Error().stack); // 追踪调用来源
    app.globalData.userInfo = null;
    wx.removeStorageSync('userInfo');
  },

  // 账号密码登录
  login() {
    const { username, password, rememberPassword } = this.data;
    
    // 基础验证
    if (!username.trim()) return this.showError('请输入用户名');
    if (!password.trim()) return this.showError('请输入密码');

    this.setData({ isLoading: true });

    // 第一步：检查用户是否存在
    wx.cloud.callFunction({
      name: 'user',
      data: { action: 'checkUserExists', username },
      success: (existRes) => {
        if (!existRes.result.success) {
          this.showError('检查账号失败，请重试');
          this.setData({ isLoading: false });
          return;
        }

        // 账号不存在 - 提示注册
        if (!existRes.result.exists) {
          this.setData({ isLoading: false });
          wx.showModal({
            title: '账号不存在',
            content: '该账号未注册，是否前往注册？',
            confirmText: '去注册',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                this.goToRegister();
              }
            }
          });
          return;
        }

        // 账号存在 - 执行登录流程
        wx.cloud.callFunction({
          name: 'user',
          data: { 
            action: 'login',
            username, 
            password: this.encryptPassword(password)
          },
          success: (loginRes) => {
            const result = loginRes.result;
            if (result.success) {
              this.handleLoginSuccess(result.userInfo, rememberPassword);
            } else {
              this.showError(result.message || '用户名或密码错误');
            }
            this.setData({ isLoading: false });
          },
          fail: (err) => {
            console.error('登录失败', err);
            this.showError('登录失败，请检查网络');
            this.setData({ isLoading: false });
          }
        });
      },
      fail: (err) => {
        console.error('检查账号失败', err);
        this.showError('网络错误，请稍后重试');
        this.setData({ isLoading: false });
      }
    });
  },

  // 微信快捷登录
  wechatQuickLogin() {
    // 改为主动触发授权弹窗（兼容旧版本）
    wx.showModal({
      title: '授权提示',
      content: '需要获取您的微信昵称和头像用于登录',
      success: (res) => {
        if (res.confirm) {
          this.getWechatUserInfo();
        }
      }
    });
  },

  // 微信用户信息回调
  onWechatUserInfo(e) {
    if (e.detail.userInfo) {
      this.getWechatUserInfo();
    } else {
      this.showError('请允许获取用户信息以完成登录');
    }
  },

  getWechatUserInfo() {
    const { isLoading } = this.data;
    if (isLoading) return;
    this.setData({ isLoading: true, showError: false });
  
    // 调用登录接口获取code
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          this.showError('获取登录凭证失败');
          this.setData({ isLoading: false });
          return;
        }
  
        // 获取用户信息
        wx.getUserInfo({
          withCredentials: true,
          success: (userRes) => {
            // 调用云函数完成登录
            wx.cloud.callFunction({
              name: 'user',
              data: {
                action: 'login',
                code: loginRes.code,
                userInfo: userRes.userInfo // 包含nickName和avatarUrl
              },
              success: (res) => {
                const result = res.result;
                if (result.success) {
                  // 确保用户信息包含昵称和头像，明确标记非游客
                  this.handleLoginSuccess({
                    ...result.userInfo,
                    nickName: result.userInfo.nickName || userRes.userInfo.nickName,
                    avatarUrl: result.userInfo.avatarUrl || userRes.userInfo.avatarUrl,
                    role: result.userInfo.role || '普通用户',
                    isGuest: false // 微信登录用户不是游客
                  }, false);
                } else {
                  this.showError('微信登录失败：' + (result.message || '服务器验证失败'));
                }
                this.setData({ isLoading: false });
              },
              fail: () => {
                this.showError('微信登录请求失败，请检查网络');
                this.setData({ isLoading: false });
              }
            });
          },
          fail: (err) => {
            console.error('获取用户信息失败', err);
            this.showError('请允许获取用户信息以完成登录');
            this.setData({ isLoading: false });
          }
        });
      },
      fail: (err) => {
        console.error('获取登录凭证失败', err);
        this.showError('登录凭证获取失败，请重试');
        this.setData({ isLoading: false });
      }
    });
  },

  // 前往注册页面
  goToRegister() {
    safeNavigate({ 
      url: '/pages/register/register',
      fail: (err) => {
        console.error('跳转注册页失败', err);
        this.showError('页面加载失败，请重试');
      }
    });
  },

  // 前往找回密码页面
  goToForgotPassword() {
    safeNavigate({ url: '/pages/forgotPassword/forgotPassword' });
  }
});
    