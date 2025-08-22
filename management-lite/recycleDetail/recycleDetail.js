// pages/recycleDetail/recycleDetail.js
Page({
  data: {
    equipment: null,
    isLoading: true
  },

  onLoad(options) {
    if (options.id) {
      this.loadDeletedEquipmentDetail(options.id);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        this.navigateBack();
      }, 1500);
    }
  },

  // 加载已删除器材详情
  loadDeletedEquipmentDetail(id) {
    const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
    const equipment = deletedList.find(item => item.id === id);
    
    if (equipment) {
      // 格式化日期显示
      const formatDate = (dateString) => {
        if (!dateString) return '无记录';
        const date = new Date(dateString);
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      };
      
      // 格式化信息
      const formattedEquipment = {
        ...equipment,
        createTimeFormatted: formatDate(equipment.createTime),
        updateTimeFormatted: formatDate(equipment.updateTime),
        deleteTimeFormatted: formatDate(equipment.deleteTime),
        borrowTimeFormatted: formatDate(equipment.borrowTime),
        returnTimeFormatted: formatDate(equipment.returnTime)
      };
      
      this.setData({
        equipment: formattedEquipment,
        isLoading: false
      });
    } else {
      wx.showToast({
        title: '该器材不存在或已被彻底删除',
        icon: 'none'
      });
      setTimeout(() => {
        this.navigateBack();
      }, 1500);
    }
  },

  // 一键还原器材
  restoreEquipment() {
    const { equipment } = this.data;
    
    wx.showModal({
      title: '确认还原',
      content: `确定要还原【${equipment.name}】吗？`,
      confirmText: '还原',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中...',
            mask: true
          });
          
          const app = getApp();
          const result = app.restoreEquipment(equipment.id);
          
          wx.hideLoading();
          
          if (result.success) {
            wx.showToast({
              title: '还原成功',
              icon: 'success'
            });
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/manage/manage'
              });
            }, 1500);
          } else {
            wx.showToast({
              title: result.message || '还原失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 永久删除器材
  permanentlyDelete() {
    const { equipment } = this.data;
    
    wx.showModal({
      title: '永久删除',
      content: `确定要永久删除【${equipment.name}】吗？此操作不可恢复。`,
      confirmText: '永久删除',
      cancelText: '取消',
      confirmColor: '#f53f3f',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中...',
            mask: true
          });
          
          const app = getApp();
          const result = app.permanentlyDelete(equipment.id);
          
          wx.hideLoading();
          
          if (result.success) {
            wx.showToast({
              title: '已永久删除',
              icon: 'success'
            });
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/recycleBin/recycleBin'
              });
            }, 1500);
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

  // 返回上一页
  navigateBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack({
        delta: 1
      });
    } else {
      // 如果是第一个页面，返回回收站
      wx.switchTab({
        url: '/pages/recycleBin/recycleBin'
      });
    }
  }
})
