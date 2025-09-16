// pages/equipmentDetail/equipmentDetail.js
const app = getApp();
const { safeBack } = require('../../utils/navigation.js');

Page({
  data: {
    equipment: {},
    isLoading: false, // 修改默认值为false，避免初始界面变灰
    loadingText: '加载中...',
    showBorrowDialog: false,
    showReturnDialog: false,
    // 移除转移位置相关状态
    showDeleteDialog: false,
    fromRecycle: false,
    isOverdue: false,
    minDate: '',
    borrowInfo: {
      userName: '',
      userContact: '',
      borrowTime: '',
      expectedReturnTime: '',
      purpose: ''
    },
    returnInfo: {
      condition: '',
      conditionIndex: 0,
      remarks: '',
      returnTime: ''
    },
    returnConditionOptions: ['完好', '轻微损坏', '严重损坏', '无法使用'],
    // 移除位置相关选项
    deleteReason: '',
    showDefaultImage: true
  },

  onLoad(options) {
    // 设置最小日期为今天
    const today = this.formatDate(new Date());
    this.setData({
      minDate: today,
      borrowInfo: {
        ...this.data.borrowInfo,
        borrowTime: today,
        expectedReturnTime: today
      },
      returnInfo: {
        ...this.data.returnInfo,
        returnTime: today
      }
    });

    // 检查是否从回收站进入
    if (options.fromRecycle === 'true') {
      this.setData({ fromRecycle: true });
    }

    if (options.id) {
      this.loadEquipmentDetail(options.id);
    }
  },

  // 加载器材详情
  loadEquipmentDetail(id) {
    this.setData({ isLoading: true, loadingText: '加载中...' });

    try {
      let equipmentList = [];
      
      // 从全局数据或本地存储获取数据
      if (this.data.fromRecycle) {
        equipmentList = app.getRecycleBin() || [];
      } else {
        equipmentList = app.globalData.equipmentList || wx.getStorageSync('equipmentList') || [];
      }

      // 查找指定ID的器材
      const equipment = equipmentList.find(item => item.id === id);
      
      if (equipment) {
        // 检查是否超期
        const isOverdue = this.checkOverdue(equipment);
        
        this.setData({
          equipment,
          isOverdue,
          isLoading: false // 确保加载完成后设为false
        });
      } else {
        this.setData({
          isLoading: false,
          loadingText: '未找到器材信息'
        });
        wx.showToast({
          title: '未找到器材信息',
          icon: 'none',
          duration: 2000
        });
        setTimeout(() => safeBack(), 1500);
      }
    } catch (error) {
      console.error('加载器材详情失败:', error);
      this.setData({
        isLoading: false, // 错误时也需要设为false
        loadingText: '加载失败'
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 检查是否超期
  checkOverdue(equipment) {
    if (equipment.status !== '借出' || !equipment.borrowInfo || !equipment.borrowInfo.expectedReturnTime) {
      return false;
    }

    const today = new Date();
    const expectedReturn = new Date(equipment.borrowInfo.expectedReturnTime);
    
    // 忽略时间部分，只比较日期
    today.setHours(0, 0, 0, 0);
    expectedReturn.setHours(0, 0, 0, 0);
    
    return today > expectedReturn;
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 格式化时间显示
  formatTime(timeStr) {
    if (!timeStr) return '';
    
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) {
        return timeStr;
      }
      
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error('格式化时间失败:', error);
      return timeStr;
    }
  },

  // 获取状态对应的样式类
  getStatusClass(status) {
    switch (status) {
      case '在库':
        return 'status-available';
      case '借出':
        return 'status-borrowed';
      case '维修':
        return 'status-maintenance';
      case '报废':
        return 'status-scrapped';
      default:
        return '';
    }
  },

  // 图片预览功能
  previewImage() {
    const { equipment } = this.data;
    
    if (!equipment.imageUrl) {
      return;
    }
    
    wx.previewImage({
      current: equipment.imageUrl,
      urls: [equipment.imageUrl],
      fail: (err) => {
        console.error('图片预览失败:', err);
        wx.showToast({
          title: '预览图片失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  // 显示借用对话框
  showBorrowDialog() {
    // 只有在库状态才能借出
    if (this.data.equipment.status === '在库') {
      this.setData({ showBorrowDialog: true });
    } else {
      wx.showToast({
        title: '只有在库状态才能借出',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 显示归还对话框
  showReturnDialog() {
    // 只有借出状态才能归还
    if (this.data.equipment.status === '借出') {
      this.setData({ showReturnDialog: true });
    } else {
      wx.showToast({
        title: '只有借出状态才能归还',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 显示删除对话框
  showDeleteDialog() {
    this.setData({ showDeleteDialog: true });
  },

  // 关闭对话框
  closeDialog(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({
      [`show${type}Dialog`]: false
    });
  },

  // 处理借用信息输入
  handleBorrowInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`borrowInfo.${field}`]: e.detail.value
    });
  },

  // 处理归还信息输入
  handleReturnInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`returnInfo.${field}`]: e.detail.value
    });
  },

  // 处理删除原因输入
  handleDeleteInput(e) {
    this.setData({
      deleteReason: e.detail.value
    });
  },

  // 日期选择变化
  onDateChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`borrowInfo.${field}`]: e.detail.value
    });
  },

  // 归还状态变化
  onReturnConditionChange(e) {
    const index = e.detail.value;
    this.setData({
      'returnInfo.conditionIndex': index,
      'returnInfo.condition': this.data.returnConditionOptions[index]
    });
  },

  // 确认借出
  confirmBorrow() {
    const { userName, userContact, expectedReturnTime, purpose } = this.data.borrowInfo;
    
    // 验证必填项
    if (!userName.trim()) {
      return wx.showToast({ title: '请输入借用人员姓名', icon: 'none' });
    }
    if (!userContact.trim()) {
      return wx.showToast({ title: '请输入联系方式', icon: 'none' });
    }
    if (!expectedReturnTime) {
      return wx.showToast({ title: '请选择预计归还时间', icon: 'none' });
    }

    this.setData({ isLoading: true, loadingText: '处理中...' });

    try {
      let equipmentList = app.globalData.equipmentList || wx.getStorageSync('equipmentList') || [];
      const index = equipmentList.findIndex(item => item.id === this.data.equipment.id);
      
      if (index !== -1) {
        // 更新器材状态和借用信息
        const updatedEquipment = {
          ...equipmentList[index],
          status: '借出',
          borrowInfo: {
            ...this.data.borrowInfo,
            borrowTime: new Date().toISOString()
          },
          updateTime: new Date().toISOString()
        };
        
        equipmentList[index] = updatedEquipment;
        
        // 保存更新
        app.globalData.equipmentList = equipmentList;
        app.saveEquipmentList('equipmentList', equipmentList);
        
        // 记录操作日志
        this.addActivityLog(updatedEquipment, '借出');
        
        // 同步到云端
        if (app.syncManager) {
          app.syncManager.markDataChanged({
            id: updatedEquipment.id,
            type: 'update',
            data: updatedEquipment
          });
        }
        
        this.setData({
          equipment: updatedEquipment,
          showBorrowDialog: false,
          isLoading: false
        });
        
        wx.showToast({
          title: '借出成功',
          icon: 'success',
          duration: 1500
        });
      } else {
        throw new Error('未找到器材信息');
      }
    } catch (error) {
      console.error('确认借出失败:', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: '操作失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 确认归还
  confirmReturn() {
    this.setData({ isLoading: true, loadingText: '处理中...' });

    try {
      let equipmentList = app.globalData.equipmentList || wx.getStorageSync('equipmentList') || [];
      const index = equipmentList.findIndex(item => item.id === this.data.equipment.id);
      
      if (index !== -1) {
        // 更新器材状态和归还信息
        const updatedEquipment = {
          ...equipmentList[index],
          status: '在库',
          returnInfo: {
            ...this.data.returnInfo,
            returnTime: new Date().toISOString()
          },
          updateTime: new Date().toISOString()
        };
        
        equipmentList[index] = updatedEquipment;
        
        // 保存更新
        app.globalData.equipmentList = equipmentList;
        app.saveEquipmentList('equipmentList', equipmentList);
        
        // 记录操作日志
        this.addActivityLog(updatedEquipment, '归还');
        
        // 同步到云端
        if (app.syncManager) {
          app.syncManager.markDataChanged({
            id: updatedEquipment.id,
            type: 'update',
            data: updatedEquipment
          });
        }
        
        this.setData({
          equipment: updatedEquipment,
          showReturnDialog: false,
          isLoading: false,
          isOverdue: false
        });
        
        wx.showToast({
          title: '归还成功',
          icon: 'success',
          duration: 1500
        });
      } else {
        throw new Error('未找到器材信息');
      }
    } catch (error) {
      console.error('确认归还失败:', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: '操作失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 确认删除
  confirmDelete() {
    if (!this.data.deleteReason.trim()) {
      return wx.showToast({ title: '请输入删除原因', icon: 'none' });
    }

    this.setData({ isLoading: true, loadingText: '处理中...' });

    try {
      // 从设备列表中移除
      let equipmentList = app.globalData.equipmentList || wx.getStorageSync('equipmentList') || [];
      const index = equipmentList.findIndex(item => item.id === this.data.equipment.id);
      
      if (index !== -1) {
        const deletedEquipment = {
          ...equipmentList[index],
          deleteTime: new Date().toISOString(),
          deleteReason: this.data.deleteReason,
          updateTime: new Date().toISOString()
        };
        
        // 从列表中删除并添加到回收站
        equipmentList.splice(index, 1);
        app.globalData.equipmentList = equipmentList;
        app.saveEquipmentList('equipmentList', equipmentList);
        
        // 添加到回收站
        let recycleBin = app.getRecycleBin() || [];
        recycleBin.push(deletedEquipment);
        app.setRecycleBin(recycleBin);
        app.saveEquipmentList('recycleBin', recycleBin);
        
        // 记录操作日志
        this.addActivityLog(deletedEquipment, '删除');
        
        // 同步到云端
        if (app.syncManager) {
          app.syncManager.markDataChanged({
            id: deletedEquipment.id,
            type: 'delete',
            data: deletedEquipment
          });
        }
        
        this.setData({ isLoading: false });
        
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 1500
        });
        
        setTimeout(() => {
          safeBack();
          // 通知上一页刷新数据
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage && typeof prevPage.refreshData === 'function') {
            prevPage.refreshData();
          }
        }, 1500);
      } else {
        throw new Error('未找到器材信息');
      }
    } catch (error) {
      console.error('确认删除失败:', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: '操作失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 恢复器材
  restoreEquipment() {
    this.setData({ isLoading: true, loadingText: '处理中...' });

    try {
      // 从回收站移除并恢复到设备列表
      let recycleBin = app.getRecycleBin() || [];
      const index = recycleBin.findIndex(item => item.id === this.data.equipment.id);
      
      if (index !== -1) {
        const restoredEquipment = {
          ...recycleBin[index],
          status: '在库',
          deleteTime: '',
          deleteReason: '',
          updateTime: new Date().toISOString()
        };
        
        // 从回收站删除
        recycleBin.splice(index, 1);
        app.setRecycleBin(recycleBin);
        app.saveEquipmentList('recycleBin', recycleBin);
        
        // 添加到设备列表
        let equipmentList = app.globalData.equipmentList || wx.getStorageSync('equipmentList') || [];
        equipmentList.unshift(restoredEquipment);
        app.globalData.equipmentList = equipmentList;
        app.saveEquipmentList('equipmentList', equipmentList);
        
        // 记录操作日志
        this.addActivityLog(restoredEquipment, '恢复');
        
        // 同步到云端
        if (app.syncManager) {
          app.syncManager.markDataChanged({
            id: restoredEquipment.id,
            type: 'update',
            data: restoredEquipment
          });
        }
        
        this.setData({ isLoading: false });
        
        wx.showToast({
          title: '恢复成功',
          icon: 'success',
          duration: 1500
        });
        
        setTimeout(() => {
          safeBack();
          // 通知上一页刷新数据
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage && typeof prevPage.refreshData === 'function') {
            prevPage.refreshData();
          }
        }, 1500);
      } else {
        throw new Error('未找到器材信息');
      }
    } catch (error) {
      console.error('恢复器材失败:', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: '操作失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 彻底删除
  permanentDelete() {
    wx.showModal({
      title: '警告',
      content: '确定要彻底删除该器材吗？此操作不可恢复！',
      confirmText: '彻底删除',
      cancelText: '取消',
      confirmColor: '#f5222d',
      success: (res) => {
        if (res.confirm) {
          this.executePermanentDelete();
        }
      }
    });
  },

  // 执行彻底删除
  executePermanentDelete() {
    this.setData({ isLoading: true, loadingText: '处理中...' });

    try {
      // 从回收站彻底删除
      let recycleBin = app.getRecycleBin() || [];
      const newRecycleBin = recycleBin.filter(item => item.id !== this.data.equipment.id);
      
      app.setRecycleBin(newRecycleBin);
      app.saveEquipmentList('recycleBin', newRecycleBin);
      
      // 记录操作日志
      this.addActivityLog(this.data.equipment, '彻底删除');
      
      // 同步到云端
      if (app.syncManager) {
        app.syncManager.markDataChanged({
          id: this.data.equipment.id,
          type: 'permanent_delete',
          data: { id: this.data.equipment.id }
        });
      }
      
      this.setData({ isLoading: false });
      
      wx.showToast({
        title: '彻底删除成功',
        icon: 'success',
        duration: 1500
      });
      
      setTimeout(() => {
        safeBack();
        // 通知上一页刷新数据
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage && typeof prevPage.refreshData === 'function') {
          prevPage.refreshData();
        }
      }, 1500);
    } catch (error) {
      console.error('彻底删除失败:', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: '操作失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 跳转到编辑页面
  goToEdit() {
    wx.navigateTo({
      url: `/pages/add/add?id=${this.data.equipment.id}`
    });
  },

  // 记录操作日志
  addActivityLog(equipment, action) {
    const log = {
      id: `log-${Date.now()}`,
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      action: action,
      time: new Date().toISOString(),
      user: app.globalData.userInfo && app.globalData.userInfo.username || '未知用户'
    };
    
    try {
      let logs = wx.getStorageSync('activityLogs') || [];
      logs.unshift(log);
      // 限制日志数量，只保留最近100条
      if (logs.length > 100) logs = logs.slice(0, 100);
      app.saveEquipmentList('activityLogs', logs);
    } catch (error) {
      console.error('记录日志失败:', error);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    if (this.data.equipment.id) {
      this.loadEquipmentDetail(this.data.equipment.id);
    }
    wx.stopPullDownRefresh();
  }
});
