// pages/register/register.js
const app = getApp();
const { safeNavigate } = require('../../utils/navigation.js');
const { md5 } = require('../../utils/md5.js');

Page({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    isLoading: false,
    showError: false,
    errorMsg: ''
  },

  // 输入框变化处理
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value,
      showError: false
    });
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
    return md5(password);
  },

  // 表单验证
  validateForm() {
    const { username, password, confirmPassword } = this.data;
    
    if (!username.trim()) {
      this.showError('请输入用户名');
      return false;
    }
    
    if (username.length < 4) {
      this.showError('用户名长度不能少于4位');
      return false;
    }
    
    if (!password.trim()) {
      this.showError('请输入密码');
      return false;
    }
    
    if (password.length < 6) {
      this.showError('密码长度不能少于6位');
      return false;
    }
    
    if (password !== confirmPassword) {
      this.showError('两次输入的密码不一致');
      return false;
    }
    
    return true;
  },

  // 注册并自动登录处理
  async register() {
    if (!this.validateForm()) return;
    
    const { username, password } = this.data;
    this.setData({ isLoading: true });

    try {
      // 1. 调用注册云函数
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'register',
          username,
          password: this.encryptPassword(password)
        }
      });

      this.setData({ isLoading: false });
      
      if (res.result.success) {
        // 2. 注册成功后直接执行登录逻辑
        const userInfo = {
          username,
          role: res.result.role || 'user', // 从后端获取角色或使用默认值
          isLogin: true,
          // 保留后端返回的其他用户信息
          ...res.result.userInfo
        };
        
        // 3. 保存用户信息到全局和本地存储
        app.globalData.userInfo = userInfo;
        wx.setStorageSync('userInfo', userInfo);
        
        // 4. 提示并跳转首页
        wx.showToast({ 
          title: '注册成功,自动登录', 
          icon: 'success', 
          duration: 2000 
        });
        
        setTimeout(() => {
          safeNavigate('/pages/index/index'); // 直接跳转到首页
        }, 2000);
      } else {
        this.showError(res.result.message || '注册失败');
      }
    } catch (err) {
      this.setData({ isLoading: false });
      console.error('注册失败', err);
      this.showError('网络错误，请稍后重试');
    }
  },

  // 保留手动返回登录页的入口（可选）
  goToLogin() {
    safeNavigate('/pages/login/login');
  }
});
