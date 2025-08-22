// pages/batchAdd/batchAdd.js
Page({
  data: {
    equipmentType: '',
    equipmentLocation: '',
    equipmentListText: '',
    equipmentRemarks: '',
    previewList: [],
    validCount: 0,
    hasValidItems: false
  },

  // 类型输入
  onTypeInput(e) {
    this.setData({ equipmentType: e.detail.value });
  },

  // 位置输入
  onLocationInput(e) {
    this.setData({ equipmentLocation: e.detail.value });
  },

  // 列表输入
  onListInput(e) {
    const text = e.detail.value;
    this.setData({ equipmentListText: text });
    this.parseEquipmentList(text);
  },

  // 备注输入
  onRemarksInput(e) {
    this.setData({ equipmentRemarks: e.detail.value });
  },

  // 解析器材列表
  parseEquipmentList(text) {
    if (!text) {
      this.setData({ previewList: [], validCount: 0, hasValidItems: false });
      return;
    }
    
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const type = this.data.equipmentType;
    const location = this.data.equipmentLocation;
    const remarks = this.data.equipmentRemarks;
    
    let previewList = [];
    let validCount = 0;
    
    lines.forEach((line, index) => {
      const parts = line.split(',').map(part => part.trim());
      
      // 验证格式：至少包含名称和数量
      if (parts.length >= 1) {
        const name = parts[0];
        const specification = parts.length >= 2 ? parts[1] : '';
        const quantity = parts.length >= 3 ? parseInt(parts[2]) || 1 : 1;
        
        const isValid = !!name;
        
        if (isValid) validCount++;
        
        previewList.push({
          name,
          specification,
          quantity,
          type,
          location,
          remarks,
          invalid: !isValid
        });
      } else {
        previewList.push({
          name: line,
          invalid: true
        });
      }
    });
    
    this.setData({
      previewList,
      validCount,
      hasValidItems: validCount > 0
    });
  },

  // 取消
  cancel() {
    wx.navigateBack();
  },

  // 批量保存
  saveBatch() {
    const { previewList, validCount } = this.data;
    
    if (validCount === 0) {
      wx.showToast({ title: '没有有效数据', icon: 'none' });
      return;
    }
    
    if (!this.data.equipmentType) {
      wx.showToast({ title: '请输入器材类型', icon: 'none' });
      return;
    }
    
    // 过滤有效数据
    const validEquipments = previewList.filter(item => !item.invalid);
    
    // 保存器材
    const app = getApp();
    let successCount = 0;
    
    validEquipments.forEach(equipment => {
      const result = app.saveEquipment({
        ...equipment,
        status: '在库',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      });
      
      if (result.success) successCount++;
    });
    
    wx.showToast({ 
      title: `成功添加 ${successCount}/${validCount} 条`, 
      icon: 'success' 
    });
    
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
})
    