// pages/index/index.js
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
    totalEquipments: 0,
    availableEquipments: 0,
    borrowedEquipments: 0,
    recentActivities: [],
    isMenuOpen: false,
    isAnimating: false,
    welcomeText: '',
    welcomeSubtext: ''
  },

  onLoad() {
    this.setWelcomeText();
    this.loadEquipmentStats();
    this.loadRecentActivities();
  },

  onShow() {
    this.loadEquipmentStats();
    this.loadRecentActivities();
  },

  // 设置欢迎信息
  setWelcomeText() {
    const app = getApp();
    const userInfo = app.globalData.userInfo || {};
    const userName = userInfo.username || '管理员';
    const date = new Date();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    // 修复日期格式，确保兼容性
    const today = `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日`;
    
    this.setData({
      welcomeText: `欢迎回来，${userName}`,
      welcomeSubtext: `${today} ${weekDay}`
    });
  },

  // 加载器材统计数据
  loadEquipmentStats() {
    const app = getApp();
    const equipmentList = app.getEquipmentList() || [];
    
    const total = equipmentList.length;
    const available = equipmentList.filter(item => item.status === '在库').length;
    const borrowed = equipmentList.filter(item => item.status === '借出').length;
    
    this.setData({
      totalEquipments: total,
      availableEquipments: available,
      borrowedEquipments: borrowed
    });
  },

  // 加载最近活动记录
  loadRecentActivities() {
    const app = getApp();
    let activities = app.getActivityLog() || [];
    
    if (!Array.isArray(activities)) {
      activities = [];
    }
    
    const formattedActivities = activities
      .filter(activity => activity && activity.content && activity.createTime && activity.equipmentId)
      .map(activity => {
        try {
          // 修复iOS日期格式兼容性问题
          const iosCompatibleDate = activity.createTime.replace(/-/g, '/');
          const date = new Date(iosCompatibleDate);
          return {
            ...activity,
            id: activity.id || Date.now().toString() + Math.random().toString(36).substr(2, 5),
            formattedTime: `${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
          };
        } catch (e) {
          return {
            ...activity,
            formattedTime: '时间格式错误'
          };
        }
      })
      .sort((a, b) => {
        // 修复排序时的日期兼容性问题
        const dateA = new Date(a.createTime.replace(/-/g, '/'));
        const dateB = new Date(b.createTime.replace(/-/g, '/'));
        return dateB - dateA;
      })
      .slice(0, 5);
    
    this.setData({
      recentActivities: formattedActivities
    });
    
    // 添加测试记录如果没有活动
    if (formattedActivities.length === 0) {
      const testActivity = {
        id: 'test' + Date.now(),
        type: '系统',
        content: '系统初始化完成',
        createTime: new Date().toISOString(),
        equipmentId: '',
        formattedTime: this.formatDate(new Date().toISOString())
      };
      this.setData({
        recentActivities: [testActivity]
      });
    }
  },

  // 格式化日期（修复iOS兼容性）
  formatDate(dateString) {
    // 替换所有的 "-" 为 "/"，解决iOS兼容性问题
    const iosCompatibleDate = dateString.replace(/-/g, '/');
    const date = new Date(iosCompatibleDate);
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '无效日期';
    }
    
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  // 活动记录点击跳转详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({
        title: '无法获取器材信息',
        icon: 'none'
      });
      return;
    }
    
    // 检查器材是否存在于正常列表
    const app = getApp();
    const equipmentList = app.getEquipmentList();
    const equipmentExists = equipmentList.some(item => item.id === id);
    
    if (equipmentExists) {
      // 使用安全导航跳转到正常详情页
      safeNavigate(`/pages/equipmentDetail/equipmentDetail?id=${id}`);
    } else {
      // 检查是否在回收站
      const deletedList = wx.getStorageSync('deletedEquipmentList') || [];
      const isInRecycle = deletedList.some(item => item.id === id);
      
      if (isInRecycle) {
        // 使用安全导航跳转到回收站状态的详情页
        safeNavigate(`/pages/equipmentDetail/equipmentDetail?id=${id}&fromRecycle=true`);
      } else {
        wx.showToast({
          title: '该器材不存在或已被彻底删除',
          icon: 'none'
        });
      }
    }
  },

  // 跳转到器材列表页并应用筛选
  goToManage(e) {
    const status = e.currentTarget.dataset.status || 'all';
    const app = getApp();
    // 使用全局变量传递筛选状态
    app.globalData.filterStatus = status;
    // 跳转到TabBar页面
    safeNavigate('/pages/manage/manage');
  },

  // 切换底部菜单
  toggleMenu() {
    if (this.data.isAnimating) return;
    
    const isOpen = this.data.isMenuOpen;
    this.setData({
      isAnimating: true
    });
    
    setTimeout(() => {
      this.setData({
        isMenuOpen: !isOpen,
        isAnimating: false
      });
    }, 300);
  },

  // 跳转到添加页面
  goToAddPage() {
    this.setData({
      isMenuOpen: false
    });
    safeNavigate('/pages/add/add');
  },

  // 跳转到批量添加页面
  goToBatchAdd() {
    this.setData({
      isMenuOpen: false
    });
    safeNavigate('/pages/batchAdd/batchAdd');
  },

  // 扫码功能
  scanCode() {
    this.setData({
      isMenuOpen: false
    });
    wx.scanCode({
      success: (res) => {
        safeNavigate(`/pages/add/add?scanCode=${encodeURIComponent(res.result)}`);
      }
    });
  },

  // 跳转到借还记录页面
  goToBorrowRecord() {
    safeNavigate('/pages/borrowRecord/borrowRecord');
  },

  // 跳转到回收站
  goToRecycleBin() {
    safeNavigate('/pages/recycleBin/recycleBin');
  },

  // 跳转到我的页面
  goToMine() {
    safeNavigate('/pages/mine/mine');
  }
})
