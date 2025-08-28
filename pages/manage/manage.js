const app = getApp();
// 修复：正确引入导航工具（路径根据实际项目结构调整）
const { safeNavigate, safeBack } = require('../../utils/navigation.js');
Page({
  data: {
    // 设备列表数据
    equipmentList: [],
    filteredEquipmentList: [],
    // 搜索和筛选条件
    searchKeyword: '',
    currentStatus: 'all',
    // 状态选项配置
    statusOptions: [
      { status: 'all', text: '全部', icon: '/images/status/status-all.png' },
      { status: '在库', text: '在库', icon: '/images/status/status-available.png' },
      { status: '借出', text: '借出', icon: '/images/status/status-borrowed.png' }
    ],
    // 交互状态
    isLoading: true,
    fabOpen: false
  },

  onLoad() {
    // 页面加载时获取设备数据
    this.loadEquipmentData();
  },

  onShow() {
    // 页面显示时刷新数据（从其他页面返回时）
    this.loadEquipmentData();
  },

  // 加载设备数据
  loadEquipmentData() {
    this.setData({ isLoading: true });
    
    try {
      // 从全局数据或本地缓存获取设备列表
      const app = getApp();
      const equipmentList = app.globalData.equipmentList || wx.getStorageSync('equipmentList') || [];
      
      this.setData({
        equipmentList: equipmentList,
        isLoading: false
      }, () => {
        // 数据加载完成后执行筛选
        this.filterEquipmentList();
      });
    } catch (error) {
      console.error('加载设备数据失败:', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: '数据加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 筛选设备列表
  filterEquipmentList() {
    const { equipmentList, searchKeyword, currentStatus } = this.data;
    
    let filtered = [...equipmentList];
    
    // 状态筛选
    if (currentStatus !== 'all') {
      filtered = filtered.filter(item => item.status === currentStatus);
    }
    
    // 关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase();
      filtered = filtered.filter(item => 
        (item.name && item.name.toLowerCase().includes(keyword)) ||
        (item.type && item.type.toLowerCase().includes(keyword)) ||
        (item.specification && item.specification.toLowerCase().includes(keyword)) ||
        (item.location && item.location.toLowerCase().includes(keyword))
      );
    }
    
    this.setData({ filteredEquipmentList: filtered });
  },

  // 搜索输入事件
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value }, () => {
      this.filterEquipmentList();
    });
  },

  // 切换状态筛选
  changeStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ currentStatus: status }, () => {
      this.filterEquipmentList();
    });
  },

  // 切换悬浮按钮菜单
  toggleFab() {
    this.setData({ fabOpen: !this.data.fabOpen });
  },

  // 悬浮按钮操作
  handleFabAction(e) {
    const action = e.currentTarget.dataset.action;
    this.setData({ fabOpen: false });
    
    if (action === 'single') {
      // 跳转到单个添加页面
      safeNavigate('/pages/add/add');
    } else if (action === 'batch') {
      // 跳转到批量添加页面
      safeNavigate({ url: '/pages/batchAdd/batchAdd' });
    }
  },

  // 跳转到详情页
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      safeNavigate({ url: `/pages/equipmentDetail/equipmentDetail?id=${id}` });
    }
  },

  // 编辑设备
  handleEdit(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      safeNavigate({ url: `/pages/editEquipment/editEquipment?id=${id}` });
    }
  },

  // 删除设备
  handleDelete(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    
    const equipment = this.data.equipmentList.find(item => item.id === id);
    if (!equipment) return;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除设备「${equipment.name}」吗？删除后将移至回收站。`,
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#f53f3f',
      success: (res) => {
        if (res.confirm) {
          this._deleteEquipment(id);
        }
      }
    });
  },

  // 执行删除操作
  _deleteEquipment(id) {
    try {
      const app = getApp();
      // 获取当前设备列表
      let { equipmentList } = this.data;
      // 找到要删除的设备
      const index = equipmentList.findIndex(item => item.id === id);
      if (index === -1) return;
      
      const deletedItem = equipmentList.splice(index, 1)[0];
      // 添加删除时间
      deletedItem.deleteTime = new Date().toISOString();
      
      // 更新设备列表
      this.setData({ equipmentList }, () => {
        // 同步到全局和缓存
        app.globalData.equipmentList = equipmentList;
        wx.setStorageSync('equipmentList', equipmentList);
        
        // 添加到回收站
        const recycleBin = wx.getStorageSync('recycleBin') || [];
        recycleBin.unshift(deletedItem);
        wx.setStorageSync('recycleBin', recycleBin);
        
        // 刷新筛选列表
        this.filterEquipmentList();
        
        // 记录操作日志
        app.addOperationLog(`删除设备：${deletedItem.name}`);
        
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 1500
        });
      });
    } catch (error) {
      console.error('删除设备失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none',
        duration: 2000
      });
    }
  }
});
