// pages/add/add.js
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
    equipment: {
      id: '',
      code: '', // 器材编码
      name: '',
      type: '',
      specification: '',
      quantity: 1,
      location: '',
      status: '在库',
      purchaseDate: '',
      remarks: ''
    },
    isEditing: false,
    dateVisible: false,
    currentDate: new Date().getTime(),
    minDate: new Date(2000, 0, 1).getTime(),
    maxDate: new Date().getTime(),
    statusOptions: ['在库', '借出', '维修中', '报废']
  },

  onLoad(options) {
    // 检查是否有扫码结果传递过来
    if (options && (options.scanCode || options.code)) {
      const code = options.scanCode || options.code;
      this.setData({
        'equipment.code': decodeURIComponent(code)
      });
    }
    
    // 检查是否是编辑模式
    if (options && options.id) {
      this.loadEquipmentData(options.id);
      this.setData({ isEditing: true });
    } else {
      // 生成唯一ID
      this.setData({
        'equipment.id': 'eq_' + Date.now() + Math.floor(Math.random() * 1000)
      });
    }

    // 检查是否为游客
    const app = getApp();
    if (app.globalData.userInfo && app.globalData.userInfo.isGuest) {
      wx.showToast({
        title: '游客不能添加/编辑器材',
        icon: 'none'
      });
      setTimeout(() => {
        safeBack();
      }, 1500);
    }
  },

  // 加载器材数据（编辑模式）
  loadEquipmentData(id) {
    const app = getApp();
    const equipmentList = app.getEquipmentList() || [];
    const equipment = equipmentList.find(item => item.id === id);
    
    if (equipment) {
      // 处理日期格式
      if (equipment.purchaseDate) {
        const date = new Date(equipment.purchaseDate.replace(/-/g, '/'));
        equipment.purchaseDate = this.formatDateForDisplay(date);
        this.setData({ currentDate: date.getTime() });
      }
      
      this.setData({ equipment });
    } else {
      wx.showToast({
        title: '未找到器材信息',
        icon: 'none'
      });
      setTimeout(() => {
        safeBack();
      }, 1000);
    }
  },

  // 修复：添加输入框处理函数（解决handleInput警告）
  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`equipment.${field}`]: value
    });
  },

  // 数量调整
  adjustQuantity(e) {
    const { type } = e.currentTarget.dataset;
    let { quantity } = this.data.equipment;
    
    quantity = parseInt(quantity) || 1;
    
    if (type === 'increase') {
      quantity++;
    } else if (type === 'decrease' && quantity > 1) {
      quantity--;
    }
    
    this.setData({
      'equipment.quantity': quantity
    });
  },

  // 日期选择
  onDisplay() {
    this.setData({ dateVisible: true });
  },

  onClose() {
    this.setData({ dateVisible: false });
  },

  onConfirm(e) {
    const date = new Date(e.detail);
    this.setData({
      dateVisible: false,
      currentDate: e.detail,
      'equipment.purchaseDate': this.formatDateForDisplay(date)
    });
  },

  // 格式化日期用于显示
  formatDateForDisplay(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  },

  // 修复：添加状态变更处理函数（解决handleStatusChange警告）
  handleStatusChange(e) {
    this.setData({
      'equipment.status': e.detail.value
    });
  },

  // 保存器材信息 - 修复保存逻辑
  saveEquipment() {
    const { equipment, isEditing } = this.data;
    
    // 验证必填项
    if (!equipment.name.trim()) {
      wx.showToast({ title: '请输入器材名称', icon: 'none' });
      return;
    }
    
    if (!equipment.code.trim()) {
      wx.showToast({ title: '请输入器材编码', icon: 'none' });
      return;
    }
    
    if (!equipment.type.trim()) {
      wx.showToast({ title: '请输入器材类型', icon: 'none' });
      return;
    }
    
    try {
      const app = getApp();
      
      // 确保应用实例存在
      if (!app) {
        throw new Error('获取应用实例失败');
      }
      
      // 确保存储方法存在
      if (isEditing && typeof app.updateEquipment !== 'function') {
        throw new Error('应用实例中缺少updateEquipment方法');
      }
      
      if (!isEditing && typeof app.addEquipment !== 'function') {
        throw new Error('应用实例中缺少addEquipment方法');
      }
      
      if (isEditing) {
        // 更新现有器材
        const result = app.updateEquipment(equipment);
        if (result.success) {
          wx.showToast({ title: '更新成功', icon: 'success' });
          
          // 记录活动日志
          app.addActivityLog({
            type: '更新',
            content: `更新了器材【${equipment.name}】`,
            equipmentId: equipment.id
          });
          
          setTimeout(() => {
            safeBack();
          }, 1000);
        } else {
          wx.showToast({ title: result.message || '更新失败', icon: 'none' });
        }
      } else {
        // 添加新器材
        const newEquipment = {
          ...equipment,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString()
        };
        
        const result = app.addEquipment(newEquipment);
        if (result.success) {
          wx.showToast({ title: '添加成功', icon: 'success' });
          
          // 记录活动日志
          app.addActivityLog({
            type: '添加',
            content: `添加了新器材【${equipment.name}】`,
            equipmentId: equipment.id
          });
          
          setTimeout(() => {
            safeBack();
          }, 1000);
        } else {
          wx.showToast({ title: result.message || '添加失败', icon: 'none' });
        }
      }
    } catch (error) {
      console.error('保存器材失败:', error);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },

  // 取消操作
  cancel() {
    safeBack();
  },

  // 扫码填充编码
  scanToFillCode() {
    wx.scanCode({
      success: (res) => {
        if (res.result) {
          this.setData({
            'equipment.code': res.result
          });
        }
      }
    });
  }
})
