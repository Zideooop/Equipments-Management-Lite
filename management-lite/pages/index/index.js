// pages/index/index.js
Page({
  data: {
    equipmentStats: {
      total: 0,
      inStock: 0,
      borrowed: 0,
      maintenance: 0
    },
    recentActivities: [],
    showActionSheet: false,
    actionSheetItems: ['添加器材', '批量添加', '扫码入库', '生成二维码'],
    loading: false
  },

  onLoad() {
    this.loadEquipmentStats();
    this.loadRecentActivities();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadEquipmentStats();
    this.loadRecentActivities();
  },

  // 下拉刷新
  onPullDownRefresh() {
    const app = getApp();
    app.syncData(false).then(result => {
      if (result.success) {
        this.loadEquipmentStats();
        this.loadRecentActivities();
        wx.showToast({
          title: '同步成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result.message || '同步失败',
          icon: 'none'
        });
      }
      wx.stopPullDownRefresh();
    });
  },

  // 数据更新回调
  onDataUpdated() {
    this.loadEquipmentStats();
    this.loadRecentActivities();
  },

  // 加载器材统计数据
  loadEquipmentStats() {
    const app = getApp();
    const equipmentList = app.getEquipmentList();
    
    // 统计总数
    const total = equipmentList.length;
    
    // 按状态统计
    const inStock = equipmentList.filter(item => item.status === '在库').length;
    const borrowed = equipmentList.filter(item => item.status === '借出').length;
    const maintenance = equipmentList.filter(item => item.status === '维修中').length;
    
    this.setData({
      equipmentStats: {
        total,
        inStock,
        borrowed,
        maintenance
      }
    });
  },

  // 加载最近活动
  loadRecentActivities() {
    const app = getApp();
    let logs = app.getActivityLog();
    
    // 按时间排序，取最近5条
    logs.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
    const recentActivities = logs.slice(0, 5);
    
    this.setData({
      recentActivities
    });
  },

  // 显示操作菜单
  showActionSheet() {
    this.setData({ showActionSheet: true });
  },
  
  // 处理菜单选择
  onActionSelect(e) {
    const index = e.detail.index;
    switch (index) {
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
  },

  // 扫码功能
  scanCode() {
    wx.scanCode({
      success: (res) => {
        const scanResult = res.result;
        if (!scanResult) {
          wx.showToast({ title: '未识别到有效内容', icon: 'none' });
          return;
        }
        
        // 检查是否为已存在的器材
        const app = getApp();
        const equipmentList = app.getEquipmentList();
        const matchedEquipment = equipmentList.find(item => 
          item.code === scanResult || item.id === scanResult || 
          item.specification === scanResult
        );
        
        if (matchedEquipment) {
          // 已存在，跳转到详情页
          wx.navigateTo({
            url: `/pages/equipmentDetail/equipmentDetail?id=${matchedEquipment.id}`
          });
        } else {
          // 不存在，询问是否添加
          wx.showModal({
            title: '未找到该器材',
            content: `是否将 "${scanResult}" 登记入库？`,
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 跳转至添加页并带入扫码结果
                wx.navigateTo({
                  url: `/pages/add/add?scanResult=${encodeURIComponent(scanResult)}`
                });
              }
            }
          });
        }
      },
      fail: (err) => {
        console.error('扫码失败:', err);
        wx.showToast({
          title: '扫码失败',
          icon: 'none'
        });
      }
    });
  },

  // 跳转到器材管理
  goToManage() {
    wx.navigateTo({
      url: '/pages/manage/manage'
    });
  },

  // 跳转到活动日志
  goToActivityLog() {
    wx.navigateTo({
      url: '/pages/activityLog/activityLog'
    });
  },

  // 跳转到同步页面
  goToSync() {
    const app = getApp();
    app.syncData();
  }
});
