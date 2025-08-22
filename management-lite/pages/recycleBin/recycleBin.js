// pages/recycleBin/recycleBin.js
const { safeNavigate, safeBack } = require('../../utils/navigate.js');

Page({
  data: {
    deletedEquipments: [],
    searchKeyword: '',
    filteredEquipments: [],
    isLoading: true
  },

  onLoad() {
    this.loadDeletedEquipments();
  },

  onShow() {
    this.loadDeletedEquipments();
  },

  // 加载已删除的器材
  loadDeletedEquipments() {
    this.setData({ isLoading: true });
    
    const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
    
    // 格式化日期显示
    const formatDate = (dateString) => {
      if (!dateString) return '无记录';
      const date = new Date(dateString);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    };
    
    // 格式化并按删除时间倒序排列
    const formattedList = deletedList
      .map(item => ({
        ...item,
        deleteTimeFormatted: formatDate(item.deleteTime)
      }))
      .sort((a, b) => new Date(b.deleteTime) - new Date(a.deleteTime));
    
    this.setData({
      deletedEquipments: formattedList,
      filteredEquipments: formattedList,
      isLoading: false
    });
  },

  // 搜索筛选
  onSearchInput(e) {
    const keyword = e.detail.value.trim().toLowerCase();
    const { deletedEquipments } = this.data;
    
    const filtered = deletedEquipments.filter(item => 
      item.name.toLowerCase().includes(keyword) ||
      item.type.toLowerCase().includes(keyword) ||
      item.id.toLowerCase().includes(keyword) ||
      item.specification.toLowerCase().includes(keyword)
    );
    
    this.setData({
      searchKeyword: keyword,
      filteredEquipments: filtered
    });
  },

  // 跳转到器材详情页（已删除状态）
  goToEquipmentDetail(e) {
    const id = e.currentTarget.dataset.id;
    safeNavigate(`/pages/equipmentDetail/equipmentDetail?id=${id}&fromRecycle=true`);
  },

  // 清空回收站
  clearRecycleBin() {
    const { deletedEquipments } = this.data;
    
    if (deletedEquipments.length === 0) {
      wx.showToast({
        title: '回收站已为空',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认清空',
      content: '确定要永久删除所有回收站中的器材吗？此操作不可恢复。',
      confirmText: '清空',
      cancelText: '取消',
      confirmColor: '#f53f3f',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中...',
            mask: true
          });
          
          // 记录批量删除日志
          const app = getApp();
          deletedEquipments.forEach(item => {
            app.addActivityLog({
              type: '删除',
              content: `永久删除了器材【${item.name}】`,
              equipmentId: item.id
            });
          });
          
          wx.setStorageSync('deletedEquipmentList', []);
          this.loadDeletedEquipments();
          
          wx.hideLoading();
          wx.showToast({
            title: '已清空回收站',
            icon: 'success'
          });
        }
      }
    });
  },

  // 返回首页
  goToHome() {
    safeNavigate('/pages/index/index');
  },

  // 返回上一页
  navigateBack() {
    safeBack();
  }
})
