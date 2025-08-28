Page({
  data: {
    // 原数据保留
    equipment: {
      name: '',
      specification: '',
      quantity: 1,
      location: '',
      remarks: '',
      status: '在库'
    },
    statusOptions: ['在库', '借出', '维修中', '已报废'],
    statusIndex: 0,
    nameError: '',
    typeError: '',
    quantityError: '',
    showHelpDialog: false,
    isSaving: false,
    focusField: '',
    
    // 新增：器材类型优化相关数据
    typeOptions: ['电子设备', '办公物资', '实验器材', '工具器械', '其他', '自定义...'],
    typeIndex: 0,
    showCustomType: false,
    customType: ''
  },

  // 原功能方法完全保留
  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`equipment.${field}`]: value
    });
    if (['name', 'quantity'].includes(field)) {
      this.setData({ [`${field}Error`]: '' });
    }
  },

  handleStatusChange(e) {
    this.setData({
      statusIndex: e.detail.value,
      'equipment.status': this.data.statusOptions[e.detail.value]
    });
  },

  decreaseQuantity() {
    if (this.data.equipment.quantity > 1) {
      this.setData({
        'equipment.quantity': this.data.equipment.quantity - 1,
        quantityError: ''
      });
    }
  },

  increaseQuantity() {
    if (this.data.equipment.quantity < 999) {
      this.setData({
        'equipment.quantity': this.data.equipment.quantity + 1,
        quantityError: ''
      });
    }
  },

  scanCode() {
    wx.scanCode({
      success: (res) => {
        this.setData({
          'equipment.specification': res.result
        });
      }
    });
  },

  showHelp() {
    this.setData({ showHelpDialog: true });
  },

  hideHelpDialog() {
    this.setData({ showHelpDialog: false });
  },

  showCancelConfirm() {
    wx.showModal({
      title: '确认取消',
      content: '当前输入内容将不保存，是否确认取消？',
      success: (res) => {
        if (res.confirm) {
          this.cancel();
        }
      }
    });
  },

  cancel() {
    wx.navigateBack();
  },

  // 器材类型选择逻辑
  handleTypeChange(e) {
    const index = e.detail.value;
    const selectedType = this.data.typeOptions[index];
    const showCustomType = selectedType === '自定义...';
    
    this.setData({
      typeIndex: index,
      showCustomType,
      customType: showCustomType ? this.data.customType : '',
      typeError: ''
    });
  },

  // 自定义类型输入处理
  handleCustomTypeInput(e) {
    this.setData({
      customType: e.detail.value
    });
  },

  // 保存方法（核心修复：云函数名称）
  saveEquipment() {
    const { equipment, typeOptions, typeIndex, showCustomType, customType } = this.data;
    let isValid = true;
    let errors = { nameError: '', typeError: '', quantityError: '' };

    // 原校验逻辑保留
    if (!equipment.name.trim()) {
      errors.nameError = '请输入器材名称';
      isValid = false;
    }
    if (!equipment.quantity || equipment.quantity < 1) {
      errors.quantityError = '请输入有效的数量';
      isValid = false;
    }

    // 类型校验
    let equipmentType;
    if (showCustomType) {
      if (!customType.trim()) {
        errors.typeError = '请输入自定义类型';
        isValid = false;
      } else {
        equipmentType = customType.trim();
      }
    } else {
      equipmentType = typeOptions[typeIndex];
      if (!equipmentType || equipmentType === '请选择器材类型') {
        errors.typeError = '请选择器材类型';
        isValid = false;
      }
    }

    if (!isValid) {
      this.setData(errors);
      for (const [field, error] of Object.entries(errors)) {
        if (error) {
          this.setData({ focusField: field === 'typeError' ? 'type' : field });
          break;
        }
      }
      return;
    }

    // 保存逻辑（修复云函数名称）
    this.setData({ isSaving: true });
    const saveData = {
      ...equipment,
      type: equipmentType,
      createTime: new Date().toISOString()
    };

    // 关键修复：使用实际部署的云函数名称
    // 请将"equipManage"替换为您云开发控制台中实际存在的函数名称
    wx.cloud.callFunction({
      name: 'equipmentManager', // 调用整合后的函数
      data: {
        action: 'add', // 指定操作类型
      ...saveData 
      },
      success: () => {
        wx.showToast({ title: '保存成功' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      },
      fail: (err) => {
        console.error('保存失败', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
        this.setData({ isSaving: false });
      }
    });
  }
});
    