const app = getApp();
const { safeNavigate, safeBack } = require('../../utils/navigation.js');
Page({
  data: {
    // 设备列表数据
    equipmentList: [],
    filteredEquipmentList: [],
    // 搜索和筛选条件
    searchKeyword: '',
    currentStatus: 'all',
    currentType: 'all',
    filterPanelVisible: false,
    // 状态选项配置
    statusOptions: [
      { status: 'all', text: '全部', icon: '/images/status/status-all.png' },
      { status: '在库', text: '在库', icon: '/images/status/status-available.png' },
      { status: '借出', text: '借出', icon: '/images/status/status-borrowed.png' }
    ],
    // 类型选项配置
    typeOptions: [
      { type: 'all', text: '全部' },
      { type: 'system', text: '系统类型' },
      { type: 'other', text: '其他类' }
    ],
    // 交互状态
    isLoading: true,
    fabOpen: false
  },

  onLoad() {
    this.loadEquipmentData();
  },

  onShow() {
    this.loadEquipmentData();
  },

  // 加载设备数据
  loadEquipmentData() {
    this.setData({ isLoading: true });
    
    try {
      const equipmentList = app.globalData.equipmentList || [];
      
      if (equipmentList.length === 0) {
        const storedList = wx.getStorageSync('equipmentList') || [];
        app.globalData.equipmentList = storedList;
        this.setData({ equipmentList: storedList });
      } else {
        this.setData({ equipmentList });
      }
      
      this.filterEquipmentList();
      this.setData({ isLoading: false });
    } catch (error) {
      console.error('加载设备数据失败:', error);
      this.setData({ isLoading: false });
    }
  },

  // 筛选设备列表
  filterEquipmentList() {
    const { equipmentList, searchKeyword, currentStatus, currentType } = this.data;
    
    let filtered = [...equipmentList];
    
    // 状态筛选
    if (currentStatus !== 'all') {
      filtered = filtered.filter(item => item.status === currentStatus);
    }
    
    // 类型筛选 - 其他类处理
    if (currentType === 'system') {
      const systemTypes = ['工具', '器材', '设备'];
      filtered = filtered.filter(item => systemTypes.includes(item.type));
    } else if (currentType === 'other') {
      const systemTypes = ['工具', '器材', '设备'];
      filtered = filtered.filter(item => !systemTypes.includes(item.type));
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
    this.setData({ searchKeyword: e.detail.value }, () => {
      this.filterEquipmentList();
    });
  },

  // 切换状态筛选
  changeStatusFilter(e) {
    this.setData({ currentStatus: e.currentTarget.dataset.status }, () => {
      this.filterEquipmentList();
    });
  },

  // 切换类型筛选
  changeTypeFilter(e) {
    this.setData({ currentType: e.currentTarget.dataset.type }, () => {
      this.filterEquipmentList();
    });
  },

  // 重置筛选条件
  resetFilters() {
    this.setData({
      currentStatus: 'all',
      currentType: 'all',
      searchKeyword: ''
    }, () => {
      this.filterEquipmentList();
    });
  },

  // 切换筛选面板
  toggleFilterPanel() {
    this.setData({
      filterPanelVisible: !this.data.filterPanelVisible
    });
  },

  // 切换悬浮按钮
  toggleFab() {
    this.setData({ fabOpen: !this.data.fabOpen });
  },

  // 处理悬浮菜单操作
  handleFabAction(e) {
    const action = e.currentTarget.dataset.action;
    if (action === 'single') {
      this.goToAddPage();
    } else if (action === 'batch') {
      safeNavigate('/pages/batchAdd/batchAdd');
    }
    this.setData({ fabOpen: false });
  },

  // 跳转到添加设备页面
  goToAddPage() {
    safeNavigate('/pages/add/add');
  },

  // 跳转到设备详情页
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    safeNavigate(`/pages/equipmentDetail/equipmentDetail?id=${id}`);
  },

  // 返回上一页
  goBack() {
    safeBack();
  }
})
    