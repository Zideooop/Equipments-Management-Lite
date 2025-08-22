// pages/recycleBin/recycleBin.js
// 导航工具模块 - 统一管理页面跳转
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
    deletedEquipments: [],
    searchKeyword: '',
    filteredEquipments: [],
    isLoading: true // 添加加载状态
  },

  onLoad() {
    this.loadDeletedEquipments();
  },

  onShow() {
    this.loadDeletedEquipments();
  },

  // 加载回收站数据 - 修复加载问题
  loadDeletedEquipments() {
    this.setData({ isLoading: true });
    
    try {
      // 尝试从本地存储加载数据
      const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
      
      // 格式化日期并排序
      const formatDate = (dateString) => {
        if (!dateString) return '无记录';
        // 修复iOS日期兼容性
        const iosCompatibleDate = dateString.replace(/-/g, '/');
        const date = new Date(iosCompatibleDate);
        
        if (isNaN(date.getTime())) {
          return '无效日期';
        }
        
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
      };
      
      const formattedList = deletedList
        .map(item => ({
          ...item,
          deleteTimeFormatted: formatDate(item.deleteTime)
        }))
        .sort((a, b) => {
          // 按删除时间降序排列
          const dateA = new Date(a.deleteTime.replace(/-/g, '/'));
          const dateB = new Date(b.deleteTime.replace(/-/g, '/'));
          return dateB - dateA;
        });
      
      this.setData({
        deletedEquipments: formattedList,
        filteredEquipments: formattedList,
        isLoading: false
      });
    } catch (error) {
      console.error('加载回收站数据失败:', error);
      this.setData({
        deletedEquipments: [],
        filteredEquipments: [],
        isLoading: false
      });
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 搜索功能
  onSearchInput(e) {
    const keyword = e.detail.value.trim().toLowerCase();
    const { deletedEquipments } = this.data;
    
    const filtered = deletedEquipments.filter(item => 
      item.name.toLowerCase().includes(keyword) ||
      item.type.toLowerCase().includes(keyword) ||
      item.id.toLowerCase().includes(keyword) ||
      item.specification.toLowerCase().includes(keyword)
    );
    
    this.setData({
      searchKeyword: keyword,
      filteredEquipments: filtered
    });
  },

  // 查看器材详情
  goToEquipmentDetail(e) {
    const id = e.currentTarget.dataset.id;
    safeNavigate(`/pages/equipmentDetail/equipmentDetail?id=${id}&fromRecycle=true`);
  },

  // 恢复器材
  restoreEquipment(e) {
    const id = e.currentTarget.dataset.id;
    const equipment = this.data.deletedEquipments.find(item => item.id === id);
    
    if (!equipment) {
      wx.showToast({ title: '未找到该器材', icon: 'none' });
      return;
    }
    
    wx.showModal({
      title: '确认还原',
      content: `确定要还原【${equipment.name}】吗？`,
      confirmText: '还原',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...', mask: true });
          
          try {
            const app = getApp();
            const result = app.restoreEquipment(equipment.id);
            
            wx.hideLoading();
            
            if (result.success) {
              wx.showToast({ title: '还原成功', icon: 'success' });
              this.loadDeletedEquipments(); // 重新加载数据
            } else {
              wx.showToast({ title: result.message || '还原失败', icon: 'none' });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('还原器材失败:', error);
            wx.showToast({ title: '还原失败，请重试', icon: 'none' });
          }
        }
      }
    });
  },

  // 永久删除
  permanentlyDelete(e) {
    const id = e.currentTarget.dataset.id;
    const equipment = this.data.deletedEquipments.find(item => item.id === id);
    
    if (!equipment) {
      wx.showToast({ title: '未找到该器材', icon: 'none' });
      return;
    }
    
    wx.showModal({
      title: '永久删除',
      content: `确定要永久删除【${equipment.name}】吗？此操作不可恢复。`,
      confirmText: '永久删除',
      cancelText: '取消',
      confirmColor: '#f53f3f',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...', mask: true });
          
          try {
            const app = getApp();
            const result = app.permanentlyDelete(equipment.id);
            
            wx.hideLoading();
            
            if (result.success) {
              wx.showToast({ title: '已永久删除', icon: 'success' });
              this.loadDeletedEquipments(); // 重新加载数据
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

  // 清空回收站
  clearRecycleBin() {
    const { deletedEquipments } = this.data;
    
    if (deletedEquipments.length === 0) {
      wx.showToast({ title: '回收站已为空', icon: 'none' });
      return;
    }
    
    wx.showModal({
      title: '确认清空',
      content: '确定要永久删除所有回收站中的器材吗？此操作不可恢复。',
      confirmText: '清空',
      cancelText: '取消',
      confirmColor: '#f53f3f',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...', mask: true });
          
          try {
            const app = getApp();
            // 记录所有删除操作
            deletedEquipments.forEach(item => {
              app.addActivityLog({
                type: '删除',
                content: `永久删除了器材【${item.name}】`,
                equipmentId: item.id
              });
            });
            
            // 清空本地存储
            wx.setStorageSync('deletedEquipmentList', []);
            this.loadDeletedEquipments();
            
            wx.hideLoading();
            wx.showToast({ title: '已清空回收站', icon: 'success' });
          } catch (error) {
            wx.hideLoading();
            console.error('清空回收站失败:', error);
            wx.showToast({ title: '操作失败，请重试', icon: 'none' });
          }
        }
      }
    });
  },

  // 返回首页
  goToHome() {
    safeNavigate('/pages/index/index');
  },

  // 返回上一页
  navigateBack() {
    safeBack();
  }
})
