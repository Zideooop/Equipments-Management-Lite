// pages/batchAdd/batchAdd.js
const app = getApp();

Page({
  data: {
    textContent: '',
    showPreview: false,
    previewList: [],
    totalCount: 0,
    validCount: 0,
    invalidCount: 0,
    isProcessing: false,
    isSaving: false,
    showError: false,
    errorMsg: ''
  },

  // 文本变化处理
  onTextChange(e) {
    this.setData({ 
      textContent: e.detail.value,
      showPreview: false
    });
  },

  // 清空文本
  clearText() {
    this.setData({ 
      textContent: '',
      showPreview: false,
      previewList: []
    });
  },

  // 预览数据
  previewData() {
    const { textContent } = this.data;
    
    if (!textContent.trim()) {
      this.showError('请输入器材数据');
      return;
    }
    
    this.setData({ isProcessing: true });
    
    // 解析文本内容
    const lines = textContent.trim().split('\n');
    const previewList = [];
    const validStatus = ['在库', '使用中', '维修中', '已报废'];
    
    lines.forEach((line, index) => {
      if (!line.trim()) return;
      
      const item = {
        lineNumber: index + 1,
        name: '',
        type: '',
        model: '',
        quantity: 1,
        location: '',
        status: '在库',
        invalid: false,
        error: ''
      };
      
      const parts = line.split(',').map(p => p.trim());
      
      // 验证并解析各字段
      if (!parts[0]) {
        item.invalid = true;
        item.error = '名称不能为空';
      } else {
        item.name = parts[0];
        
        if (parts[1]) {
          item.type = parts[1];
        } else {
          item.invalid = true;
          item.error = '类型不能为空';
        }
        
        if (!item.invalid) {
          item.model = parts[2] || '';
          
          // 处理数量
          if (parts[3]) {
            const quantity = parseInt(parts[3]);
            if (isNaN(quantity) || quantity < 1) {
              item.invalid = true;
              item.error = '数量必须是大于0的数字';
            } else {
              item.quantity = quantity;
            }
          }
          
          // 处理位置
          item.location = parts[4] || '';
          
          // 处理状态
          if (parts[5] && validStatus.includes(parts[5])) {
            item.status = parts[5];
          }
        }
      }
      
      previewList.push(item);
    });
    
    // 统计数据
    const totalCount = previewList.length;
    const validCount = previewList.filter(item => !item.invalid).length;
    const invalidCount = totalCount - validCount;
    
    this.setData({
      showPreview: true,
      previewList,
      totalCount,
      validCount,
      invalidCount,
      isProcessing: false
    });
  },

  // 批量保存
  async saveBatch() {
    const app = getApp();
    const { previewList } = this.data;
    const validItems = previewList.filter(item => !item.invalid);
    
    if (validItems.length === 0) {
      this.showError('没有有效数据可添加');
      return;
    }
    
    if (typeof app.addEquipment !== 'function') {
      this.showError('系统错误：缺少添加方法');
      return;
    }
    
    try {
      this.setData({ isProcessing: true, isSaving: true });
      wx.showLoading({ title: '批量添加中...' });
      
      // 异步循环添加，确保每条数据添加完成
      for (const item of validItems) {
        // 对于数量大于1的，创建多个条目
        for (let i = 0; i < item.quantity; i++) {
          await app.addEquipment({
            name: item.name,
            type: item.type,
            model: item.model,
            quantity: 1, // 单个添加，数量都为1
            location: item.location,
            status: item.status,
            remarks: `批量添加 #${item.lineNumber}`
          });
        }
      }
      
      wx.hideLoading();
      this.setData({ isProcessing: false, isSaving: false });
      
      const total = validItems.reduce((sum, item) => sum + item.quantity, 0);
      wx.showToast({ 
        title: `成功添加${total}条数据`, 
        icon: 'success',
        duration: 2000
      });
      
      setTimeout(() => {
        safeBack();
      }, 2000);
    } catch (error) {
      wx.hideLoading();
      console.error('批量保存失败:', error);
      this.setData({ isProcessing: false, isSaving: false });
      this.showError('保存失败，请重试');
    }
  },

  // 显示错误信息
  showError(msg) {
    this.setData({
      showError: true,
      errorMsg: msg
    });
    setTimeout(() => {
      this.setData({ showError: false });
    }, 3000);
  }
});
