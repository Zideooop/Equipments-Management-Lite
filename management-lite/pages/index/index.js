// pages/index/index.js
Page({
  data: {
    totalEquipments: 0,
    availableEquipments: 0,
    borrowedEquipments: 0,
    recentActivities: [],
    isMenuOpen: false,
    isAnimating: false,
    userName: '',
    currentDate: ''
  },

  onLoad: function(options) {
    // 获取当前日期
    this.setCurrentDate();
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.username) {
      this.setData({ userName: userInfo.username });
    }
    
    this.loadLocalData();
    this.loadRecentActivities();
  },

  onShow: function() {
    this.loadLocalData();
    this.loadRecentActivities();
  },

  // 设置当前日期显示
  setCurrentDate: function() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    
    this.setData({
      currentDate: `${year}年${month}月${day}日 ${weekDay}`
    });
  },

  // 加载本地数据
  loadLocalData: function() {
    const app = getApp();
    const equipmentList = app.getEquipmentList();
    
    // 计算统计数据
    const total = equipmentList.length;
    const available = equipmentList.filter(item => item.status === '在库').length;
    const borrowed = equipmentList.filter(item => item.status === '借出').length;
    
    this.setData({
      totalEquipments: total,
      availableEquipments: available,
      borrowedEquipments: borrowed
    });
  },

  // 加载最近活动
  loadRecentActivities: function() {
    const activities = wx.getStorageSync('activityLog') || [];
    // 按时间排序，取最近5条
    const sortedActivities = activities.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    }).slice(0, 5);
    
    // 格式化时间显示
    const formattedActivities = sortedActivities.map(activity => {
      const date = new Date(activity.timestamp);
      return {
        ...activity,
        formattedTime: `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      };
    });
    
    this.setData({ recentActivities: formattedActivities });
  },

  // 跳转到器材列表
  goToEquipmentList: function(e) {
    const status = e.currentTarget.dataset.status;
    wx.switchTab({
      url: `/pages/manage/manage?status=${status}`
    });
  },

  // 切换操作菜单
  toggleMenu: function() {
    if (this.data.isAnimating) return;
    
    this.setData({ isAnimating: true });
    const isOpen = this.data.isMenuOpen;
    
    this.setData({ isMenuOpen: !isOpen });
    
    // 动画结束后更新状态
    setTimeout(() => {
      this.setData({ isAnimating: false });
    }, 300);
  },

  // 跳转到添加页面
  goToAdd: function() {
    wx.switchTab({ url: '/pages/add/add' });
    this.setData({ isMenuOpen: false });
  },

  // 扫码
  scanCode: function() {
    wx.scanCode({
      success: (res) => {
        // 扫码成功后的处理逻辑
        wx.showToast({ title: '扫码成功' });
        // 可以根据扫码结果跳转到相应页面
      },
      fail: (err) => {
        wx.showToast({ title: '扫码失败', icon: 'none' });
      }
    });
    this.setData({ isMenuOpen: false });
  },

  // 跳转到二维码生成页面
  goToQrcodeGenerator: function() {
    wx.switchTab({ url: '/pages/qrcodeGenerator/qrcodeGenerator' });
    this.setData({ isMenuOpen: false });
  },

  // 跳转到活动详情
  goToActivityDetail: function(e) {
    const equipmentId = e.currentTarget.dataset.equipmentid;
    wx.switchTab({
      url: `/pages/equipmentDetail/equipmentDetail?id=${equipmentId}`
    });
  }
})
    