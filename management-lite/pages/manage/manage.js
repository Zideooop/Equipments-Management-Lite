// pages/manage/manage.js
Page({
  data: {
    equipmentList: [],
    filteredEquipmentList: [],
    searchKeyword: '',
    currentStatus: 'all',
    statusOptions: [
      { value: 'all', text: '全部' },
      { value: '在库', text: '可用' },
      { value: '借出', text: '已借出' }
    ]
  },

  onLoad() {
    // 页面加载时初始化
  },

  onShow() {
    // 从全局变量获取筛选状态
    const app = getApp();
    const filterStatus = app.globalData.filterStatus;
    
    if (filterStatus) {
      this.setData({
        currentStatus: filterStatus
      });
      // 清空全局变量
      app.globalData.filterStatus = null;
    }
    
    this.loadEquipmentList();
  },

  // 加载器材列表
  loadEquipmentList() {
    const app = getApp();
    const equipmentList = app.getEquipmentList() || [];
    
    this.setData({
      equipmentList: equipmentList,
      filteredEquipmentList: this.filterEquipment(equipmentList)
    });
  },

  // 筛选器材列表
  filterEquipment(equipmentList) {
    const { currentStatus, searchKeyword } = this.data;
    
    return equipmentList.filter(item => {
      // 状态筛选
      const statusMatch = currentStatus === 'all' || item.status === currentStatus;
      
      // 关键词筛选
      const keywordMatch = !searchKeyword || 
        item.name.includes(searchKeyword) || 
        item.type.includes(searchKeyword) ||
        item.specification.includes(searchKeyword) ||
        item.location.includes(searchKeyword);
      
      return statusMatch && keywordMatch;
    });
  },

  // 切换状态筛选
  changeStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({
      currentStatus: status
    }, () => {
      this.loadEquipmentList();
    });
  },

  // 搜索框输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    }, () => {
      this.loadEquipmentList();
    });
  },

  // 跳转到器材详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/equipmentDetail/equipmentDetail?id=${id}`
    });
  },

  // 跳转到添加页面
  goToAddPage() {
    wx.navigateTo({
      url: '/pages/add/add'
    });
  }
})
    