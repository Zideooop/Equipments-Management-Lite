// pages/recycleBin/recycleBin.js
Page({
  data: {
    deletedEquipmentList: [],
    loading: true,
    searchKey: '',
    filteredList: []
  },

  onLoad() {
    this.setData({ loading: true });
  },

  onShow() {
    // 加载回收站数据
    this.loadDeletedEquipments();
  },

  // 下拉刷新
  onPullDownRefresh() {
    const app = getApp();
    app.syncData(false).then(result => {
      if (result.success) {
        this.loadDeletedEquipments();
        wx.showToast({
          title: '同步成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result.message || '同步失败',
          icon: 'none'
        });
      }
      wx.stopPullDownRefresh();
    });
  },

  // 数据更新回调
  onDataUpdated() {
    this.loadDeletedEquipments();
  },

  // 加载回收站数据
  loadDeletedEquipments() {
    try {
      this.setData({ loading: true });
      
      const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
      // 按删除时间排序，最新删除的在前
      deletedList.sort((a, b) => new Date(b.deleteTime) - new Date(a.deleteTime));
      
      this.setData({ 
        deletedEquipmentList: deletedList,
        filteredList: deletedList,
        loading: false
      });
      
      // 应用搜索筛选
      if (this.data.searchKey) {
        this.applySearchFilter();
      }
    } catch (err) {
      console.error('加载回收站数据失败:', err);
      this.setData({ 
        deletedEquipmentList: [],
        filteredList: [],
        loading: false
      });
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKey: e.detail.value.trim()
    }, () => {
      this.applySearchFilter();
    });
  },

  // 应用搜索筛选
  applySearchFilter() {
    const { deletedEquipmentList, searchKey } = this.data;
    
    if (!searchKey) {
      this.setData({
        filteredList: deletedEquipmentList
      });
      return;
    }
    
    const key = searchKey.toLowerCase();
    const filtered = deletedEquipmentList.filter(item => 
      item.name.toLowerCase().includes(key) || 
      item.code.toLowerCase().includes(key) ||
      item.type.toLowerCase().includes(key)
    );
    
    this.setData({
      filteredList: filtered
    });
  },

  // 恢复器材
  restoreEquipment(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    
    wx.showModal({
      title: '确认恢复',
      content: `确定要恢复器材"${name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          const result = app.restoreEquipment(id);
          
          if (result.success) {
            // 记录日志
            app.addActivityLog({
              type: '恢复',
              content: `恢复器材: ${name}`,
              equipmentId: id
            });
            
            wx.showToast({ title: '恢复成功' });
            this.loadDeletedEquipments();
          } else {
            wx.showToast({ 
              title: result.message || '恢复失败', 
              icon: 'none' 
            });
          }
        }
      }
    });
  },

  // 永久删除
  permanentlyDelete(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    
    wx.showModal({
      title: '警告',
      content: `确定要永久删除器材"${name}"吗？此操作不可恢复！`,
      confirmText: '永久删除',
      confirmColor: '#f5222d',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          const result = app.permanentlyDelete(id);
          
          if (result.success) {
            // 记录日志
            app.addActivityLog({
              type: '永久删除',
              content: `永久删除器材: ${name}`,
              equipmentId: id
            });
            
            wx.showToast({ title: '删除成功' });
            this.loadDeletedEquipments();
          } else {
            wx.showToast({ 
              title: result.message || '删除失败', 
              icon: 'none' 
            });
          }
        }
      }
    });
  },

  // 清空回收站
  clearRecycleBin() {
    const { deletedEquipmentList } = this.data;
    
    if (deletedEquipmentList.length === 0) {
      wx.showToast({ title: '回收站已为空', icon: 'none' });
      return;
    }
    
    wx.showModal({
      title: '警告',
      content: `确定要清空回收站吗？将永久删除${deletedEquipmentList.length}个器材，此操作不可恢复！`,
      confirmText: '清空',
      confirmColor: '#f5222d',
      success: (res) => {
        if (res.confirm) {
          try {
            const app = getApp();
            
            // 记录日志
            app.addActivityLog({
              type: '清空回收站',
              content: `清空回收站，共删除${deletedEquipmentList.length}个器材`,
              equipmentId: ''
            });
            
            // 清空回收站
            wx.setStorageSync('deletedEquipmentList', []);
            
            // 记录所有永久删除的变更
            deletedEquipmentList.forEach(item => {
              app.recordPendingChange('permanentDelete', item.id);
            });
            
            // 触发同步
            app.syncData(false);
            
            wx.showToast({ title: '清空成功' });
            this.loadDeletedEquipments();
          } catch (err) {
            console.error('清空回收站失败:', err);
            wx.showToast({ title: '清空失败', icon: 'none' });
          }
        }
      }
    });
  }
});
