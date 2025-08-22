// pages/recycleBin/recycleBin.js
Page({
  data: {
    deletedEquipmentList: []
  },

  onShow() {
    // 加载回收站数据
    const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
    this.setData({ deletedEquipmentList: deletedList });
  },

  // 格式化日期
  formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },

  // 查看详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.switchTab({
      url: `/pages/equipmentDetail/equipmentDetail?id=${id}`
    });
  },

  // 恢复器材
  restoreEquipment(e) {
    const id = e.currentTarget.dataset.id;
    const equipment = this.data.deletedEquipmentList.find(item => item.id === id);
    
    if (!equipment) return;
    
    wx.showModal({
      title: '确认恢复',
      content: `确定要恢复【${equipment.name}】吗？`,
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          const result = app.restoreEquipment(id);
          
          if (result.success) {
            this.setData({
              deletedEquipmentList: wx.getStorageSync('deletedEquipmentList') || []
            });
            wx.showToast({ title: '已恢复' });
          }
        }
      }
    });
  },

  // 永久删除
  permanentlyDelete(e) {
    const id = e.currentTarget.dataset.id;
    const equipment = this.data.deletedEquipmentList.find(item => item.id === id);
    
    if (!equipment) return;
    
    wx.showModal({
      title: '永久删除',
      content: `确定要永久删除【${equipment.name}】吗？此操作不可恢复！`,
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          const result = app.permanentlyDelete(id);
          
          if (result.success) {
            this.setData({
              deletedEquipmentList: wx.getStorageSync('deletedEquipmentList') || []
            });
            wx.showToast({ title: '已永久删除' });
          }
        }
      }
    });
  }
})
    