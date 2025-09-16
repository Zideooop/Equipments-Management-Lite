// pages/index/index.js
// 设备管理小程序首页
const app = getApp();
const { safeNavigate } = require('../../utils/navigation.js');
const { AppUtils } = require('../../utils/AppUtils.js');

// 页面配置和方法
const pageConfig = {
  data: {
    totalEquipments: 0,
    availableEquipments: 0,
    borrowedEquipments: 0,
    recentActivities: [],
    isMenuOpen: false,
    isAnimating: false,
    welcomeText: '',
    welcomeSubtext: '',
    userInfo: {},
    equipment: {
      name: '',
      type: '',
      specification: '',
      quantity: 1,
      location: '',
      status: '在库',
      remarks: ''
    },
    isGuest: true,
    statusOptions: ['在库', '出库'],
    isRefreshing: false,
    fabOpen: false,
    floatMenuItems: [
      { icon: '/images/function/func-scan.png', text: '扫码入库', action: 'scan' },
      { icon: '/images/function/func-qrcode.png', text: 'QR生成', action: 'qrcode' },
      { icon: '/images/function/func-sync.png', text: '同步数据', action: 'sync' }
    ],
    weatherInfo: null,
    syncStatus: '',
    lastSyncTime: ''
  },

  // 页面生命周期函数
  onLoad(options) {
    this.app = getApp();
    this._isRefreshing = false;
    this.isSyncing = false;
    
    this.updateUserStatus();
    this.setWelcomeText();
    this.loadEquipmentStats();
    this.loadRecentActivities();
    this.loadSyncStatus();
    
    // 处理扫码带入的数据
    if (options.scanResult) {
      this.setData({
        'equipment.specification': decodeURIComponent(options.scanResult)
      });
    }
    
    // 监听同步完成事件
    this.app.globalEvent.on('syncCompleted', (data) => {
      if (data.success) {
        this.loadEquipmentStats();
        this.loadRecentActivities();
        this.loadSyncStatus();
      }
    });
  },

  onShow() {
    this.updateUserStatus();
    this.setWelcomeText();
    
    // 节流刷新数据
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

  onUnload() {
    // 移除事件监听，防止内存泄漏
    this.app.globalEvent.off('syncCompleted');
  },

  onPullDownRefresh() {
    if (this.data.isRefreshing) return;
    
    this.setData({ isRefreshing: true });
    
    // 并行加载数据
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

  /**
   * 更新用户状态
   */
  updateUserStatus() {
    // 1. 优先从全局数据获取
    const globalUser = this.app.globalData.userInfo || {};
    // 2. 本地存储兜底
    const storageUser = AppUtils.storage('userInfo') || {};
    // 3. 合并用户信息（全局数据优先）
    const userInfo = { ...storageUser, ...globalUser };
    
    // 4. 修正isGuest判断逻辑
    const isGuest = !userInfo || userInfo.isGuest || !userInfo.username;
    
    this.setData({
      userInfo: { ...userInfo, isGuest },
      isGuest: isGuest
    });
    
    // 加载天气信息（如已登录）
    if (!isGuest && !this.data.weatherInfo) {
      this.getWeatherInfo();
    }
  },

  /**
   * 显示登录引导
   */
  showLoginGuide() {
    wx.showModal({
      title: '登录提示',
      content: '登录后可使用更多功能',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/login/login' });
        }
      }
    });
  },

  /**
   * 设置欢迎文本
   */
  setWelcomeText() {
    const { userInfo } = this.data;
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

  /**
   * 加载同步状态
   */
  loadSyncStatus() {
    const lastSyncTime = AppUtils.storage('lastSyncTime');
    const syncStatus = AppUtils.storage('syncStatus') || '';
    
    if (lastSyncTime) {
      const date = new Date(lastSyncTime);
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

  /**
   * 获取天气信息
   */
  getWeatherInfo() {
    wx.getLocation({
      type: 'wgs84',
      success: (res) => {
        const latitude = res.latitude;
        const longitude = res.longitude;
        
        // 调用天气API
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

  /**
   * 设备统计数据Promise封装
   * @returns {Promise}
   * @private
   */
  _loadEquipmentStatsPromise() {
    return new Promise(resolve => {
      this.loadEquipmentStats(resolve);
    });
  },

  /**
   * 加载设备统计数据
   * @param {Function} callback - 回调函数
   */
  loadEquipmentStats(callback) {
    // 优先从全局数据获取
    let equipmentList = this.app.globalData.equipmentList || [];
    
    // 兼容处理：如果全局数据为空，从本地存储加载
    if (equipmentList.length === 0) {
      equipmentList = AppUtils.storage('equipmentList', undefined, 'array');
      this.app.globalData.equipmentList = equipmentList;
    }
    
    // 安全处理数组，防止null/undefined
    const safeEquipmentList = AppUtils.safeArray(equipmentList);
    
    // 单次循环完成计数，提升性能
    let available = 0;
    let borrowed = 0;
    safeEquipmentList.forEach(item => {
      if (item.status === '在库') available++;
      else if (item.status === '借出') borrowed++;
    });
    
    this.setData({
      totalEquipments: safeEquipmentList.length,
      availableEquipments: available,
      borrowedEquipments: borrowed
    }, () => {
      if (callback) callback();
    });
  },

  /**
   * 活动记录Promise封装
   * @returns {Promise}
   * @private
   */
  _loadRecentActivitiesPromise() {
    return new Promise(resolve => {
      this.loadRecentActivities(resolve);
    });
  },

  /**
   * 加载最近活动记录
   * @param {Function} callback - 回调函数
   */
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
      AppUtils.storage('activityLog', allActivities, 'array');
      
      if (callback) callback();
    });
  },

  /**
   * 获取全局活动记录
   * @returns {Array} 活动记录数组
   * @private
   */
  _getGlobalActivities() {
    let activities = this.app.globalData.activityLog || [];
    return AppUtils.safeArray(activities);
  },

  /**
   * 获取设备列表
   * @returns {Array} 设备列表数组
   * @private
   */
  _getEquipmentList() {
    return this.app.globalData.equipmentList || AppUtils.storage('equipmentList', undefined, 'array');
  },

  /**
   * 生成添加设备的活动记录
   * @param {Array} equipmentList - 设备列表
   * @param {Array} existingActivities - 已存在的活动记录
   * @returns {Array} 新增的活动记录
   * @private
   */
  _generateAddActivities(equipmentList, existingActivities) {
    const userInfo = this.app.globalData.userInfo || {};
    const userName = userInfo.username || '用户';
    
    return AppUtils.safeArray(equipmentList)
      .filter(item => !AppUtils.safeArray(existingActivities)
        .some(act => act.equipmentId === item.id && act.type === '添加'))
      .map(item => ({
        id: `add-${item.id}`,
        type: '添加',
        content: `${userName} 新增了 ${item.name}(${item.type}) ${item.quantity || 1}个，位于${item.location || '未设置位置'}`,
        location: item.location,
        createTime: item.createTime || item.addTime || new Date().toISOString(),
        equipmentId: item.id,
        operator: userName
      }));
  },

  /**
   * 合并并去重活动记录
   * @param {Array} activities - 原有活动记录
   * @param {Array} addActivities - 新增活动记录
   * @returns {Array} 合并后的活动记录
   * @private
   */
  _mergeAndDeduplicateActivities(activities, addActivities) {
    const activityMap = new Map();
    
    // 添加现有活动
    AppUtils.safeArray(activities).forEach(activity => {
      activityMap.set(activity.id, activity);
    });
    
    // 添加新增活动
    AppUtils.safeArray(addActivities).forEach(activity => {
      activityMap.set(activity.id, activity);
    });
    
    return Array.from(activityMap.values());
  },

  /**
   * 格式化并排序活动记录
   * @param {Array} activities - 活动记录数组
   * @returns {Array} 格式化后的活动记录
   * @private
   */
  _formatAndSortActivities(activities) {
    // 按时间倒序排列（最新的在前）
    return AppUtils.safeArray(activities)
      .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
      .slice(0, 10) // 只取最近10条
      .map(activity => {
        // 格式化时间显示
        const date = new Date(activity.createTime);
        const formattedTime = `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        // 优化操作记录格式
        let displayContent = activity.content;
        if (!displayContent && activity.operator && activity.type && activity.equipmentName) {
          displayContent = `【${activity.operator} ${activity.type} ${activity.equipmentName} ${activity.quantity || 1}个】`;
        }
        
        return {
          ...activity,
          formattedTime,
          displayContent
        };
      });
  },

  /**
   * 显示活动详情
   * @param {Object} e - 事件对象
   */
  showActivityDetail(e) {
    const equipmentId = e.currentTarget.dataset.id;
    if (!equipmentId) {
      wx.showToast({
        title: '无法获取设备ID',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 查找设备
    const equipment = this.app.findEquipmentById(equipmentId);
    
    if (equipment) {
      safeNavigate('/pages/equipmentDetail/equipmentDetail', { id: equipmentId });
    } else {
      wx.showToast({
        title: '该设备信息已不存在（可能已被永久删除）',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 跳转到设备管理页
   * @param {Object} e - 事件对象
   */
  goToManage(e) {
    const status = e.currentTarget.dataset.status;
    if (status) {
      safeNavigate('/pages/manage/manage', { status });
    } else {
      safeNavigate('/pages/manage/manage');
    }
  },

  /**
   * 状态卡片点击事件处理
   * @param {Object} e - 事件对象
   */
  onStatusCardTap(e) {
    this.goToManage(e);
  },

  /**
   * 处理悬浮菜单操作
   * @param {Object} e - 事件对象
   */
  handleFabAction(e) {
    const { item } = e.detail;
    const action = item.action;
    
    if (action === 'sync') {
      // 同步数据需要登录验证
      if (this.data.isGuest) {
        wx.showModal({
          title: '请先登录',
          content: '同步数据功能需要登录后使用',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({ url: '/pages/login/login' });
            }
          }
        });
        return;
      }
      
      // 执行同步操作
      this.syncData();
    } else if (action === 'scan') {
      wx.scanCode({
        success: (res) => {
          this.setData({
            'equipment.specification': decodeURIComponent(res.result)
          });
          wx.navigateTo({ url: '/pages/add/add' });
        },
        fail: (err) => {
          console.error('扫码失败', err);
          wx.showToast({ title: '扫码失败', icon: 'none' });
        }
      });
    } else if (action === 'qrcode') {
      wx.navigateTo({ url: '/pages/qrcode/generate' });
    }
  },

  /**
   * 同步数据
   */
  syncData() {
    // 防止重复调用
    if (this.isSyncing) return;
    this.isSyncing = true;
    
    this.showLoading('同步中...');
    this.app.syncData({ silent: false })
      .then(result => {
        this.hideLoading();
        this.isSyncing = false;
        if (result.success) {
          this.loadEquipmentStats();
          this.loadRecentActivities();
          this.loadSyncStatus();
        }
      })
      .catch(err => {
        this.hideLoading();
        this.isSyncing = false;
        console.error('同步失败', err);
        wx.showToast({ title: '同步失败', icon: 'none' });
      });
  },

  /**
   * 显示加载提示
   * @param {string} text - 提示文本
   */
  showLoading(text = '加载中...') {
    wx.showLoading({ title: text, mask: true });
  },

  /**
   * 隐藏加载提示
   */
  hideLoading() {
    wx.hideLoading();
  },

  /**
   * 获取活动类型样式
   * @param {string} type - 活动类型
   * @returns {Object} 样式配置
   * @private
   */
  _getActivityTypeStyle(type) {
    const styleMap = {
      '添加': { className: 'activity-icon-add', icon: '/images/operation/add.png', badgeText: '新' },
      '借出': { className: 'activity-icon-lend', icon: '/images/operation/lend.png', badgeText: '借' },
      '归还': { className: 'activity-icon-return', icon: '/images/operation/return.png', badgeText: '还' },
      '删除': { className: 'activity-icon-delete', icon: '/images/operation/delete.png', badgeText: '删' },
      '更新': { className: 'activity-icon-other', icon: '/images/operation/update.png', badgeText: '改' }
    };
    return styleMap[type] || { className: 'activity-icon-other', icon: '/images/operation/other.png', badgeText: '其' };
  },

  /**
   * 获取操作关键词
   * @param {string} type - 操作类型
   * @returns {string} 关键词
   * @private
   */
  _getActionKeyword(type) {
    const keywordMap = {
      '添加': '新增',
      '借出': '借出',
      '归还': '归还',
      '删除': '删除',
      '更新': '修改'
    };
    return keywordMap[type] || '操作';
  }
};

// 创建小程序页面实例
Page(pageConfig);
