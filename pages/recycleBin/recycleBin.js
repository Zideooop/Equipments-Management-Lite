Page({
  data: {
    recycleList: [],        // 回收站列表
    filteredList: [],       // 筛选后的列表
    searchKeyword: '',      // 搜索关键词
    selectedIds: [],        // 选中的ID列表
    isSelectAll: false,     // 是否全选
    selectedCount: 0        // 选中数量
  },

  onLoad() {
    // 加载回收站数据
    this.loadRecycleData();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadRecycleData();
  },

 // 加载回收站数据
loadRecycleData() {
  const app = getApp();
  // 确保app.getRecycleBin()方法正确实现
  let recycleList = [];
  try {
    recycleList = app.getRecycleBin() || [];
  } catch (e) {
    console.error('获取回收站数据失败:', e);
    recycleList = wx.getStorageSync('deletedEquipmentList') || [];
  }
  
  // 按删除时间排序，最新删除的在前面
  recycleList.sort((a, b) => {
    return new Date(b.deleteTime || 0) - new Date(a.deleteTime || 0);
  });
  
  this.setData({
    recycleList,
    filteredList: recycleList,
    selectedIds: [],
    isSelectAll: false,
    selectedCount: 0
  });
},

  // 搜索输入处理
  onSearchInput(e) {
    const keyword = e.detail.value.trim().toLowerCase();
    this.setData({ searchKeyword: keyword });
    
    // 筛选列表
    const filtered = this.data.recycleList.filter(item => {
      return item.name.toLowerCase().includes(keyword) ||
             (item.type && item.type.toLowerCase().includes(keyword)) ||
             (item.specification && item.specification.toLowerCase().includes(keyword)) ||
             (item.location && item.location.toLowerCase().includes(keyword));
    });
    
    this.setData({ filteredList: filtered });
  },

  // 检查是否选中
  isSelected(id) {
    return this.data.selectedIds.includes(id);
  },

  // 切换选择状态
  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const { selectedIds } = this.data;
    let newSelectedIds;
    
    if (selectedIds.includes(id)) {
      // 取消选择
      newSelectedIds = selectedIds.filter(itemId => itemId !== id);
    } else {
      // 选中
      newSelectedIds = [...selectedIds, id];
    }
    
    // 更新全选状态
    const isSelectAll = newSelectedIds.length === this.data.filteredList.length && 
                       this.data.filteredList.length > 0;
    
    this.setData({
      selectedIds: newSelectedIds,
      isSelectAll,
      selectedCount: newSelectedIds.length
    });
  },

  // 全选/取消全选
  toggleSelectAll() {
    const { isSelectAll, filteredList } = this.data;
    let selectedIds = [];
    
    if (!isSelectAll) {
      // 全选
      selectedIds = filteredList.map(item => item.id);
    }
    
    this.setData({
      selectedIds,
      isSelectAll: !isSelectAll,
      selectedCount: selectedIds.length
    });
  },

  // 恢复单个项目
  restoreItem(e) {
    const id = e.currentTarget.dataset.id;
    const app = getApp();
    
    wx.showLoading({ title: '恢复中...' });
    
    // 调用恢复方法
    const result = app.restoreFromRecycle(id);
    
    if (result.success) {
      wx.showToast({
        title: '恢复成功',
        icon: 'success',
        duration: 1500
      });
      
      // 重新加载数据
      this.loadRecycleData();
    } else {
      wx.showToast({
        title: result.message || '恢复失败',
        icon: 'none',
        duration: 2000
      });
    }
    
    wx.hideLoading();
  },

  // 批量恢复
  batchRestore() {
    if (this.data.selectedIds.length === 0) return;
    
    const app = getApp();
    let successCount = 0;
    
    wx.showLoading({ title: '批量恢复中...' });
    
    // 逐个恢复选中项
    this.data.selectedIds.forEach(id => {
      const result = app.restoreFromRecycle(id);
      if (result.success) successCount++;
    });
    
    wx.hideLoading();
    
    wx.showToast({
      title: `成功恢复 ${successCount}/${this.data.selectedIds.length} 项`,
      icon: 'success',
      duration: 2000
    });
    
    // 重新加载数据
    this.loadRecycleData();
  },

  // 显示删除确认
  showDeleteConfirm(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.recycleList.find(item => item.id === id);
    
    wx.showModal({
      title: '永久删除',
      content: `确定要永久删除"${item.name}"吗？此操作不可撤销。`,
      confirmText: '删除',
      confirmColor: '#f53f3f',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.permanentlyDelete(id);
        }
      }
    });
  },

  // 显示批量删除确认
  showBatchDeleteConfirm() {
    if (this.data.selectedIds.length === 0) return;
    
    wx.showModal({
      title: '批量永久删除',
      content: `确定要永久删除选中的 ${this.data.selectedIds.length} 项吗？此操作不可撤销。`,
      confirmText: '删除',
      confirmColor: '#f53f3f',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.batchPermanentlyDelete();
        }
      }
    });
  },

  // 永久删除单个项目
  permanentlyDelete(id) {
    const app = getApp();
    
    wx.showLoading({ title: '删除中...' });
    
    // 调用永久删除方法
    const result = app.permanentlyDelete(id);
    
    if (result.success) {
      wx.showToast({
        title: '已永久删除',
        icon: 'success',
        duration: 1500
      });
      
      // 重新加载数据
      this.loadRecycleData();
    } else {
      wx.showToast({
        title: result.message || '删除失败',
        icon: 'none',
        duration: 2000
      });
    }
    
    wx.hideLoading();
  },

  // 批量永久删除
  batchPermanentlyDelete() {
    if (this.data.selectedIds.length === 0) return;
    
    const app = getApp();
    let successCount = 0;
    
    wx.showLoading({ title: '批量删除中...' });
    
    // 逐个删除选中项
    this.data.selectedIds.forEach(id => {
      const result = app.permanentlyDelete(id);
      if (result.success) successCount++;
    });
    
    wx.hideLoading();
    
    wx.showToast({
      title: `已删除 ${successCount}/${this.data.selectedIds.length} 项`,
      icon: 'success',
      duration: 2000
    });
    
    // 重新加载数据
    this.loadRecycleData();
  },

  // 显示清空回收站确认
  showClearConfirm() {
    wx.showModal({
      title: '清空回收站',
      content: '确定要清空回收站吗？所有内容将被永久删除，不可撤销。',
      confirmText: '清空',
      confirmColor: '#f53f3f',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.clearRecycleBin();
        }
      }
    });
  },

  // 清空回收站
  clearRecycleBin() {
    const app = getApp();
    const recycleList = app.getRecycleBin() || [];
    
    if (recycleList.length === 0) return;
    
    wx.showLoading({ title: '清空回收站...' });
    
    try {
      // 记录要删除的项目名称用于日志
      const deletedNames = recycleList.map(item => item.name).join('、');
      
      // 清空回收站
      app.saveRecycleBin([]);
      
      // 记录操作日志
      app.addOperationLog(`清空回收站，共删除 ${recycleList.length} 项：${deletedNames}`);
      
      wx.hideLoading();
      wx.showToast({
        title: '回收站已清空',
        icon: 'success',
        duration: 1500
      });
      
      // 重新加载数据
      this.loadRecycleData();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '清空失败',
        icon: 'none',
        duration: 2000
      });
      console.error('清空回收站失败:', error);
    }
  },

  // 格式化时间显示
  formatTime(timeString) {
    if (!timeString) return '';
    
    const date = new Date(timeString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
})
    