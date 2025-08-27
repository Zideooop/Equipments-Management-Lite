Page({
  data: {
    previewList: [],
    isUploading: false,
    uploadProgress: 0
  },

  onLoad() {
    // 初始化预览列表
    this.setData({
      previewList: [
        { id: 1, name: '', model: '', quantity: 1, invalid: false, error: '' },
        { id: 2, name: '', model: '', quantity: 1, invalid: false, error: '' }
      ]
    });
  },

  // 添加新行
  addRow() {
    const { previewList } = this.data;
    const newId = Math.max(...previewList.map(item => item.id)) + 1;
    previewList.push({
      id: newId,
      name: '',
      model: '',
      quantity: 1,
      invalid: false,
      error: ''
    });
    this.setData({ previewList });
  },

  // 删除行
  deleteRow(e) {
    const { previewList } = this.data;
    const id = e.currentTarget.dataset.id;
    
    if (previewList.length <= 1) {
      wx.showToast({
        title: '至少保留一行',
        icon: 'none'
      });
      return;
    }
    
    const newList = previewList.filter(item => item.id !== id);
    this.setData({ previewList: newList });
  },

  // 输入变化
  inputChange(e) {
    const { previewList } = this.data;
    const { id, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    // 更新值并验证
    const newList = previewList.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // 验证名称必填
        if (field === 'name') {
          updated.invalid = !value.trim();
          updated.error = updated.invalid ? '名称不能为空' : '';
        }
        
        // 验证数量为正整数
        if (field === 'quantity') {
          const num = parseInt(value, 10);
          updated.invalid = isNaN(num) || num < 1;
          updated.error = updated.invalid ? '数量必须为正整数' : '';
          updated.quantity = updated.invalid ? item.quantity : num;
        }
        
        return updated;
      }
      return item;
    });
    
    this.setData({ previewList: newList });
  },

  // 批量保存器材（修复：使用正确的addEquipment方法）
  saveBatch() {
    const app = getApp();
    const validItems = this.data.previewList.filter(item => !item.invalid);
    
    if (validItems.length === 0) {
      wx.showToast({ title: '没有有效数据可添加', icon: 'none' });
      return;
    }
    
    // 检查app是否有addEquipment方法
    if (typeof app.addEquipment !== 'function') {
      wx.showToast({
        title: '系统错误：缺少添加方法',
        icon: 'none'
      });
      return;
    }
    
    try {
      validItems.forEach(item => {
        // 循环添加多个相同器材（根据数量）
        for (let i = 0; i < item.quantity; i++) {
          app.addEquipment({
            name: item.name,
            model: item.model || '无型号',
            status: '在库',
            addTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
          });
        }
      });
      
      wx.showToast({ title: `成功添加${validItems.reduce((sum, item) => sum + item.quantity, 0)}条数据` });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('批量保存失败:', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  },

  // 从Excel导入（模拟）
  importFromExcel() {
    wx.showModal({
      title: '提示',
      content: '此功能将从Excel导入数据',
      confirmText: '选择文件',
      success: (res) => {
        if (res.confirm) {
          // 模拟导入成功
          this.setData({
            isUploading: true,
            uploadProgress: 0
          });
          
          // 模拟进度条
          const timer = setInterval(() => {
            const { uploadProgress } = this.data;
            if (uploadProgress >= 100) {
              clearInterval(timer);
              this.setData({
                isUploading: false,
                previewList: [
                  { id: 1, name: '笔记本电脑', model: 'MacBook Pro', quantity: 5, invalid: false, error: '' },
                  { id: 2, name: '投影仪', model: 'EPSON CB-2265U', quantity: 2, invalid: false, error: '' },
                  { id: 3, name: '激光笔', model: 'Logitech R800', quantity: 10, invalid: false, error: '' }
                ]
              });
              wx.showToast({ title: '导入成功' });
            } else {
              this.setData({ uploadProgress: uploadProgress + 10 });
            }
          }, 200);
        }
      }
    });
  }
});