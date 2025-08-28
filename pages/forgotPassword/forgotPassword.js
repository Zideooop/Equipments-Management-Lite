// pages/forgotPassword/forgotPassword.js
const app = getApp();
  // 返回登录页面
  const { safeNavigate } = require('../../utils/navigation.js');
Page({
  data: {
    username: '',
    newPassword: '',
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
    return require('../../utils/md5.js').md5(password);
  },

  // 表单验证
  validateForm() {
    const { username, newPassword, confirmPassword } = this.data;
    
    if (!username.trim()) {
      this.showError('请输入用户名');
      return false;
    }
    
    if (!newPassword.trim()) {
      this.showError('请输入新密码');
      return false;
    }
    
    if (newPassword.length < 6) {
      this.showError('密码长度不能少于6位');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      this.showError('两次输入的密码不一致');
      return false;
    }
    
    return true;
  },

  // 重置密码处理
  async resetPassword() {
    if (!this.validateForm()) return;
    
    const { username, newPassword } = this.data;
    this.setData({ isLoading: true });

    try {
      // 调用重置密码云函数
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'resetPassword',
          username,
          newPassword: this.encryptPassword(newPassword)
        }
      });

      this.setData({ isLoading: false });
      
      if (res.result.success) {
        wx.showToast({ 
          title: '密码重置成功', 
          icon: 'success', 
          duration: 2000 
        });
        setTimeout(() => {
          this.goToLogin();
        }, 2000);
      } else {
        this.showError(res.result.message || '密码重置失败');
      }
    } catch (err) {
      this.setData({ isLoading: false });
      console.error('密码重置失败', err);
      this.showError('网络错误，请稍后重试');
    }
  },


  goToLogin() {
    safeNavigate('/pages/login/login');
  }
  
});
