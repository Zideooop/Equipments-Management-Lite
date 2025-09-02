// pages/add/add.js
const app = getApp();
const { safeNavigate, safeBack } = require('../../utils/navigation.js');

Page({
  data: {
    // 器材信息
    equipment: {
      id: '',
      code: '',         // 器材编号
      name: '',         // 器材名称
      type: '',         // 器材类型
      specification: '',// 规格型号
      location: '',     // 存放位置
      quantity: 1,      // 数量
      status: '',       // 状态
      remarks: ''       // 备注
    },
    
    // 选择器选项 - 包含预设选项和用户自定义选项
    typeOptions: ['电子设备', '工具', '仪器', '耗材', '其他', '自定义...'],
    specificationOptions: ['标准型', '增强型', '迷你型', '大型', '小型', '自定义...'],
    locationOptions: ['仓库A区', '仓库B区', '实验室1', '实验室2', '办公室', '自定义...'],
    statusOptions: ['在库', '借出', '维修中', '报废', '自定义...'],
    
    // 选择器状态
    showTypePicker: false,
    showSpecificationPicker: false,
    showLocationPicker: false,
    showStatusPicker: false,
    
    // 选择器索引
    typeIndex: [0],
    specificationIndex: [0],
    locationIndex: [0],
    statusIndex: [0],
    
    // 自定义选项
    showCustomType: false,
    showCustomSpecification: false,
    showCustomLocation: false,
    showCustomStatus: false,
    customType: '',
    customSpecification: '',
    customLocation: '',
    customStatus: ''
  },

  onLoad(options) {
    // 加载用户自定义选项
    this.loadCustomOptions();
    
    // 如果是编辑模式，加载器材数据
    if (options.id) {
      this.loadEquipmentData(options.id);
    }
    
    // 处理扫码带入的数据
    if (options.scanCode) {
      this.setData({
        'equipment.code': decodeURIComponent(options.scanCode)
      });
    }
  },

  // 加载用户自定义选项
  loadCustomOptions() {
    try {
      const customOptions = wx.getStorageSync('customEquipmentOptions') || {};
      
      // 合并预设选项和自定义选项
      if (customOptions.types && customOptions.types.length) {
        // 在"自定义..."前插入用户自定义选项
        const baseOptions = this.data.typeOptions.slice(0, -1);
        const customTypes = [...new Set(customOptions.types)]; // 去重
        this.setData({
          typeOptions: [...baseOptions, ...customTypes, '自定义...']
        });
      }
      
      if (customOptions.specifications && customOptions.specifications.length) {
        const baseOptions = this.data.specificationOptions.slice(0, -1);
        const customSpecs = [...new Set(customOptions.specifications)];
        this.setData({
          specificationOptions: [...baseOptions, ...customSpecs, '自定义...']
        });
      }
      
      if (customOptions.locations && customOptions.locations.length) {
        const baseOptions = this.data.locationOptions.slice(0, -1);
        const customLocs = [...new Set(customOptions.locations)];
        this.setData({
          locationOptions: [...baseOptions, ...customLocs, '自定义...']
        });
      }
      
      if (customOptions.statuses && customOptions.statuses.length) {
        const baseOptions = this.data.statusOptions.slice(0, -1);
        const customStats = [...new Set(customOptions.statuses)];
        this.setData({
          statusOptions: [...baseOptions, ...customStats, '自定义...']
        });
      }
    } catch (error) {
      console.error('加载自定义选项失败:', error);
    }
  },

  // 保存自定义选项
  saveCustomOption(type, value) {
    if (!value || value.trim() === '') return;
    
    try {
      const customOptions = wx.getStorageSync('customEquipmentOptions') || {
        types: [],
        specifications: [],
        locations: [],
        statuses: []
      };
      
      // 根据类型保存到不同数组
      switch (type) {
        case 'type':
          if (!customOptions.types.includes(value)) {
            customOptions.types.push(value);
          }
          break;
        case 'specification':
          if (!customOptions.specifications.includes(value)) {
            customOptions.specifications.push(value);
          }
          break;
        case 'location':
          if (!customOptions.locations.includes(value)) {
            customOptions.locations.push(value);
          }
          break;
        case 'status':
          if (!customOptions.statuses.includes(value)) {
            customOptions.statuses.push(value);
          }
          break;
      }
      
      wx.setStorageSync('customEquipmentOptions', customOptions);
      
      // 更新选项列表
      this.loadCustomOptions();
    } catch (error) {
      console.error('保存自定义选项失败:', error);
    }
  },

  // 加载器材数据（编辑模式）
  loadEquipmentData(id) {
    if (!id) return;
    
    try {
      // 从全局数据或本地存储中获取器材信息
      let equipmentList = app.globalData.equipmentList || wx.getStorageSync('equipmentList') || [];
      const equipment = equipmentList.find(item => item.id === id);
      
      if (equipment) {
        // 设置表单数据
        this.setData({
          equipment: { ...equipment }
        });
        
        // 设置选择器索引
        this.setPickerIndex('type', equipment.type);
        this.setPickerIndex('specification', equipment.specification);
        this.setPickerIndex('location', equipment.location);
        this.setPickerIndex('status', equipment.status);
      } else {
        wx.showToast({ title: '未找到器材信息', icon: 'none' });
        setTimeout(() => safeBack(), 1500);
      }
    } catch (error) {
      console.error('加载器材数据失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 设置选择器索引
  setPickerIndex(type, value) {
    if (!value) return;
    
    const options = this.data[`${type}Options`];
    const index = options.findIndex(item => item === value);
    
    if (index !== -1) {
      this.setData({
        [`${type}Index`]: [index]
      });
    }
  },

  // 处理输入
  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`equipment.${field}`]: e.detail.value
    });
  },

  // 处理数量输入
  handleQuantityInput(e) {
    const value = e.detail.value.trim();
    
    if (value === '') {
      this.setData({ 'equipment.quantity': '' });
      return;
    }
    
    // 转换为数字并确保是正整数
    let num = parseInt(value, 10);
    if (isNaN(num) || num < 1) num = 1;
    
    this.setData({
      'equipment.quantity': num
    });
  },

  // 失去焦点时验证数量
  validateQuantity() {
    const { quantity } = this.data.equipment;
    if (!quantity || quantity < 1) {
      this.setData({ 'equipment.quantity': 1 });
    }
  },

  // 减少数量
  decreaseQuantity() {
    if (this.data.equipment.quantity > 1) {
      this.setData({
        'equipment.quantity': this.data.equipment.quantity - 1
      });
      // 添加震动反馈
      wx.vibrateShort();
    }
  },

  // 增加数量
  increaseQuantity() {
    const current = this.data.equipment.quantity || 0;
    this.setData({
      'equipment.quantity': current + 1
    });
    // 添加震动反馈
    wx.vibrateShort();
  },

  // 聚焦输入框 - 修复：添加元素存在性检查
  focusCodeInput() {
    if (this.data.equipment.id) return;
    wx.createSelectorQuery().select('#codeInput').boundingClientRect(rect => {
      if (rect) {
        wx.pageScrollTo({ scrollTop: rect.top - 100 });
      }
    }).exec();
    
    setTimeout(() => {
      wx.createSelectorQuery().select('#codeInput').context(res => {
        // 确保元素存在再调用focus
        if (res && res.context) {
          res.context.focus();
        } else {
          console.warn('未能找到codeInput元素，无法设置焦点');
        }
      }).exec();
    }, 300);
  },

  focusNameInput() {
    wx.createSelectorQuery().select('#nameInput').boundingClientRect(rect => {
      if (rect) {
        wx.pageScrollTo({ scrollTop: rect.top - 100 });
      }
    }).exec();
    
    setTimeout(() => {
      wx.createSelectorQuery().select('#nameInput').context(res => {
        // 确保元素存在再调用focus
        if (res && res.context) {
          res.context.focus();
        } else {
          console.warn('未能找到nameInput元素，无法设置焦点');
        }
      }).exec();
    }, 300);
  },

  focusQuantityInput() {
    setTimeout(() => {
      wx.createSelectorQuery().select('#quantityInput').context(res => {
        // 确保元素存在再调用focus
        if (res && res.context) {
          res.context.focus();
        } else {
          console.warn('未能找到quantityInput元素，无法设置焦点');
        }
      }).exec();
    }, 300);
  },

  focusRemarksInput() {
    wx.createSelectorQuery().select('#remarksInput').boundingClientRect(rect => {
      if (rect) {
        wx.pageScrollTo({ scrollTop: rect.top - 100 });
      }
    }).exec();
    
    setTimeout(() => {
      wx.createSelectorQuery().select('#remarksInput').context(res => {
        // 确保元素存在再调用focus
        if (res && res.context) {
          res.context.focus();
        } else {
          console.warn('未能找到remarksInput元素，无法设置焦点');
        }
      }).exec();
    }, 300);
  },

  // 扫码功能
  scanCode() {
    wx.scanCode({
      success: (res) => {
        this.setData({
          'equipment.code': res.result
        });
      },
      fail: (err) => {
        console.error('扫码失败', err);
        wx.showToast({ title: '扫码取消或失败', icon: 'none' });
      }
    });
  },

  // 类型选择相关
  showTypeSelector() {
    this.setData({ 
      showTypePicker: true,
      showCustomType: false
    });
  },

  hideTypeSelector() {
    this.setData({ showTypePicker: false });
  },

  onTypeChange(e) {
    this.setData({ typeIndex: e.detail.value });
    
    // 优化：如果选择了最后一项（自定义），自动进入自定义输入
    const index = e.detail.value[0];
    if (index === this.data.typeOptions.length - 1) {
      setTimeout(() => {
        this.setData({
          showTypePicker: false,
          showCustomType: true,
          customType: ''
        });
      }, 300);
    }
  },

  confirmTypeSelection() {
    const index = this.data.typeIndex[0];
    // 跳过最后一项（自定义），因为已经在onTypeChange中处理
    if (index < this.data.typeOptions.length - 1) {
      this.setData({
        'equipment.type': this.data.typeOptions[index],
        showTypePicker: false
      });
    }
  },

  // 处理自定义类型输入
  handleCustomTypeInput(e) {
    this.setData({
      customType: e.detail.value
    });
  },

  // 确认自定义类型
  confirmCustomType() {
    const value = this.data.customType.trim();
    if (value) {
      this.setData({
        'equipment.type': value,
        showCustomType: false
      });
      
      // 保存自定义选项
      this.saveCustomOption('type', value);
    } else {
      wx.showToast({ title: '请输入器材类型', icon: 'none' });
    }
  },

  // 规格型号选择相关
  showSpecificationSelector() {
    this.setData({ 
      showSpecificationPicker: true,
      showCustomSpecification: false
    });
  },

  hideSpecificationSelector() {
    this.setData({ showSpecificationPicker: false });
  },

  onSpecificationChange(e) {
    this.setData({ specificationIndex: e.detail.value });
    
    // 优化：如果选择了最后一项（自定义），自动进入自定义输入
    const index = e.detail.value[0];
    if (index === this.data.specificationOptions.length - 1) {
      setTimeout(() => {
        this.setData({
          showSpecificationPicker: false,
          showCustomSpecification: true,
          customSpecification: ''
        });
      }, 300);
    }
  },

  confirmSpecificationSelection() {
    const index = this.data.specificationIndex[0];
    if (index < this.data.specificationOptions.length - 1) {
      this.setData({
        'equipment.specification': this.data.specificationOptions[index],
        showSpecificationPicker: false
      });
    }
  },

  handleCustomSpecificationInput(e) {
    this.setData({
      customSpecification: e.detail.value
    });
  },

  confirmCustomSpecification() {
    const value = this.data.customSpecification.trim();
    if (value) {
      this.setData({
        'equipment.specification': value,
        showCustomSpecification: false
      });
      
      // 保存自定义选项
      this.saveCustomOption('specification', value);
    } else {
      wx.showToast({ title: '请输入规格型号', icon: 'none' });
    }
  },

  // 存放位置选择相关
  showLocationSelector() {
    this.setData({ 
      showLocationPicker: true,
      showCustomLocation: false
    });
  },

  hideLocationSelector() {
    this.setData({ showLocationPicker: false });
  },

  onLocationChange(e) {
    this.setData({ locationIndex: e.detail.value });
    
    // 优化：如果选择了最后一项（自定义），自动进入自定义输入
    const index = e.detail.value[0];
    if (index === this.data.locationOptions.length - 1) {
      setTimeout(() => {
        this.setData({
          showLocationPicker: false,
          showCustomLocation: true,
          customLocation: ''
        });
      }, 300);
    }
  },

  confirmLocationSelection() {
    const index = this.data.locationIndex[0];
    if (index < this.data.locationOptions.length - 1) {
      this.setData({
        'equipment.location': this.data.locationOptions[index],
        showLocationPicker: false
      });
    }
  },

  handleCustomLocationInput(e) {
    this.setData({
      customLocation: e.detail.value
    });
  },

  confirmCustomLocation() {
    const value = this.data.customLocation.trim();
    if (value) {
      this.setData({
        'equipment.location': value,
        showCustomLocation: false
      });
      
      // 保存自定义选项
      this.saveCustomOption('location', value);
    } else {
      wx.showToast({ title: '请输入存放位置', icon: 'none' });
    }
  },

  // 状态选择相关
  showStatusSelector() {
    this.setData({ 
      showStatusPicker: true,
      showCustomStatus: false
    });
  },

  hideStatusSelector() {
    this.setData({ showStatusPicker: false });
  },

  onStatusChange(e) {
    this.setData({ statusIndex: e.detail.value });
    
    // 优化：如果选择了最后一项（自定义），自动进入自定义输入
    const index = e.detail.value[0];
    if (index === this.data.statusOptions.length - 1) {
      setTimeout(() => {
        this.setData({
          showStatusPicker: false,
          showCustomStatus: true,
          customStatus: ''
        });
      }, 300);
    }
  },

  confirmStatusSelection() {
    const index = this.data.statusIndex[0];
    if (index < this.data.statusOptions.length - 1) {
      this.setData({
        'equipment.status': this.data.statusOptions[index],
        showStatusPicker: false
      });
    }
  },

  handleCustomStatusInput(e) {
    this.setData({
      customStatus: e.detail.value
    });
  },

  confirmCustomStatus() {
    const value = this.data.customStatus.trim();
    if (value) {
      this.setData({
        'equipment.status': value,
        showCustomStatus: false
      });
      
      // 保存自定义选项
      this.saveCustomOption('status', value);
    } else {
      wx.showToast({ title: '请输入状态', icon: 'none' });
    }
  },

  // 取消
  cancel() {
    // 如果有已填写内容，提示确认
    const hasContent = Object.values(this.data.equipment).some(
      value => value !== null && value !== undefined && value !== ''
    );
    
    if (hasContent) {
      wx.showModal({
        title: '提示',
        content: '确定要放弃编辑吗？已填写的内容将不会保存',
        confirmText: '放弃',
        cancelText: '继续编辑',
        success: (res) => {
          if (res.confirm) {
            safeBack();
          }
        }
      });
    } else {
      safeBack();
    }
  },

  // 保存器材
  saveEquipment() {
    const { code, name, type, location, quantity, status } = this.data.equipment;
    
    // 验证必填项
    if (!code.trim()) return wx.showToast({ title: '请输入器材编号', icon: 'none' });
    if (!name.trim()) return wx.showToast({ title: '请输入器材名称', icon: 'none' });
    if (!type) return wx.showToast({ title: '请选择器材类型', icon: 'none' });
    if (!location) return wx.showToast({ title: '请选择存放位置', icon: 'none' });
    if (!quantity || quantity < 1) return wx.showToast({ title: '请输入有效数量', icon: 'none' });
    if (!status) return wx.showToast({ title: '请选择状态', icon: 'none' });

    try {
      wx.showLoading({ title: this.data.equipment.id ? '更新中...' : '保存中...' });
      
      // 准备器材数据
      const equipmentData = {
        ...this.data.equipment,
        updateTime: new Date().toISOString()
      };
      
      // 如果是新增，添加id和创建时间
      if (!this.data.equipment.id) {
        equipmentData.id = `eq-${Date.now()}`;
        equipmentData.createTime = new Date().toISOString();
      }
      
      // 获取全局器材列表
      let equipmentList = app.globalData.equipmentList || wx.getStorageSync('equipmentList') || [];
      if (!Array.isArray(equipmentList)) equipmentList = [];
      
      if (this.data.equipment.id) {
        // 编辑模式：更新现有器材
        const index = equipmentList.findIndex(item => item.id === this.data.equipment.id);
        if (index !== -1) {
          equipmentList[index] = equipmentData;
        } else {
          // 如果没找到，作为新器材添加
          equipmentList.unshift(equipmentData);
        }
      } else {
        // 新增模式：添加新器材
        equipmentList.unshift(equipmentData);
      }
      
      // 更新全局数据和本地存储
      app.globalData.equipmentList = equipmentList;
      wx.setStorageSync('equipmentList', equipmentList);
      
      // 记录操作日志
      this.addActivityLog(equipmentData, this.data.equipment.id ? '更新' : '添加');
      
      wx.hideLoading();
      wx.showToast({ 
        title: this.data.equipment.id ? '更新成功' : '添加成功', 
        icon: 'success' 
      });
      
      // 返回上一页并刷新数据
      setTimeout(() => {
        safeBack();
        // 通知前一页刷新数据
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage && typeof prevPage.refreshData === 'function') {
          prevPage.refreshData();
        }
      }, 1500);
      
    } catch (error) {
      wx.hideLoading();
      console.error('保存失败:', error);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },

  // 添加操作日志
  addActivityLog(equipment, actionType) {
    const userInfo = app.globalData.userInfo || { username: '未知用户' };
    const activityLog = app.globalData.activityLog || wx.getStorageSync('activityLog') || [];
    
    const newActivity = {
      id: `log-${Date.now()}`,
      type: actionType,
      content: `${userInfo.username} ${actionType === '添加' ? '新增了' : '更新了'} ${equipment.name}`,
      createTime: new Date().toISOString(),
      equipmentId: equipment.id
    };
    
    activityLog.unshift(newActivity);
    app.globalData.activityLog = activityLog;
    wx.setStorageSync('activityLog', activityLog);
  }
})
    