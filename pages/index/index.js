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
    userInfo: {}, // 新增用户信息存储
    equipment: {
      name: '',
      type: '',
      specification: '',
      quantity: 1,
      location: '',
      status: '在库',
      remarks: '',
      // ...原有数据
  isGuest: !wx.getStorageSync('userInfo') // 判断是否为游客
},
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
    statusOptions: ['在库', '出库'],
    isRefreshing: false,
    fabOpen: false,
    // 优化：使用图片图标统一视觉风格
    floatMenuItems: [
      { icon: '/images/function/func-add.png', text: '添加器材', action: 'add' },
      { icon: '/images/function/func-sync.png', text: '同步数据', action: 'sync' },
      { icon: '/images/function/func-stats.png', text: '器材统计', action: 'stats' }
    ]
  },

  onLoad() {
    // 缓存app实例，减少重复调用
    this.app = getApp();

    const app = getApp();
    app.checkLoginStatus().then(isLoggedIn => {
      if (!isLoggedIn) {
        safeNavigate({ url: '/pages/login/login' }); // 确认未登录后再跳转
      }
    });


    // 预加载页面路径列表用于导航验证
    this.setWelcomeText();
    this.loadEquipmentStats();
    this.loadRecentActivities();
    
    // 处理扫码带入的数据
    const options = this.options;
    if (options.scanResult) {
      this.setData({
        'equipment.specification': decodeURIComponent(options.scanResult)
      });
    }
  },

  onShow() {
    // 页面显示时刷新数据，添加节流防止频繁刷新
    if (!this._isRefreshing) {
      this._isRefreshing = true;
      setTimeout(() => {
        this.loadEquipmentStats();
        this.loadRecentActivities();
        this._isRefreshing = false;
      }, 300);
    }
  },

  // 初始化页面路径列表
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

  // 设置欢迎信息，添加游客状态判断
  setWelcomeText() {
    const userInfo = this.app.globalData.userInfo || {};
    // 判断是否为游客状态（无用户信息或明确标记为游客）
    const isGuest = !userInfo || userInfo.isGuest || !userInfo.username;
    const userName = isGuest ? '游客' : (userInfo.username || '管理员');
    
    const date = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    const today = `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日`;
    
    this.setData({
      userInfo: {
        ...userInfo,
        isGuest  // 存储游客状态标识
      },
      welcomeText: `欢迎回来，${userName}`,
      welcomeSubtext: `${today} ${weekDay}`
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

  // 加载最近活动记录（修复展示异常）
  loadRecentActivities(callback) {
    // 拆分复杂逻辑为子函数，提高可读性
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

  // 生成新增器材活动记录
  _generateAddActivities(equipmentList, existingActivities) {
    return equipmentList
      .filter(item => !existingActivities.some(act => act.equipmentId === item.id && act.type === '添加'))
      .map(item => ({
        id: `add-${item.id}`,
        type: '添加',
        content: `新增器材: ${item.name}`,
        createTime: item.createTime || item.addTime || new Date().toISOString(),
        equipmentId: item.id
      }));
  },

  // 合并并去重活动记录
  _mergeAndDeduplicateActivities(activities, addActivities) {
    return [...activities, ...addActivities]
      .filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
      );
  },

  // 格式化并排序活动记录（修复展示异常的核心处理）
  _formatAndSortActivities(activities) {
    // 过滤无效记录，修复展示异常
    return activities
      .filter(activity => {
        // 确保活动记录包含必要字段
        return activity && 
               typeof activity === 'object' &&
               activity.id && 
               activity.content && 
               activity.createTime && 
               activity.equipmentId;
      })
      .sort((a, b) => {
        const dateA = new Date(this._formatDateForIOS(a.createTime));
        const dateB = new Date(this._formatDateForIOS(b.createTime));
        return dateB - dateA; // 按时间倒序排列
      })
      .slice(0, 5) // 只取最近5条
      .map(activity => ({
        ...activity,
        formattedTime: this.getRelativeTime(activity.createTime)
      }));
  },

  // 处理iOS日期兼容性
  _formatDateForIOS(dateString) {
    return dateString.replace(/-/g, '/');
  },

  // 获取相对时间
  getRelativeTime(dateString) {
    try {
      const iosCompatibleDate = this._formatDateForIOS(dateString);
      const createTime = new Date(iosCompatibleDate);
      const now = new Date();
      
      const diffMs = now - createTime;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 1) {
        return `${diffDays}天前`;
      } else if (diffDays === 1) {
        return '昨天';
      } else if (diffHours > 0) {
        return `${diffHours}小时前`;
      } else if (diffMins > 0) {
        return `${diffMins}分钟前`;
      } else {
        return '刚刚';
      }
    } catch (e) {
      return '时间格式错误';
    }
  },

  // 格式化日期（修复iOS兼容性）
  formatDate(dateString) {
    const iosCompatibleDate = this._formatDateForIOS(dateString);
    const date = new Date(iosCompatibleDate);
    
    if (isNaN(date.getTime())) {
      return '无效日期';
    }
    
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  // 活动记录点击跳转详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({ title: '无法获取器材信息', icon: 'none' });
      return;
    }
    
    const equipmentList = this.app.globalData.equipmentList || [];
    const equipmentExists = equipmentList.some(item => item.id === id);
    
    if (equipmentExists) {
      safeNavigate(`/pages/equipmentDetail/equipmentDetail?id=${id}`);
    } else {
      const deletedList = this.app.globalData.deletedEquipmentList || wx.getStorageSync('deletedEquipmentList') || [];
      const isInRecycle = deletedList.some(item => item.id === id);
      
      if (isInRecycle) {
        safeNavigate(`/pages/equipmentDetail/equipmentDetail?id=${id}&fromRecycle=true`);
      } else {
        wx.showToast({ title: '该器材不存在或已被彻底删除', icon: 'none' });
      }
    }
  },

  // 跳转到器材列表页并应用筛选
  goToManage(e) {
    const status = e.currentTarget.dataset.status || 'all';
    // 确保筛选状态正确设置
    this.app.globalData.filterStatus = status;
    // 强制刷新管理页数据
    this.app.globalData.forceRefreshManage = true;
    safeNavigate('/pages/manage/manage');
  },

  // 切换底部菜单
  toggleMenu() {
    if (this.data.isAnimating) return;
    
    const isOpen = this.data.isMenuOpen;
    this.setData({ isAnimating: true });
    
    setTimeout(() => {
      this.setData({ isMenuOpen: !isOpen, isAnimating: false });
    }, 300);
  },

  // 跳转到添加页面
  goToAddPage() {
    this.setData({ isMenuOpen: false });
    safeNavigate('/pages/add/add');
  },

  // 跳转到批量添加页面
  goToBatchAdd() {
    this.setData({ isMenuOpen: false });
    safeNavigate('/pages/batchAdd/batchAdd');
  },

  // 扫码功能 - 完善错误处理
  scanCode() {
    this.setData({ isMenuOpen: false });
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

  // 跳转到借还记录页面
  goToBorrowRecord() {
    safeNavigate('/pages/borrowRecord/borrowRecord');
  },

  // 跳转到回收站
  goToRecycleBin() {
    safeNavigate('/pages/recycleBin/recycleBin');
  },

  // 跳转到我的页面
  goToMine() {
    safeNavigate('/pages/mine/mine');
  },

  // 处理输入
  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    if (field === 'quantity') {
      const num = parseInt(value) || 1;
      this.setData({ [`equipment.${field}`]: num < 1 ? 1 : num });
    } else {
      this.setData({ [`equipment.${field}`]: value });
    }
  },

  // 处理状态变更
  handleStatusChange(e) {
    const index = e.detail.value;
    this.setData({ 'equipment.status': this.data.statusOptions[index] });
  },

  // 取消
  cancel() {
    safeBack();
  },

  // 保存器材 - 修复新增后不显示问题
  async saveEquipment() {
    const { name } = this.data.equipment;
    
    if (!name.trim()) {
      wx.showToast({ title: '请输入器材名称', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '保存中...' });
      
      // 确保是Promise调用
      const newEquipment = await (typeof this.app.addEquipment === 'function' 
        ? this.app.addEquipment({
            ...this.data.equipment,
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
          })
        : new Promise((resolve) => {
            // 降级方案
            const equipmentList = wx.getStorageSync('equipmentList') || [];
            const newEq = {
              ...this.data.equipment,
              id: `eq-${Date.now()}`,
              createTime: new Date().toISOString(),
              updateTime: new Date().toISOString()
            };
            equipmentList.unshift(newEq);
            wx.setStorageSync('equipmentList', equipmentList);
            this.app.globalData.equipmentList = equipmentList;
            resolve(newEq);
          })
      );

      wx.hideLoading();
      
      if (newEquipment) {
        // 强制刷新首页数据
        this.loadEquipmentStats();
        this.loadRecentActivities();
        
        wx.showToast({ title: '添加成功' });
        setTimeout(() => safeBack(), 1500);
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('保存失败:', error);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },

  // 切换悬浮按钮状态
  toggleFab() {
    this.setData({
      fabOpen: !this.data.fabOpen
    });
  },

  // 处理悬浮菜单点击 - 完善加载状态
  handleFabAction(e) {
    const action = e.currentTarget.dataset.action;
    
    switch (action) {
      case 'add':
        this.goToAddPage();
        break;
      case 'scan':
        this.scanCode();
        break;
      case 'sync':
        wx.showLoading({ title: '同步中...' });
        this.app.syncData()
          .then(() => {
            wx.hideLoading();
            wx.showToast({ title: '同步成功' });
            this.loadEquipmentStats();
            this.loadRecentActivities();
          })
          .catch((err) => {
            wx.hideLoading();
            wx.showToast({ title: '同步失败', icon: 'none' });
            console.error('同步失败:', err);
          });
        break;
      case 'stats':
        safeNavigate('/pages/statistics/statistics');
        break;
    }
    // 关闭菜单
    this.setData({ fabOpen: false });
  }
})