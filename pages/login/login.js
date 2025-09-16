/**
 * 登录页面逻辑处理
 * 功能：提供账号密码登录、微信快捷登录、游客登录等功能
 * 作者：开源项目团队
 * 版本：1.0.0
 * 日期：2025-09-15
 */

// 导入导航工具
const { safeNavigate } = require('../../utils/navigation.js');

// 获取全局应用实例
const app = getApp();

Page({
  /**
   * 页面数据
   * @property {boolean} showDebug - 调试模式开关（正式环境应设为false）
   * @property {string} username - 用户名输入值
   * @property {string} password - 密码输入值
   * @property {boolean} rememberPassword - 是否记住密码
   * @property {boolean} isLoading - 加载状态标识
   * @property {boolean} showError - 错误提示显示状态
   * @property {string} errorMsg - 错误提示信息
   */
  data: {
    showDebug: true,
    username: '',
    password: '',
    rememberPassword: false,
    isLoading: false,
    showError: false,
    errorMsg: ''
  },

  /**
   * 生命周期函数：页面加载时执行
   * 功能：检查是否有保存的用户信息，自动填充表单
   */
  onLoad() {
    this._loadSavedUserInfo();
  },

  /**
   * 加载保存的用户信息
   * 私有方法，仅在当前页面内部使用
   */
  _loadSavedUserInfo() {
    try {
      const savedUser = wx.getStorageSync('savedUser');
      if (savedUser && savedUser.rememberPassword) {
        this.setData({
          username: savedUser.username,
          password: savedUser.password,
          rememberPassword: savedUser.rememberPassword
        });
      }
    } catch (err) {
      console.error('加载保存的用户信息失败:', err);
    }
  },

  /**
   * 游客登录功能
   * 功能：生成临时游客账号并完成登录流程
   */
  visitorLogin() {
    // 生成唯一游客信息
    const visitorInfo = {
      id: `visitor_${Date.now()}`,
      username: `游客_${Math.random().toString(36).slice(-6)}`,
      nickName: '游客用户',
      avatarUrl: '/images/page/page-profile.png',
      role: '游客',
      isGuest: true
    };

    // 处理登录成功逻辑
    this.handleLoginSuccess(visitorInfo, false);
  },

  /**
   * 跳转到管理员登录页面
   * 功能：导航至管理员专属登录界面
   */
  showAdminLogin() {
    safeNavigate('/pages/adminLogin/adminLogin')
      .catch((err) => {
        console.error('管理员登录页导航失败:', err);
        this.showError('管理员页面未配置');
      });
  },

  /**
   * 测试账号快捷登录
   * 功能：快速填充测试账号信息并登录（仅调试模式使用）
   */
  quickLoginTest() {
    if (!this.data.showDebug) {
      return this.showError('仅调试模式支持此功能');
    }
    
    this.setData({
      username: '1',
      password: '1'
    });
    this.login();
  },

  /**
   * 输入框变化处理
   * @param {Object} e - 事件对象
   * @param {Object} e.currentTarget.dataset - 包含字段标识
   * @param {Object} e.detail - 包含输入值
   */
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value,
      showError: false // 输入时隐藏错误提示
    });
  },

  /**
   * 记住密码开关变化处理
   * @param {Object} e - 事件对象
   * @param {boolean} e.detail.value - 开关状态
   */
  onRememberChange(e) {
    this.setData({ rememberPassword: e.detail.value });
  },

  /**
   * 显示错误信息
   * @param {string} msg - 错误信息内容
   */
  showError(msg) {
    this.setData({
      showError: true,
      errorMsg: msg
    });
    
    // 3秒后自动隐藏错误提示
    setTimeout(() => {
      this.setData({ showError: false });
    }, 3000);
  },

  /**
   * 密码加密处理
   * @param {string} password - 原始密码
   * @returns {string} 加密后的密码
   */
  encryptPassword(password) {
    // 导入MD5加密工具
    const md5 = require('../../utils/md5.js').md5;
    return md5(password);
  },

  /**
   * 处理登录成功逻辑
   * @param {Object} userInfo - 用户信息对象
   * @param {boolean} rememberPassword - 是否记住密码
   */
  handleLoginSuccess(userInfo, rememberPassword) {
    // 构建完整的用户数据对象
    const userData = {
      ...userInfo,
      isGuest: userInfo.role === '游客' // 明确标记是否为游客
    };
    
    // 更新全局用户信息
    app.globalData.userInfo = userData;
    app.globalData.isGuest = userData.isGuest;
    app.globalData.isAdmin = userData.role === 'admin';
    
    // 保存用户信息到本地存储
    app.saveEquipmentList('userInfo', userData);

    // 处理记住密码逻辑
    if (rememberPassword) {
      app.saveEquipmentList('savedUser', {
        username: this.data.username,
        password: this.data.password,
        rememberPassword: true
      });
    } else {
      // 清除保存的密码
      wx.removeStorageSync('savedUser');
    }

    // 显示登录成功提示并跳转首页
    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1500,
      success: () => {
        setTimeout(() => {
          this._navigateToHome();
        }, 1500);
      }
    });
  },

  /**
   * 导航至首页
   * 私有方法：根据页面栈情况决定返回或跳转
   */
  _navigateToHome() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      // 如果首页在页面栈中，返回并刷新
      wx.navigateBack({
        delta: pages.length - 1,
        success: () => {
          const homePage = getCurrentPages()[0];
          if (homePage && typeof homePage.onShow === 'function') {
            homePage.onShow(); // 触发首页刷新
          }
        }
      });
    } else {
      // 否则直接跳转首页
      safeNavigate('/pages/index/index');
    }
  },

  /**
   * 清除登录状态
   * 功能：清除全局和本地存储中的用户信息
   */
  clearLoginStatus() {
    if (this.data.showDebug) {
      console.warn('清除登录状态，调用栈：', new Error().stack);
    }
    
    app.globalData.userInfo = null;
    app.globalData.isGuest = false;
    app.globalData.isAdmin = false;
    
    try {
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('savedUser');
    } catch (err) {
      console.error('清除登录状态失败:', err);
    }
  },

  /**
   * 账号密码登录主逻辑
   * 功能：验证用户输入，调用云函数完成登录
   */
  login() {
    const { username, password, rememberPassword } = this.data;
    
    // 基础验证
    if (!username.trim()) return this.showError('请输入用户名');
    if (!password.trim()) return this.showError('请输入密码');

    // 显示加载状态
    this.setData({ isLoading: true });

    // 第一步：检查用户是否存在
    wx.cloud.callFunction({
      name: 'user',
      data: { action: 'checkUserExists', username },
      success: (existRes) => {
        this._handleUserExistsCheck(existRes, username, password, rememberPassword);
      },
      fail: (err) => {
        console.error('检查账号失败', err);
        this.showError('网络错误，请稍后重试');
        this.setData({ isLoading: false });
      }
    });
  },

  /**
   * 处理用户存在性检查结果
   * 私有方法：根据检查结果决定继续登录或提示注册
   */
  _handleUserExistsCheck(existRes, username, password, rememberPassword) {
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
    this._performLogin(username, password, rememberPassword);
  },

  /**
   * 执行登录请求
   * 私有方法：调用云函数完成实际登录验证
   */
  _performLogin(username, password, rememberPassword) {
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

  /**
   * 微信快捷登录入口
   * 功能：引导用户进行微信授权登录
   */
  wechatQuickLogin() {
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

  /**
   * 微信用户信息授权回调
   * @param {Object} e - 事件对象
   */
  onWechatUserInfo(e) {
    if (e.detail.userInfo) {
      this.getWechatUserInfo();
    } else {
      this.showError('请允许获取用户信息以完成登录');
    }
  },

  /**
   * 获取微信用户信息并完成登录
   * 功能：调用微信登录接口和用户信息接口，完成登录流程
   */
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
        wx.getUserProfile({
          desc: '用于完善会员资料', // 必须填写
          success: (userRes) => {
            this._wechatLoginWithInfo(loginRes.code, userRes.userInfo);
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

  /**
   * 使用微信用户信息完成登录
   * 私有方法：调用云函数完成微信登录
   */
  _wechatLoginWithInfo(code, userInfo) {
    wx.cloud.callFunction({
      name: 'user',
      data: {
        action: 'login',
        code: code,
        userInfo: userInfo
      },
      success: (res) => {
        const result = res.result;
        if (result.success) {
          // 确保用户信息完整
          this.handleLoginSuccess({
            ...result.userInfo,
            nickName: result.userInfo.nickName || userInfo.nickName,
            avatarUrl: result.userInfo.avatarUrl || userInfo.avatarUrl,
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

  /**
   * 前往注册页面
   * 功能：导航至用户注册页面
   */
  goToRegister() {
    safeNavigate('/pages/register/register')
      .catch((err) => {
        console.error('跳转注册页失败', err);
        this.showError('页面加载失败，请重试');
      });
  },

  /**
   * 前往找回密码页面
   * 功能：导航至密码找回页面
   */
  goToForgotPassword() {
    safeNavigate('/pages/forgotPassword/forgotPassword')
      .catch((err) => {
        console.error('跳转找回密码页失败', err);
        this.showError('页面加载失败，请重试');
      });
  }
});
