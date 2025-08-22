// pages/equipmentDetail/equipmentDetail.js
Page({
  data: {
    equipment: null,
    loading: true
  },

  onLoad(options) {
    const { id } = options;
    const app = getApp();
    const equipmentList = app.getEquipmentList();
    const equipment = equipmentList.find(item => item.id === id);
    
    if (equipment) {
      this.setData({ equipment, loading: false });
    } else {
      this.setData({ loading: false });
    }
  },

  // 格式化日期
  formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  // 返回
  goBack() {
    wx.navigateBack();
  },

  // 编辑器材
  editEquipment() {
    const { id } = this.data.equipment;
    wx.navigateTo({
      url: `/pages/add/add?id=${id}`
    });
  },

  // 切换状态
  toggleStatus() {
    const { equipment } = this.data;
    const newStatus = equipment.status === '在库' ? '借出' : '在库';
    const actionText = newStatus === '借出' ? '借出' : '归还';
    
    wx.showModal({
      title: '确认操作',
      content: `确定要将【${equipment.name}】标记为${newStatus}吗？`,
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          const result = app.saveEquipment({
            ...equipment,
            status: newStatus,
            updateTime: new Date().toISOString()
          });
          
          if (result.success) {
            // 记录活动
            app.logActivity({
              id: Date.now().toString(),
              type: actionText,
              equipmentId: equipment.id,
              equipmentName: equipment.name,
              content: `${actionText}了器材: ${equipment.name}`,
              createTime: new Date().toISOString()
            });
            
            this.setData({ 'equipment.status': newStatus });
            wx.showToast({ title: `已标记为${newStatus}` });
          }
        }
      }
    });
  },

  // 删除器材
  deleteEquipment() {
    const { equipment } = this.data;
    wx.showModal({
      title: '确认删除',
      content: `确定要将【${equipment.name}】移至回收站吗？`,
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          const result = app.markAsDeleted(equipment.id);
          
          if (result.success) {
            wx.showToast({ title: '已移至回收站' });
            setTimeout(() => wx.navigateBack(), 1500);
          }
        }
      }
    });
  }
})
    