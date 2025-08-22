// pages/manage/manage.js
Page({
  data: {
    equipmentList: [],
    filteredEquipmentList: [],
    currentStatus: 'all',
    searchKeyword: ''
  },

  onLoad(options) {
    // 从URL参数获取状态筛选条件
    if (options.status) {
      this.setData({ currentStatus: options.status });
    }
  },

  onShow() {
    // 加载器材列表
    this.loadEquipmentList();
  },

  // 加载器材列表
  loadEquipmentList() {
    const app = getApp();
    const equipmentList = app.getEquipmentList();
    
    this.setData({
      equipmentList: equipmentList,
      filteredEquipmentList: this.filterEquipment(equipmentList)
    });
  },

  // 筛选器材
  filterEquipment(equipmentList) {
    const { currentStatus, searchKeyword } = this.data;
    let filtered = [...equipmentList];
    
    // 状态筛选
    if (currentStatus !== 'all') {
      filtered = filtered.filter(item => item.status === currentStatus);
    }
    
    // 搜索筛选
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(keyword) || 
        item.type.toLowerCase().includes(keyword) ||
        item.specification.toLowerCase().includes(keyword)
      );
    }
    
    return filtered;
  },

  // 设置筛选条件
  setFilter(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ 
      currentStatus: status,
      filteredEquipmentList: this.filterEquipment(this.data.equipmentList)
    });
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ 
      searchKeyword: e.detail.value,
      filteredEquipmentList: this.filterEquipment(this.data.equipmentList)
    });
  },

  // 跳转到器材详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/equipmentDetail/equipmentDetail?id=${id}`
    });
  }
})
    