// pages/adminLogin/adminLogin.js
const { safeNavigate } = require('../../utils/navigation.js');

Page({
  data: {
    adminPwd: '',
    isLoading: false
  },

  onPwdInput(e) {
    this.setData({
      adminPwd: e.detail.value
    });
  },

  handleLogin() {
    const { adminPwd } = this.data;
    
    if (!adminPwd) {
      wx.showToast({ title: '请输入管理员密码', icon: 'none' });
      return;
    }
    
    // 调试阶段使用固定密码，正式版需对接后端验证
    const DEBUG_ADMIN_PASSWORD = 'admin123'; // 调试用密码，正式版需修改
    
    this.setData({ isLoading: true });
    
    // 模拟登录验证
    setTimeout(() => {
      if (adminPwd === DEBUG_ADMIN_PASSWORD) {
        // 登录成功 - 保存管理员信息
        const adminInfo = {
          id: 'admin',
          username: '管理员',
          nickName: '系统管理员',
          avatarUrl: '/images/page/admin-avatar.png', // 可替换为实际管理员头像
          role: 'admin', // 标记为管理员角色
          isAdmin: true
        };
        
        // 保存到全局和本地存储
        const app = getApp();
        app.globalData.userInfo = adminInfo;
        wx.setStorageSync('userInfo', adminInfo);
        
        wx.showToast({ title: '管理员登录成功' });
        
        // 跳转到首页
        setTimeout(() => {
          safeNavigate('/pages/index/index');
        }, 1000);
      } else {
        wx.showToast({ title: '管理员密码错误', icon: 'none' });
        this.setData({ isLoading: false });
      }
    }, 800);
  },

  goBack() {
    // 返回普通登录页
    safeNavigate('/pages/login/login');
  }
});
