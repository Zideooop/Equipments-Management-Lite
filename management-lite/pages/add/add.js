// pages/add/add.js
Page({
  data: {
    equipment: {
      name: '',
      type: '',
      specification: '',
      quantity: 1,
      location: '',
      status: '在库',
      remarks: ''
    },
    statusOptions: ['在库', '出库']
  },

  onLoad(options) {
    // 处理扫码带入的数据
    if (options.scanResult) {
      this.setData({
        'equipment.specification': decodeURIComponent(options.scanResult)
      });
    }
  },

  // 处理输入
  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    // 处理数量字段，确保至少为1
    if (field === 'quantity') {
      const num = parseInt(value) || 1;
      this.setData({
        [`equipment.${field}`]: num < 1 ? 1 : num
      });
    } else {
      this.setData({
        [`equipment.${field}`]: value
      });
    }
  },

  // 处理状态变更
  handleStatusChange(e) {
    const index = e.detail.value;
    this.setData({
      'equipment.status': this.data.statusOptions[index]
    });
  },

  // 取消
  cancel() {
    wx.navigateBack();
  },

  // 保存器材
  saveEquipment() {
    const app = getApp();
    const result = app.saveEquipment(this.data.equipment);
    
    if (result.success) {
      wx.showToast({ title: '添加成功' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } else {
      wx.showToast({ 
        title: result.message || '添加失败', 
        icon: 'none' 
      });
    }
  }
})
    