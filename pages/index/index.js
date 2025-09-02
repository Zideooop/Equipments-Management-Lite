// 导航工具模块 - 统一管理页面跳转
const app = getApp();
// 修复：正确引入导航工具（路径根据实际项目结构调整）
const { safeNavigate, safeBack } = require('../../utils/navigation.js');

Page({
  data: {
    totalEquipments: 0,
    availableEquipments: 0,
    borrowedEquipments: 0,
    recentActivities: [],
    isMenuOpen: false,
    isAnimating: false,
    welcomeText: '',
    welcomeSubtext: '',
    userInfo: {}, // 用户信息存储
    equipment: {
      name: '',
      type: '',
      specification: '',
      quantity: 1,
      location: '',
      status: '在库',
      remarks: ''
    },
    isGuest: true, // 默认游客状态
    statusOptions: ['在库', '出库'],
    isRefreshing: false,
    fabOpen: false,
    floatMenuItems: [
      { icon: '/images/function/func-add.png', text: '添加器材', action: 'add' },
      { icon: '/images/function/func-sync.png', text: '同步数据', action: 'sync' },
      { icon: '/images/function/func-stats.png', text: '器材统计', action: 'stats' }
    ],
    weatherInfo: null,
    syncStatus: '',
    lastSyncTime: ''
  },

  onLoad() {
    this.app = getApp();
    this.updateUserStatus(); // 初始化用户状态
    this.setWelcomeText();
    this.loadEquipmentStats();
    this.loadRecentActivities();
    this.loadSyncStatus();
    
    // 处理扫码带入的数据
    const options = this.options;
    if (options.scanResult) {
      this.setData({
        'equipment.specification': decodeURIComponent(options.scanResult)
      });
    }
  },

  // 关键修复：页面显示时强制更新用户状态
  onShow() {
    this.updateUserStatus(); // 每次显示都更新用户状态
    this.setWelcomeText();   // 重新设置欢迎词
    
    // 页面显示时刷新数据，添加节流防止频繁刷新
    if (!this._isRefreshing) {
      this._isRefreshing = true;
      setTimeout(() => {
        this.loadEquipmentStats();
        this.loadRecentActivities();
        this.loadSyncStatus();
        this._isRefreshing = false;
      }, 300);
    }
  },

  // 核心修复：统一更新用户状态的方法
  updateUserStatus() {
    // 1. 优先从全局数据获取（登录后实时更新）
    const globalUser = app.globalData.userInfo || {};
    // 2. 本地存储兜底（防止全局数据丢失）
    const storageUser = wx.getStorageSync('userInfo') || {};
    // 3. 合并用户信息（全局数据优先）
    const userInfo = { ...storageUser, ...globalUser };
    
    // 4. 修正isGuest判断逻辑
    const isGuest = !userInfo || userInfo.isGuest || !userInfo.username;
    
    this.setData({
      userInfo: { ...userInfo, isGuest },
      isGuest: isGuest // 同步更新data中的isGuest
    });
    
    // 如果是登录状态，加载天气信息
    if (!isGuest && !this.data.weatherInfo) {
      this.getWeatherInfo();
    }
  },

  // 下拉刷新处理
  onPullDownRefresh() {
    if (this.data.isRefreshing) return;
    
    this.setData({ isRefreshing: true });
    
    // 并行加载数据，减少刷新时间
    Promise.all([
      this._loadEquipmentStatsPromise(),
      this._loadRecentActivitiesPromise()
    ]).then(() => {
      wx.stopPullDownRefresh();
      this.setData({ isRefreshing: false });
    }).catch(() => {
      wx.stopPullDownRefresh();
      this.setData({ isRefreshing: false });
    });
  },

  // 设置欢迎信息，修复用户状态判断
  setWelcomeText() {
    const { userInfo } = this.data; // 使用updateUserStatus更新后的userInfo
    const isGuest = userInfo.isGuest;
    const isAdmin = userInfo.role === 'admin';
    
    let userName;
    if (isGuest) {
      userName = '游客';
    } else if (isAdmin) {
      userName = '管理员';
    } else {
      userName = userInfo.username || userInfo.nickName || '用户';
    }
    
    const date = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    const today = `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日`;
    
    this.setData({
      welcomeText: `欢迎回来，${userName}`,
      welcomeSubtext: `${today} ${weekDay}`
    });
  },

  // 加载同步状态和时间 - 优化：精确到秒，区分状态图标
  loadSyncStatus() {
    const lastSyncTime = wx.getStorageSync('lastSyncTime');
    const syncStatus = wx.getStorageSync('syncStatus') || '';
    
    if (lastSyncTime) {
      const date = new Date(lastSyncTime);
      // 优化：显示年月日时分秒
      const formattedTime = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
      this.setData({
        lastSyncTime: formattedTime,
        syncStatus: syncStatus
      });
    } else {
      this.setData({
        lastSyncTime: '未同步',
        syncStatus: ''
      });
    }
  },

  // 获取天气信息
  getWeatherInfo() {
    wx.getLocation({
      type: 'wgs84',
      success: (res) => {
        const latitude = res.latitude;
        const longitude = res.longitude;
        
        // 调用天气API（示例使用和风天气）
        wx.request({
          url: `https://devapi.qweather.com/v7/weather/now?location=${longitude},${latitude}&key=YOUR_WEATHER_KEY`,
          success: (result) => {
            if (result.data.code === '200') {
              const weatherData = result.data.now;
              // 获取城市信息
              wx.request({
                url: `https://geoapi.qweather.com/v2/city/lookup?location=${longitude},${latitude}&key=YOUR_WEATHER_KEY`,
                success: (cityRes) => {
                  const city = cityRes.data.location[0]?.name || '未知城市';
                  this.setData({
                    weatherInfo: {
                      city,
                      temp: weatherData.temp,
                      condition: weatherData.text,
                      icon: `/images/weather/${weatherData.icon}.png`
                    }
                  });
                }
              });
            }
          },
          fail: () => {
            this.setData({ weatherInfo: null });
          }
        });
      },
      fail: () => {
        this.setData({ weatherInfo: null });
      }
    });
  },

  // 加载器材统计数据 - 封装为Promise
  _loadEquipmentStatsPromise() {
    return new Promise(resolve => {
      this.loadEquipmentStats(resolve);
    });
  },

  // 加载器材统计数据
  loadEquipmentStats(callback) {
    // 优先从全局数据获取，确保实时性
    let equipmentList = this.app.globalData.equipmentList || [];
    
    // 兼容处理：如果全局数据为空，从本地存储加载
    if (equipmentList.length === 0) {
      equipmentList = wx.getStorageSync('equipmentList') || [];
      // 同步到全局数据
      this.app.globalData.equipmentList = equipmentList;
    }
    
    // 单次循环完成计数，提升性能
    let available = 0;
    let borrowed = 0;
    equipmentList.forEach(item => {
      if (item.status === '在库') available++;
      else if (item.status === '借出') borrowed++;
    });
    
    this.setData({
      totalEquipments: equipmentList.length,
      availableEquipments: available,
      borrowedEquipments: borrowed
    }, () => {
      if (callback) callback();
    });
  },

  // 加载最近活动记录 - 封装为Promise
  _loadRecentActivitiesPromise() {
    return new Promise(resolve => {
      this.loadRecentActivities(resolve);
    });
  },

  // 加载最近活动记录
  loadRecentActivities(callback) {
    const activities = this._getGlobalActivities();
    const equipmentList = this._getEquipmentList();
    const addActivities = this._generateAddActivities(equipmentList, activities);
    const allActivities = this._mergeAndDeduplicateActivities(activities, addActivities);
    const formattedActivities = this._formatAndSortActivities(allActivities);
    
    // 更新到界面
    this.setData({
      recentActivities: formattedActivities
    }, () => {
      // 同步回全局数据
      this.app.globalData.activityLog = allActivities;
      wx.setStorageSync('activityLog', allActivities);
      
      if (callback) callback();
    });
  },

  // 获取全局活动日志
  _getGlobalActivities() {
    let activities = this.app.globalData.activityLog || [];
    return Array.isArray(activities) ? activities : [];
  },

  // 获取器材列表
  _getEquipmentList() {
    return this.app.globalData.equipmentList || wx.getStorageSync('equipmentList') || [];
  },

  // 生成新增器材活动记录 - 优化：记录包含位置信息
  _generateAddActivities(equipmentList, existingActivities) {
    const userInfo = this.app.globalData.userInfo || {};
    const userName = userInfo.username || '用户';
    
    return equipmentList
      .filter(item => !existingActivities.some(act => act.equipmentId === item.id && act.type === '添加'))
      .map(item => ({
        id: `add-${item.id}`,
        type: '添加',
        // 优化：记录更详细，包含位置信息
        content: `${userName} 新增了 ${item.name}(${item.type}) ${item.quantity || 1}个，位于${item.location || '未设置位置'}`,
        location: item.location,
        createTime: item.createTime || item.addTime || new Date().toISOString(),
        equipmentId: item.id
      }));
  },

  // 合并并去重活动记录
  _mergeAndDeduplicateActivities(activities, addActivities) {
    const activityMap = new Map();
    
    // 添加现有活动
    activities.forEach(activity => {
      activityMap.set(activity.id, activity);
    });
    
    // 添加新增活动（可能会覆盖重复的）
    addActivities.forEach(activity => {
      activityMap.set(activity.id, activity);
    });
    
    return Array.from(activityMap.values());
  },

  // 格式化并排序活动记录
  _formatAndSortActivities(activities) {
    return activities
      .map(activity => {
        const date = new Date(activity.createTime);
        return {
          ...activity,
          formattedTime: `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
        };
      })
      .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
      .slice(0, 10); // 只显示最近10条
  },

  // 获取活动类型样式
  _getActivityTypeStyle(type) {
    switch(type) {
      case '添加':
        return {
          icon: '/images/operation/add.png',
          className: 'activity-icon-add',
          badgeText: '新增'
        };
      case '借出':
        return {
          icon: '/images/operation/lend.png',
          className: 'activity-icon-lend',
          badgeText: '借出'
        };
      case '归还':
        return {
          icon: '/images/operation/return.png',
          className: 'activity-icon-return',
          badgeText: '归还'
        };
      case '删除':
        return {
          icon: '/images/operation/delete.png',
          className: 'activity-icon-delete',
          badgeText: '删除'
        };
      case '恢复':
        return {
          icon: '/images/operation/restore.png',
          className: 'activity-icon-restore',
          badgeText: '恢复'
        };
      default:
        return {
          icon: '/images/operation/other.png',
          className: 'activity-icon-other',
          badgeText: '其他'
        };
    }
  },

  // 切换悬浮按钮状态
  toggleFab() {
    this.setData({
      fabOpen: !this.data.fabOpen
    });
  },

  // 处理悬浮菜单点击 - 优化：同步状态图标和时间更新
  handleFabAction(e) {
    const action = e.currentTarget.dataset.action;
    switch (action) {
      case 'qrcode':
        // 跳转到二维码生成页面
        wx.navigateTo({
          url: '/pages/equipmentHub/equipmentHub'
        });
        break;
      case 'scan':
        this.scanCode();
        break;
      case 'sync':
        wx.showLoading({ title: '同步中...' });
        this.app.syncData()
          .then((result) => {
            wx.hideLoading();
            if (result.success) {
              const now = new Date();
              // 优化：同步时间精确到秒
              const formattedTime = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
              
              wx.setStorageSync('lastSyncTime', now.toISOString());
              wx.setStorageSync('syncStatus', 'success');
              
              this.setData({
                lastSyncTime: formattedTime,
                syncStatus: 'success'
              });
              
              wx.showToast({ title: '同步成功' });
            } else {
              wx.setStorageSync('syncStatus', 'failed');
              this.setData({ syncStatus: 'failed' });
              wx.showToast({ title: '同步失败', icon: 'none' });
            }
            this.loadEquipmentStats();
            this.loadRecentActivities();
          })
          .catch((err) => {
            wx.hideLoading();
            wx.setStorageSync('syncStatus', 'failed');
            this.setData({ syncStatus: 'failed' });
            wx.showToast({ title: '同步失败', icon: 'none' });
            console.error('同步失败:', err);
          });
        break;
      case 'stats':
        safeNavigate('/pages/statistics/statistics');
        break;
    }
    this.setData({ fabOpen: false });
  },

  // 登录引导
  showLoginGuide() {
    wx.showModal({
      title: '登录提示',
      content: '登录后可关联借还记录、同步数据，体验完整功能',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/login/login' });
        }
      }
    });
  },

  // 新增：跳转到添加页面
  goToAddPage() {
    safeNavigate('/pages/add/add');
  },

  // 新增：扫码功能
  scanCode() {
    wx.scanCode({
      success: (res) => {
        safeNavigate(`/pages/add/add?scanCode=${encodeURIComponent(res.result)}`);
      },
      fail: (err) => {
        console.error('扫码失败', err);
        wx.showToast({ title: '扫码取消或失败', icon: 'none' });
      }
    });
  },

  // 新增：显示活动详情
  showActivityDetail(e) {
    const activityId = e.currentTarget.dataset.id;
    if (activityId) {
      safeNavigate(`/pages/equipmentDetail/equipmentDetail?id=${activityId}`);
    } else {
      wx.showToast({
        title: '活动ID不存在',
        icon: 'none'
      });
    }
  },

  // 新增：跳转到管理页面
  goToManage() {
    safeNavigate('/pages/manage/manage');
  }
})
    