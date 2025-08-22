// pages/equipmentDetail/equipmentDetail.js
let navigateUtils;
try {
  navigateUtils = require('../../utils/navigate.js');
} catch (e) {
  try {
    navigateUtils = require('/utils/navigate.js');
  } catch (e2) {
    navigateUtils = {
      safeNavigate: function(url) {
        const TabBarPages = ['/pages/index/index', '/pages/manage/manage', '/pages/mine/mine'];
        const isTabBar = TabBarPages.some(tabPath => url.startsWith(tabPath));
        
        if (isTabBar) {
          wx.switchTab({ url });
        } else {
          wx.navigateTo({ url });
        }
      },
      safeBack: function(defaultTab = '/pages/index/index') {
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack({ delta: 1 });
        } else {
          wx.switchTab({ url: defaultTab });
        }
      }
    };
    console.warn('导航工具模块未找到，使用降级版本');
  }
}

const { safeNavigate, safeBack } = navigateUtils;

Page({
  data: {
    equipment: null,
    isLoading: true,
    showBorrowDialog: false,
    borrowInfo: {
      borrower: '',
      contact: '',
      returnTime: ''
    },
    today: '',
    fromRecycle: false
  },

  onLoad(options) {
    if (!options) options = {};
    
    const today = new Date().toISOString().split('T')[0];
    this.setData({ 
      today,
      fromRecycle: options.fromRecycle === 'true'
    });
    
    if (options.id) {
      this.loadEquipmentDetail(options.id, this.data.fromRecycle);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => safeBack(), 1500);
    }
  },

  onShow() {
    if (this.data.equipment?.id) {
      this.loadEquipmentDetail(this.data.equipment.id, this.data.fromRecycle);
    }
  },

  // 加载器材详情
  loadEquipmentDetail(id, fromRecycle = false) {
    let equipment = null;
    
    if (fromRecycle) {
      const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
      equipment = deletedList.find(item => item.id === id);
    } else {
      const app = getApp();
      const equipmentList = app.getEquipmentList() || [];
      equipment = equipmentList.find(item => item.id === id);
      
      if (!equipment) {
        const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
        equipment = deletedList.find(item => item.id === id);
        if (equipment) {
          this.setData({ fromRecycle: true });
        }
      }
    }
    
    if (equipment) {
      // 修复iOS日期格式兼容性问题
      const formatDate = (dateString) => {
        if (!dateString) return '无记录';
        
        // 替换所有的 "-" 为 "/"，解决iOS兼容性问题
        const iosCompatibleDateString = dateString.replace(/-/g, '/');
        const date = new Date(iosCompatibleDateString);
        
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
          return '无效日期';
        }
        
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${
          date.getHours().toString().padStart(2, '0')}:${
          date.getMinutes().toString().padStart(2, '0')
        }`;
      };
      
      const formattedEquipment = {
        ...equipment,
        createTimeFormatted: formatDate(equipment.createTime),
        updateTimeFormatted: formatDate(equipment.updateTime),
        borrowTimeFormatted: formatDate(equipment.borrowTime),
        returnTimeFormatted: formatDate(equipment.returnTime),
        returnActualTimeFormatted: formatDate(equipment.returnActualTime),
        deleteTimeFormatted: formatDate(equipment.deleteTime)
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

  // 其他方法保持不变...
  restoreEquipment() {
    const { equipment } = this.data;
    
    wx.showModal({
      title: '确认还原',
      content: `确定要还原【${equipment.name}】吗？`,
      confirmText: '还原',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...', mask: true });
          
          const app = getApp();
          const result = app.restoreEquipment(equipment.id);
          
          wx.hideLoading();
          
          if (result.success) {
            wx.showToast({ title: '还原成功', icon: 'success' });
            setTimeout(() => {
              safeNavigate('/pages/manage/manage');
            }, 1500);
          } else {
            wx.showToast({ title: result.message || '还原失败', icon: 'none' });
          }
        }
      }
    });
  },

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
          wx.showLoading({ title: '处理中...', mask: true });
          
          const app = getApp();
          const result = app.permanentlyDelete(equipment.id);
          
          wx.hideLoading();
          
          if (result.success) {
            wx.showToast({ title: '已永久删除', icon: 'success' });
            setTimeout(() => {
              safeNavigate('/pages/recycleBin/recycleBin');
            }, 1500);
          } else {
            wx.showToast({ title: result.message || '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  openBorrowDialog() {
    const app = getApp();
    const userInfo = app.globalData.userInfo || {};
    
    this.setData({
      showBorrowDialog: true,
      borrowInfo: {
        borrower: userInfo.username || '',
        contact: userInfo.phone || '',
        returnTime: this.data.today
      }
    });
  },

  closeBorrowDialog() {
    this.setData({ showBorrowDialog: false });
  },

  inputBorrowInfo(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`borrowInfo.${field}`]: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ 'borrowInfo.returnTime': e.detail.value });
  },

  handleBorrow() {
    const { equipment, borrowInfo } = this.data;
    
    if (!borrowInfo.borrower.trim()) {
      wx.showToast({ title: '请输入借用人', icon: 'none' });
      return;
    }
    
    if (!borrowInfo.contact.trim()) {
      wx.showToast({ title: '请输入联系方式', icon: 'none' });
      return;
    }
    
    if (!borrowInfo.returnTime) {
      wx.showToast({ title: '请选择预计归还时间', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '处理中...', mask: true });
    
    const app = getApp();
    const result = app.updateEquipmentStatus(equipment.id, '借出', borrowInfo);
    
    wx.hideLoading();
    
    if (result.success) {
      this.closeBorrowDialog();
      wx.showToast({ title: '借出成功', icon: 'success' });
      this.loadEquipmentDetail(equipment.id);
    } else {
      wx.showToast({ title: result.message || '操作失败', icon: 'none' });
    }
  },

  handleReturn() {
    const { equipment } = this.data;
    
    wx.showModal({
      title: '确认归还',
      content: `确定要将【${equipment.name}】标记为已归还吗？`,
      confirmText: '确认',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...', mask: true });
          
          const app = getApp();
          const result = app.updateEquipmentStatus(equipment.id, '在库');
          
          wx.hideLoading();
          
          if (result.success) {
            wx.showToast({ title: '归还成功', icon: 'success' });
            this.loadEquipmentDetail(equipment.id);
          } else {
            wx.showToast({ title: result.message || '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  goToEdit() {
    const { equipment } = this.data;
    safeNavigate(`/pages/add/add?id=${equipment.id}`);
  },

  deleteToRecycle() {
    const { equipment, fromRecycle } = this.data;
    
    const title = fromRecycle ? '永久删除' : '确认删除';
    const content = fromRecycle 
      ? `确定要永久删除【${equipment.name}】吗？此操作不可恢复。`
      : `确定要删除【${equipment.name}】吗？删除后可在回收站恢复。`;
    const confirmText = fromRecycle ? '永久删除' : '删除';
    
    wx.showModal({
      title,
      content,
      confirmText,
      cancelText: '取消',
      confirmColor: '#f53f3f',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...', mask: true });
          
          const app = getApp();
          const result = fromRecycle 
            ? app.permanentlyDelete(equipment.id)
            : app.deleteEquipment(equipment.id);
          
          wx.hideLoading();
          
          if (result.success) {
            wx.showToast({
              title: fromRecycle ? '已永久删除' : '已删除',
              icon: 'success'
            });
            setTimeout(() => {
              if (fromRecycle) {
                safeNavigate('/pages/recycleBin/recycleBin');
              } else {
                safeNavigate('/pages/manage/manage');
              }
            }, 1500);
          } else {
            wx.showToast({ title: result.message || '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  navigateBack() {
    if (this.data.fromRecycle) {
      safeNavigate('/pages/recycleBin/recycleBin');
    } else {
      safeBack();
    }
  }
});
