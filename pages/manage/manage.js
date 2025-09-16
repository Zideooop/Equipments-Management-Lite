const app = getApp();
const { safeNavigate } = require('../../utils/navigation.js');
const { AppUtils } = require('../../utils/AppUtils.js');

Page({
  data: {
    equipmentList: [],
    filteredEquipmentList: [],
    searchKeyword: '',
    currentStatus: 'all',
    syncStatus: 'idle', // idle, syncing, success, failed
    pendingChanges: 0,
    syncError: null,
    isLoading: false,
    // 状态筛选选项
    statusOptions: [
      { status: 'all', text: '全部状态', icon: '/images/status/status-all.png' },
      { status: '在库', text: '在库', icon: '/images/status/status-available.png' },
      { status: '借出', text: '出库', icon: '/images/status/status-borrowed.png' },
      { status: 'other', text: '其他', icon: '/images/status/status-other.png' }
    ],
    fabOpen: false,
    showBackToTop: false,
    touchStartX: 0,
    touchStartY: 0,
    fabVisible: true,
    // 悬浮菜单配置（适配组件）
    menuItems: [
     { icon: '/images/function/func-add.png', text: '单个添加', action: 'single' },
     { icon: '/images/function/func-batch-add.png', text: '批量添加', action: 'batch' }
    ]
  },

  onLoad(options) {
    // 接收从首页传递的状态筛选参数并立即筛选
    if (options.status && ['在库', '借出', 'all', 'other'].includes(options.status)) {
      this.setData({ currentStatus: options.status }, () => {
        this.loadEquipmentList();
      });
    } else {
      this.loadEquipmentList();
    }
    
    this.initSyncListener();
    
    // 初始化触摸位置记录
    this.setData({
      touchStartX: 0,
      touchStartY: 0
    });
  },

  onShow() {
    this.loadEquipmentList();
    this.updateSyncStatus();
    this.setData({ fabVisible: true });
  },

  onUnload() {
    // 移除事件监听
    app.globalEvent.off('syncStatusChanged');
    app.globalEvent.off('equipmentUpdated');
    app.globalEvent.off('syncCompleted');
  },

  // 监听页面滚动，控制回到顶部按钮显示
  onPageScroll(e) {
    const scrollTop = e.scrollTop;
    // 当滚动超过500rpx且悬浮菜单未打开时显示回到顶部按钮
    const showBackToTop = scrollTop > 500 && !this.data.fabOpen;
    
    this.setData({
      showBackToTop: showBackToTop
    });
  },

  // 回到顶部功能实现
  backToTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300 // 平滑滚动效果
    });
    
    // 隐藏回到顶部按钮
    setTimeout(() => {
      this.setData({ showBackToTop: false });
    }, 300);
  },

  // 触摸开始记录位置
  onTouchStart(e) {
    this.setData({
      touchStartX: e.touches[0].clientX,
      touchStartY: e.touches[0].clientY
    });
  },

  // 触摸结束处理
  onTouchEnd() {
    // 可以添加滑动相关的处理逻辑
  },

  // 初始化同步状态监听
  initSyncListener() {
    const app = getApp();
    if (app.globalEvent) {
      app.globalEvent.on('syncStatusChanged', (data) => {
        this.setData({
          syncStatus: data.status || 'idle',
          syncError: data.error !== undefined ? data.error : null, // 用null替代undefined
          pendingChanges: data.pendingChanges !== undefined ? data.pendingChanges : 0 // 用0替代undefined
        });
      });

      app.globalEvent.on('equipmentUpdated', (data) => {
        this.setData({ equipmentList: AppUtils.safeArray(data.data) });
        this.filterEquipmentList();
      });

      app.globalEvent.on('syncCompleted', (data) => {
        if (data.success) {
          wx.showToast({
            title: '同步成功',
            icon: 'success',
            duration: 2000
          });
          this.loadEquipmentList();
        } else {
          wx.showToast({
            title: `同步失败: ${data.error}`,
            icon: 'none',
            duration: 3000
          });
        }
        this.setData({
          syncStatus: data.success ? 'success' : 'failed',
          pendingChanges: data.pendingChanges
        });
      });
    }
    this.updateSyncStatus();
  },

  // 下拉刷新实现同步
  onPullDownRefresh() {
    if (this.data.syncStatus === 'syncing') {
      wx.stopPullDownRefresh();
      return;
    }
    
    this.setData({ syncStatus: 'syncing' });
    
    app.syncManager.fullSync()
      .then(success => {
        wx.stopPullDownRefresh();
        if (success) {
          this.loadEquipmentList();
          wx.showToast({ title: '同步成功', icon: 'success' });
          this.setData({ syncStatus: 'success' });
        } else {
          wx.showToast({ title: '同步失败', icon: 'none' });
          this.setData({ syncStatus: 'failed' });
        }
      })
      .catch(err => {
        wx.stopPullDownRefresh();
        console.error('同步失败', err);
        wx.showToast({ title: '同步失败', icon: 'none' });
        this.setData({ syncStatus: 'failed' });
      });
  },

  // 加载设备列表
  loadEquipmentList() {
    this.setData({ isLoading: true });
    
    const app = getApp();
    const equipmentList = Array.isArray(app.getEquipmentList()) ? app.getEquipmentList() : [];
    
    this.setData({
      equipmentList: AppUtils.safeArray(equipmentList),
      isLoading: false
    }, () => {
      this.filterEquipmentList();
    });
  },

  // 筛选设备列表
  filterEquipmentList() {
    const { equipmentList, searchKeyword, currentStatus } = this.data;
    
    let filtered = [...AppUtils.safeArray(equipmentList)];
    
    // 状态筛选
    if (currentStatus !== 'all') {
      if (currentStatus === 'other') {
        // "其他"状态筛选
        filtered = filtered.filter(item => {
          return item.status !== '在库' && item.status !== '借出';
        });
      } else {
        // 常规状态筛选
        filtered = filtered.filter(item => {
          return item.status === currentStatus;
        });
      }
    }
    
    // 搜索关键词筛选
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(item => 
        (item.name && item.name.toLowerCase().includes(keyword)) ||
        (item.type && item.type.toLowerCase().includes(keyword)) ||
        (item.specification && item.specification.toLowerCase().includes(keyword)) ||
        (item.id && item.id.toLowerCase().includes(keyword))
      );
    }
    
    this.setData({ filteredEquipmentList: filtered });
  },

  // 搜索输入变化
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.filterEquipmentList();
  },

  // 状态筛选变化
  changeStatusFilter(e) {
    const status = e.currentTarget.dataset.status;
    const currentStatus = this.data.currentStatus;
    
    // 切换筛选状态
    const newStatus = currentStatus === status ? 'all' : status;
    
    this.setData({ currentStatus: newStatus }, () => {
      this.filterEquipmentList();
    });
  },

  // 重置筛选条件
  resetFilters() {
    this.setData({
      currentStatus: 'all',
      searchKeyword: '',
    }, () => {
      this.filterEquipmentList();
    });
  },

  // 新增设备
  onAddEquipment() {
    safeNavigate('/pages/add/add');
  },

  // 查看设备详情
  goToDetail(e) {
    const equipmentId = e.currentTarget?.dataset?.id;
    if (!equipmentId) {
      wx.showToast({
        title: '无法获取设备ID',
        icon: 'none'
      });
      return;
    }
    
    const app = getApp();
    const equipment = app.findEquipmentById(equipmentId);
    
    if (equipment) {
      wx.navigateTo({
        url: `/pages/equipmentDetail/equipmentDetail?id=${equipmentId}`
      });
    } else {
      wx.showToast({
        title: '未找到设备信息',
        icon: 'none'
      });
    }
  },

  // 处理悬浮菜单操作（适配组件事件）
  handleFabAction(e) {
    const { item } = e.detail;
    const action = item.action;
    if (action === 'single') {
      this.onAddEquipment();
    } 
  },

  // 切换悬浮按钮状态（适配组件，无需手动控制，由组件内部处理）
  toggleFab() {
    this.setData({
      fabOpen: !this.data.fabOpen,
      // 打开悬浮菜单时隐藏回到顶部按钮
      showBackToTop: this.data.fabOpen ? this.data.showBackToTop : false
    });
  },

  // 更新同步状态
  updateSyncStatus() {
    const app = getApp();
    const syncManager = app.syncManager;
    const pendingChanges = syncManager.getLocalChanges 
      ? (Array.isArray(syncManager.getLocalChanges()) ? syncManager.getLocalChanges().length : 0)
      : 0;
    
    this.setData({
      syncStatus: syncManager.status || 'idle',
      pendingChanges: pendingChanges // 确保是数字类型
    });
  }
});
    