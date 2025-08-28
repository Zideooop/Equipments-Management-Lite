const app = getApp();
// 修复：正确引入导航工具（路径根据实际项目结构调整）
const { safeNavigate, safeBack } = require('../../utils/navigation.js');
// 增强日期格式化函数（全局可用）
const formatDate = (dateString) => {
  if (!dateString) return '无记录';
  
  // 处理多种日期格式（兼容ISO和其他格式）
  let date;
  if (typeof dateString === 'string') {
    // 替换分隔符，兼容iOS
    dateString = dateString.replace(/-/g, '/').replace('T', ' ').split('.')[0];
    date = new Date(dateString);
  } else if (dateString instanceof Date) {
    date = dateString;
  }
  
  // 验证日期有效性
  if (!date || isNaN(date.getTime())) {
    return '无记录';
  }
  
  return `${date.getFullYear()}年${
    (date.getMonth() + 1).toString().padStart(2, '0')
  }月${
    date.getDate().toString().padStart(2, '0')
  }日 ${
    date.getHours().toString().padStart(2, '0')
  }:${
    date.getMinutes().toString().padStart(2, '0')
  }`;
};

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
    
    // 设置今天日期为默认归还日期
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

    // 配置导航栏编辑按钮（仅保留此处，避免重复）
    wx.setNavigationBarTitle({ title: '器材详情' });
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#ffffff'
    });
   
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
      const equipmentList = app.getEquipmentList ? app.getEquipmentList() : [];
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
      // 格式化所有日期字段
      const formattedEquipment = {
        ...equipment,
        createTimeFormatted: formatDate(equipment.createTime || equipment.addTime),
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

    const isOverdue = equipment.status === '借出' 
    && new Date(equipment.returnTime) < new Date();
  this.setData({ equipment, isOverdue });

  },

  // 从回收站恢复器材
  restoreEquipment() {
    const { equipment } = this.data;
    
    wx.showModal({
      title: '确认还原',
      content: `确定要还原【${equipment.name}】吗？`,
      confirmText: '还原',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...', mask: true });
          
          try {
            const app = getApp();
            // 确保app方法返回Promise
            const result = await app.restoreEquipment(equipment.id);
            
            wx.hideLoading();
            
            if (result.success) {
              wx.showToast({ title: '还原成功', icon: 'success' });
              // 通知首页刷新
              this.notifyHomePageRefresh();
              setTimeout(() => {
                safeNavigate({ url: '/pages/manage/manage'});
              }, 1500);
            } else {
              wx.showToast({ title: result.message || '还原失败', icon: 'none' });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('还原失败:', error);
            wx.showToast({ title: '还原失败，请重试', icon: 'none' });
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
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...', mask: true });
          
          try {
            const app = getApp();
            const result = await app.permanentlyDelete(equipment.id);
            
            wx.hideLoading();
            
            if (result.success) {
              wx.showToast({ title: '已永久删除', icon: 'success' });
              // 通知首页刷新
              this.notifyHomePageRefresh();
              setTimeout(() => {
                safeNavigate('/pages/recycleBin/recycleBin');
              }, 1500);
            } else {
              wx.showToast({ title: result.message || '删除失败', icon: 'none' });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('永久删除失败:', error);
            wx.showToast({ title: '删除失败，请重试', icon: 'none' });
          }
        }
      }
    });
  },

  // 打开借出对话框
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

  // 关闭借出对话框
  closeBorrowDialog() {
    this.setData({ showBorrowDialog: false });
  },

  // 输入借出信息
  inputBorrowInfo(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`borrowInfo.${field}`]: e.detail.value });
  },

  // 日期选择变化
  onDateChange(e) {
    this.setData({ 'borrowInfo.returnTime': e.detail.value });
  },

  // 处理借出操作
  handleBorrow() {
    const { equipment, borrowInfo } = this.data;
    
    // 表单验证
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
    
    try {
      const app = getApp();
      const result = app.updateEquipmentStatus(equipment.id, '借出', borrowInfo);
      
      wx.hideLoading();
      
      if (result.success) {
        this.closeBorrowDialog();
        wx.showToast({ title: '借出成功', icon: 'success' });
        this.loadEquipmentDetail(equipment.id);
        // 通知首页刷新
        this.notifyHomePageRefresh();
      } else {
        wx.showToast({ title: result.message || '操作失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('借出操作失败:', error);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },

  // 处理归还操作
  handleReturn() {
    const { equipment } = this.data;
    
    wx.showModal({
      title: '确认归还',
      content: `确定要将【${equipment.name}】标记为已归还吗？`,
      confirmText: '确认',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...', mask: true });
          
          try {
            const app = getApp();
            const result = await app.updateEquipmentStatus(equipment.id, '在库');
            
            wx.hideLoading();
            
            if (result.success) {
              wx.showToast({ title: '归还成功', icon: 'success' });
              this.loadEquipmentDetail(equipment.id);
              // 通知首页刷新
              this.notifyHomePageRefresh();
            } else {
              wx.showToast({ title: result.message || '操作失败', icon: 'none' });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('归还操作失败:', error);
            wx.showToast({ title: '操作失败，请重试', icon: 'none' });
          }
        }
      }
    });
  },

  // 跳转到编辑页面
  goToEdit() {
    const { equipment } = this.data;
    safeNavigate(`/pages/add/add?id=${equipment.id}`);
  },

  // 删除到回收站/永久删除（统一处理方法）
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
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...', mask: true });
          
          try {
            const app = getApp();
            // 根据来源调用不同方法
            const result = fromRecycle 
              ? await app.permanentlyDelete(equipment.id)
              : await app.deleteEquipmentToRecycle(equipment.id);
            
            wx.hideLoading();
            
            if (result.success) {
              wx.showToast({
                title: fromRecycle ? '已永久删除' : '已删除',
                icon: 'success'
              });
              // 通知首页刷新
              this.notifyHomePageRefresh();
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
          } catch (error) {
            wx.hideLoading();
            console.error('删除失败:', error);
            wx.showToast({ title: '删除失败，请重试', icon: 'none' });
          }
        }
      }
    });
  },

  // 导航返回
  navigateBack() {
    if (this.data.fromRecycle) {
      safeNavigate('/pages/recycleBin/recycleBin');
    } else {
      safeBack();
    }
  },

  // 通知首页刷新数据（解决最近活动不更新问题）
  notifyHomePageRefresh() {
    const pages = getCurrentPages();
    const homePage = pages.find(page => page.route === 'pages/index/index');
    if (homePage) {
      homePage.loadRecentActivities();
      homePage.loadEquipmentStats();
    }
  }
});