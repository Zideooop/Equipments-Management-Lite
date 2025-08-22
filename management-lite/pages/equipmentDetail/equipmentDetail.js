// pages/equipmentDetail/equipmentDetail.js
Page({
  data: {
    equipment: null,
    loading: true,
    borrowForm: {
      borrower: '',
      contact: '',
      returnDate: ''
    }
  },

  onLoad(options) {
    const { id } = options;
    const app = getApp();
    const equipmentList = app.getEquipmentList();
    const equipment = equipmentList.find(item => item.id === id || item._id === id);
    
    if (equipment) {
      this.setData({ equipment, loading: false });
    } else {
      // 检查是否在回收站中
      const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
      const deletedItem = deletedList.find(item => item.id === id || item._id === id);
      
      if (deletedItem) {
        this.setData({ equipment: deletedItem, loading: false });
      } else {
        wx.showToast({ title: '未找到器材', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    }
  },

  // 格式化日期
  formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  // 编辑器材
  editEquipment() {
    const { id } = this.data.equipment;
    wx.switchTab({
      url: `/pages/add/add?id=${id}`
    });
  },

  // 借出器材
  lendEquipment() {
    const { equipment } = this.data;
    
    wx.showModal({
      title: '借出器材',
      content: `请输入借用人信息，确认借出【${equipment.name}】`,
      editable: true,
      placeholderText: '请输入借用人姓名和联系方式，用逗号分隔',
      success: (res) => {
        if (res.confirm && res.content) {
          const [borrower, contact] = res.content.split(',').map(item => item.trim());
          
          if (!borrower) {
            wx.showToast({ title: '请输入借用人姓名', icon: 'none' });
            return;
          }
          
          // 获取当前日期
          const today = new Date();
          const borrowTime = this.formatDate(today.toISOString());
          
          // 预设归还日期为7天后
          const returnDate = new Date();
          returnDate.setDate(today.getDate() + 7);
          const returnTime = `${returnDate.getFullYear()}-${(returnDate.getMonth() + 1).toString().padStart(2, '0')}-${returnDate.getDate().toString().padStart(2, '0')}`;
          
          // 更新器材状态
          const app = getApp();
          const result = app.saveEquipment({
            ...equipment,
            status: '借出',
            borrower,
            contact,
            borrowTime,
            returnTime,
            updateTime: new Date().toISOString()
          });
          
          if (result.success) {
            this.setData({ 
              equipment: {
                ...equipment,
                status: '借出',
                borrower,
                contact,
                borrowTime,
                returnTime,
                updateTime: new Date().toISOString()
              } 
            });
            
            // 记录活动日志
            app.addActivityLog({
              type: '借出',
              content: `借出器材：${equipment.name}（借用人：${borrower}）`,
              equipmentId: equipment.id,
              equipmentName: equipment.name
            });
            
            wx.showToast({ title: '已标记为借出' });
          }
        }
      }
    });
  },

  // 归还器材
  returnEquipment() {
    const { equipment } = this.data;
    
    wx.showModal({
      title: '确认归还',
      content: `确认【${equipment.name}】已归还？`,
      success: (res) => {
        if (res.confirm) {
          // 更新器材状态
          const app = getApp();
          const updatedEquipment = {
            ...equipment,
            status: '在库',
            // 保留借用记录但清空状态标记
            returnActualTime: this.formatDate(new Date().toISOString()),
            updateTime: new Date().toISOString()
          };
          
          // 移除临时借用字段
          delete updatedEquipment.borrower;
          delete updatedEquipment.contact;
          delete updatedEquipment.borrowTime;
          delete updatedEquipment.returnTime;
          
          const result = app.saveEquipment(updatedEquipment);
          
          if (result.success) {
            this.setData({ 
              equipment: updatedEquipment
            });
            
            // 记录活动日志
            app.addActivityLog({
              type: '归还',
              content: `归还器材：${equipment.name}`,
              equipmentId: equipment.id,
              equipmentName: equipment.name
            });
            
            wx.showToast({ title: '已标记为在库' });
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
    