// pages/index/index.js
Page({
  data: {
    totalEquipments: 0,
    availableEquipments: 0,
    borrowedEquipments: 0,
    recentActivities: [],
    currentDate: '',
    userInfo: null
  },

  onLoad() {
    // 获取当前日期
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const week = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
    this.setData({
      currentDate: `${year}年${month}月${day}日 星期${week}`
    });
  },

  onShow() {
    // 获取用户信息
    const app = getApp();
    this.setData({ userInfo: app.globalData.userInfo });
    
    // 加载数据
    this.loadEquipmentStats();
    this.loadRecentActivities();
  },

  // 加载器材统计数据
  loadEquipmentStats() {
    const app = getApp();
    const equipmentList = app.getEquipmentList();
    
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
  loadRecentActivities() {
    const app = getApp();
    let activities = app.getActivityLog();
    
    // 格式化时间
    activities = activities.map(activity => {
      const date = new Date(activity.createTime);
      return {
        ...activity,
        formattedTime: `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      };
    });
    
    // 只显示最近5条
    this.setData({ recentActivities: activities.slice(0, 5) });
  },

  // 跳转到管理页面
  goToManage(e) {
    const status = e.currentTarget.dataset.status || 'all';
    wx.navigateTo({
      url: `/pages/manage/manage?status=${status}`
    });
  },

  // 跳转到器材详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: `/pages/equipmentDetail/equipmentDetail?id=${id}`
      });
    }
  },

  // 显示操作菜单
  showActionSheet() {
    wx.showActionSheet({
      itemList: ['添加器材', '批量添加', '扫码入库', '生成二维码'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            wx.navigateTo({ url: '/pages/add/add' });
            break;
          case 1:
            wx.navigateTo({ url: '/pages/batchAdd/batchAdd' });
            break;
          case 2:
            this.scanCode();
            break;
          case 3:
            wx.navigateTo({ url: '/pages/qrcodeGenerator/qrcodeGenerator' });
            break;
        }
      }
    });
  },

  // 扫码功能
  scanCode() {
    wx.scanCode({
      success: (res) => {
        wx.navigateTo({
          url: `/pages/add/add?scanResult=${encodeURIComponent(res.result)}`
        });
      },
      fail: (err) => {
        wx.showToast({
          title: '扫码失败',
          icon: 'none'
        });
      }
    });
  }
})
    