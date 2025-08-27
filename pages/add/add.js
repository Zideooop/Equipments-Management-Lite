const app = getApp();
const { safeNavigate, safeBack } = require('../../utils/navigation.js');

Page({
  data: {
    // 表单数据
    equipment: {
      name: '',
      type: '',
      specification: '',
      quantity: 1,
      location: '',
      status: '在库',
      remarks: ''
    },
    // 选择器数据
    typeOptions: ['电子设备', '工具器材', '实验仪器', '办公设备', '其他'],
    statusOptions: ['在库', '借出', '维修中', '已报废'],
    typeIndex: 0,
    statusIndex: 0,
    // 表单状态
    nameError: '',
    typeError: '',
    quantityError: '',
    focusField: '',
    isSaving: false,
    // 弹窗控制
    showHelpDialog: false
  },

  onLoad(options) {
    // 编辑模式（从详情页跳转）
    if (options.id) {
      this.initEditMode(options.id);
    }
    // 初始化选择器索引
    this.syncPickerIndex();
  },

  // 编辑模式：加载已有数据
  initEditMode(id) {
    const equipmentList = app.globalData.equipmentList || wx.getStorageSync('equipmentList') || [];
    const equipment = equipmentList.find(item => item.id === id);
    if (equipment) {
      this.setData({ equipment });
    } else {
      wx.showToast({ title: '数据加载失败', icon: 'none' });
      setTimeout(safeBack, 1000);
    }
  },

  // 同步选择器索引与值
  syncPickerIndex() {
    const { equipment, typeOptions, statusOptions } = this.data;
    const typeIndex = typeOptions.indexOf(equipment.type) || 0;
    const statusIndex = statusOptions.indexOf(equipment.status) || 0;
    this.setData({ typeIndex, statusIndex });
  },

  // 输入处理
  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    // 特殊处理：数量限制
    if (field === 'quantity') {
      const num = parseInt(value) || 1;
      this.setData({ 
        [`equipment.${field}`]: Math.min(Math.max(num, 1), 999),
        quantityError: ''
      });
      return;
    }
    
    // 清除对应字段错误
    if (field === 'name') this.setData({ nameError: '' });
    
    this.setData({ [`equipment.${field}`]: value });
  },

  // 类型选择
  handleTypeChange(e) {
    const index = e.detail.value;
    this.setData({
      typeIndex: index,
      [`equipment.type`]: this.data.typeOptions[index],
      typeError: ''
    });
  },

  // 状态选择
  handleStatusChange(e) {
    const index = e.detail.value;
    this.setData({
      statusIndex: index,
      [`equipment.status`]: this.data.statusOptions[index]
    });
  },

  // 数量增减
  decreaseQuantity() {
    const { quantity } = this.data.equipment;
    if (quantity > 1) {
      this.setData({ 
        [`equipment.quantity`]: quantity - 1,
        quantityError: ''
      });
    }
  },

  increaseQuantity() {
    const { quantity } = this.data.equipment;
    if (quantity < 999) {
      this.setData({ 
        [`equipment.quantity`]: quantity + 1,
        quantityError: ''
      });
    }
  },

  // 扫码获取规格
  scanCode() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['barCode', 'qrCode'],
      success: (res) => {
        this.setData({ [`equipment.specification`]: res.result });
      },
      fail: (err) => {
        console.log('扫码失败', err);
        wx.showToast({ title: '扫码失败，请重试', icon: 'none' });
      }
    });
  },

  // 表单验证
  validateForm() {
    const { equipment } = this.data;
    let isValid = true;

    // 验证名称
    if (!equipment.name?.trim()) {
      this.setData({ nameError: '请输入器材名称', focusField: 'name' });
      isValid = false;
    }

    // 验证类型
    if (!equipment.type) {
      this.setData({ typeError: '请选择器材类型' });
      isValid = false;
    }

    // 验证数量
    if (!equipment.quantity || equipment.quantity < 1) {
      this.setData({ quantityError: '数量必须大于0' });
      isValid = false;
    }

    return isValid;
  },

  // 保存器材
  saveEquipment() {
    if (!this.validateForm()) return;

    this.setData({ isSaving: true });
    const { equipment } = this.data;
    const equipmentList = app.globalData.equipmentList || wx.getStorageSync('equipmentList') || [];
    const isEdit = !!equipment.id;

    // 编辑模式：更新现有数据
    if (isEdit) {
      const index = equipmentList.findIndex(item => item.id === equipment.id);
      if (index > -1) {
        equipmentList[index] = { ...equipment, updateTime: new Date().toISOString() };
      }
    } 
    // 新增模式：添加新数据
    else {
      const newEquipment = {
        ...equipment,
        id: Date.now().toString(), // 生成唯一ID
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };
      equipmentList.unshift(newEquipment); // 新增数据放前面

      // 记录活动日志
      app.globalData.activityLog = app.globalData.activityLog || [];
      app.globalData.activityLog.unshift({
        id: `add-${newEquipment.id}`,
        type: '添加',
        content: `新增器材: ${newEquipment.name}`,
        createTime: new Date().toISOString(),
        equipmentId: newEquipment.id
      });
    }

    // 保存数据
    app.globalData.equipmentList = equipmentList;
    wx.setStorageSync('equipmentList', equipmentList);
    
    // 保存活动日志
    if (!isEdit) {
      wx.setStorageSync('activityLog', app.globalData.activityLog);
    }

    // 反馈并返回
    wx.showToast({ title: isEdit ? '修改成功' : '添加成功' });
    setTimeout(() => {
      safeBack();
    }, 1000);
  },

  // 取消确认
  showCancelConfirm() {
    wx.showModal({
      title: '提示',
      content: '确定要放弃编辑吗？已输入的内容将不会保存',
      cancelText: '继续编辑',
      confirmText: '放弃',
      success: (res) => {
        if (res.confirm) {
          safeBack();
        }
      }
    });
  },

  // 帮助弹窗控制
  showHelp() {
    this.setData({ showHelpDialog: true });
  },

  hideHelpDialog() {
    this.setData({ showHelpDialog: false });
  },

  // 取消（直接返回）
  cancel() {
    safeBack();
  }
});