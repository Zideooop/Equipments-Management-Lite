// pages/equipmentHub/equipmentHub.js
Page({
  data: {
    // 选项卡状态
    activeTab: 'barcode', // barcode 或 list
    
    // 操作类型
    operationTypes: ['入库', '出库'],
    operationTypeIndex: 0,
    currentOperationType: '入库',
    
    // 器材数据
    equipmentList: [],
    equipmentNames: [],
    selectedEquipmentIndex: -1,
    selectedEquipment: null,
    
    // 快捷选择数据
    recentEquipment: [], // 最近出库/新增器材
    showRecentPanel: true, // 是否显示最近器材面板
    
    // 条码相关
    codeType: 'qr', // qr 或 bar
    codeUrl: '',
    
    // 清单数据
    inventoryList: [],
    listRemark: '',
    listManager: '',
    hasQuantityDifference: false, // 数量差异标记
    
    // 加载状态
    showLoading: false,
    loadingText: '加载中...',
    
    // 提示信息
    showToast: false,
    toastMessage: ''
  },

  onLoad() {
    this.loadEquipmentList();
    this.loadInventoryDraft();
    this.loadRecentEquipment(); // 加载最近器材
  },

  // 切换选项卡
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    
    // 切换到清单页时检查是否需要加载最近器材
    if (tab === 'list') {
      this.loadRecentEquipment();
    }
  },

  // 切换操作类型
  onOperationTypeChange(e) {
    const index = e.detail.value;
    const type = this.data.operationTypes[index];
    
    this.setData({
      operationTypeIndex: index,
      currentOperationType: type
    });
    
    // 切换操作类型时重新加载最近器材
    this.loadRecentEquipment();
    
    // 清空当前清单
    this.setData({ inventoryList: [] });
    this.checkQuantityDifference();
  },

  // 加载器材列表
  loadEquipmentList() {
    this.showLoading('加载器材列表...');
    
    // 从全局获取器材数据
    const app = getApp();
    try {
      const equipmentList = app.getEquipmentList() || [];
      
      // 提取器材名称用于选择器
      const equipmentNames = equipmentList.map(item => `${item.name} (${item.id})`);
      
      this.setData({
        equipmentList,
        equipmentNames
      });
    } catch (err) {
      console.error('加载器材列表失败:', err);
      this.showToast('加载器材失败');
    } finally {
      this.hideLoading();
    }
  },

  // 加载最近器材
  loadRecentEquipment() {
    const app = getApp();
    const currentType = this.data.currentOperationType;
    let recentEquipment = [];
    
    try {
      if (currentType === '入库') {
        // 入库时加载最近30天未归还的出库记录
        const outboundHistory = app.getOutboundHistory() || [];
        const thirtyDaysAgo = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
        
        recentEquipment = outboundHistory
          .filter(item => {
            const outTime = new Date(item.createTime).getTime();
            return outTime >= thirtyDaysAgo && !item.returned;
          })
          .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
          .map(item => ({
            ...item,
            source: 'outbound' // 标记来源为出库记录
          }));
      } else {
        // 出库时加载最近7天新增的器材
        const sevenDaysAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
        recentEquipment = this.data.equipmentList
          .filter(item => {
            const createTime = item.createTime ? new Date(item.createTime).getTime() : 0;
            return createTime >= sevenDaysAgo;
          })
          .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
          .map(item => ({
            ...item,
            quantity: 1,
            source: 'new' // 标记来源为新增器材
          }));
      }
      
      this.setData({ recentEquipment });
    } catch (err) {
      console.error('加载最近器材失败:', err);
      this.showToast('加载最近器材失败');
    }
  },

  // 切换最近器材面板显示状态
  toggleRecentPanel() {
    this.setData({ showRecentPanel: !this.data.showRecentPanel });
  },

  // 从最近器材添加到清单
  addFromRecent(e) {
    const index = e.currentTarget.dataset.index;
    const equipment = this.data.recentEquipment[index];
    const inventoryList = [...this.data.inventoryList];
    
    // 检查是否已在清单中
    const existingIndex = inventoryList.findIndex(item => item.id === equipment.id);
    
    if (existingIndex > -1) {
      // 已存在，增加数量
      inventoryList[existingIndex].quantity += 1;
      // 初始化实际数量（入库场景）
      if (this.data.currentOperationType === '入库' && 
          inventoryList[existingIndex].actualQty === undefined) {
        inventoryList[existingIndex].actualQty = inventoryList[existingIndex].quantity;
      }
    } else {
      // 新添加，数量为1
      const newItem = {
        ...equipment,
        quantity: equipment.quantity || 1,
        checked: false // 核对状态
      };
      
      // 入库场景添加预期数量
      if (this.data.currentOperationType === '入库') {
        newItem.actualQty = newItem.quantity;
      }
      
      inventoryList.push(newItem);
    }
    
    this.setData({ inventoryList });
    this.saveInventoryDraft(); // 保存为草稿
    this.checkQuantityDifference();
    this.showToast('已添加到清单');
  },

  // 选择器材
  onEquipmentChange(e) {
    const index = e.detail.value;
    const selectedEquipment = this.data.equipmentList[index];
    
    this.setData({
      selectedEquipmentIndex: index,
      selectedEquipment: selectedEquipment,
      codeUrl: '' // 清空之前的条码
    });
    
    // 生成条码
    this.generateCode(selectedEquipment.id);
  },

  // 切换条码类型
  onCodeTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ codeType: type });
    
    // 如果已选择器材，重新生成条码
    if (this.data.selectedEquipment) {
      this.generateCode(this.data.selectedEquipment.id);
    }
  },

  // 生成条码
  generateCode(equipmentId) {
    this.showLoading(`生成${this.data.codeType === 'qr' ? '二维码' : '条形码'}中...`);
    
    // 模拟生成条码（实际项目中替换为真实接口）
    setTimeout(() => {
      try {
        // 实际项目中这里应该是真实的条码图片URL
        const mockCodeUrl = this.data.codeType === 'qr' 
          ? `https://picsum.photos/200/200?random=${Math.random()}`
          : `https://picsum.photos/300/100?random=${Math.random()}`;
        
        this.setData({ codeUrl: mockCodeUrl });
      } catch (err) {
        console.error('生成条码失败:', err);
        this.showToast('生成条码失败');
      } finally {
        this.hideLoading();
      }
    }, 800);
  },

  // 保存条码图片
  saveCode() {
    if (!this.data.codeUrl) return;
    
    this.showLoading('保存中...');
    
    // 检查权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.writePhotosAlbum']) {
          // 申请权限
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => this.downloadAndSaveImage(),
            fail: () => {
              this.hideLoading();
              wx.showModal({
                title: '权限不足',
                content: '需要相册权限才能保存图片',
                confirmText: '去设置',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting();
                  }
                }
              });
            }
          });
        } else {
          this.downloadAndSaveImage();
        }
      }
    });
  },

  // 下载并保存图片
  downloadAndSaveImage() {
    wx.downloadFile({
      url: this.data.codeUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              this.showToast('保存成功');
            },
            fail: (err) => {
              console.error('保存失败:', err);
              this.showToast('保存失败');
            }
          });
        } else {
          this.showToast('下载失败');
        }
      },
      fail: (err) => {
        console.error('下载失败:', err);
        this.showToast('下载失败');
      },
      complete: () => {
        this.hideLoading();
      }
    });
  },

  // 添加到清单
  addToInventoryList() {
    if (!this.data.selectedEquipment) return;
    
    const equipment = this.data.selectedEquipment;
    const inventoryList = [...this.data.inventoryList];
    
    // 检查是否已在清单中
    const existingIndex = inventoryList.findIndex(item => item.id === equipment.id);
    
    if (existingIndex > -1) {
      // 已存在，增加数量
      inventoryList[existingIndex].quantity += 1;
      // 初始化实际数量（入库场景）
      if (this.data.currentOperationType === '入库' && 
          inventoryList[existingIndex].actualQty === undefined) {
        inventoryList[existingIndex].actualQty = inventoryList[existingIndex].quantity;
      }
    } else {
      // 新添加，数量为1
      const newItem = {
        ...equipment,
        quantity: 1,
        checked: false // 核对状态
      };
      
      // 入库场景添加实际数量字段
      if (this.data.currentOperationType === '入库') {
        newItem.actualQty = 1;
      }
      
      inventoryList.push(newItem);
    }
    
    this.setData({ inventoryList });
    this.saveInventoryDraft(); // 保存为草稿
    this.checkQuantityDifference();
    this.showToast('已添加到清单');
    
    // 自动切换到清单标签
    this.setData({ activeTab: 'list' });
  },

  // 减少数量
  decreaseQty(e) {
    const index = e.currentTarget.dataset.index;
    const inventoryList = [...this.data.inventoryList];
    
    if (inventoryList[index].quantity <= 1) {
      // 数量为1时减少则移除
      inventoryList.splice(index, 1);
    } else {
      // 减少数量
      inventoryList[index].quantity -= 1;
      // 同步实际数量（如果未修改过）
      if (this.data.currentOperationType === '入库' && 
          inventoryList[index].actualQty === inventoryList[index].quantity + 1) {
        inventoryList[index].actualQty = inventoryList[index].quantity;
      }
    }
    
    this.setData({ inventoryList });
    this.saveInventoryDraft();
    this.checkQuantityDifference();
  },

  // 增加数量
  increaseQty(e) {
    const index = e.currentTarget.dataset.index;
    const inventoryList = [...this.data.inventoryList];
    
    inventoryList[index].quantity += 1;
    // 同步实际数量（如果未修改过）
    if (this.data.currentOperationType === '入库' && 
        inventoryList[index].actualQty === inventoryList[index].quantity - 1) {
      inventoryList[index].actualQty = inventoryList[index].quantity;
    }
    
    this.setData({ inventoryList });
    this.saveInventoryDraft();
    this.checkQuantityDifference();
  },

  // 修改实际数量（入库场景）
  updateActualQty(e) {
    const index = e.currentTarget.dataset.index;
    const value = parseInt(e.detail.value) || 0;
    const inventoryList = [...this.data.inventoryList];
    
    inventoryList[index].actualQty = value;
    // 标记为已核对
    inventoryList[index].checked = true;
    
    this.setData({ inventoryList });
    this.saveInventoryDraft();
    this.checkQuantityDifference();
  },

  // 切换核对状态
  toggleChecked(e) {
    const index = e.currentTarget.dataset.index;
    const inventoryList = [...this.data.inventoryList];
    
    inventoryList[index].checked = !inventoryList[index].checked;
    
    this.setData({ inventoryList });
    this.saveInventoryDraft();
  },

  // 从清单移除
  removeFromList(e) {
    const index = e.currentTarget.dataset.index;
    const inventoryList = [...this.data.inventoryList];
    
    inventoryList.splice(index, 1);
    
    this.setData({ inventoryList });
    this.saveInventoryDraft();
    this.checkQuantityDifference();
  },

  // 清空清单
  clearList() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空当前清单吗？',
      confirmColor: '#f53f3f',
      success: (res) => {
        if (res.confirm) {
          this.setData({ inventoryList: [] });
          this.saveInventoryDraft();
          this.checkQuantityDifference();
        }
      }
    });
  },

  // 检查数量差异
  checkQuantityDifference() {
    const { inventoryList, currentOperationType } = this.data;
    
    // 只有入库场景需要检查差异
    if (currentOperationType !== '入库') {
      this.setData({ hasQuantityDifference: false });
      return;
    }
    
    // 检查是否有实际数量与预期数量不一致的项
    const hasDifference = inventoryList.some(item => {
      // 确保实际数量已设置
      if (item.actualQty === undefined) return false;
      return item.actualQty !== item.quantity;
    });
    
    this.setData({ hasQuantityDifference });
  },

  // 保存为草稿
  saveAsDraft() {
    this.saveInventoryDraft();
    this.showToast('已保存为草稿');
  },

  // 保存清单草稿到本地
  saveInventoryDraft() {
    const draft = {
      operationType: this.data.currentOperationType,
      list: this.data.inventoryList,
      remark: this.data.listRemark,
      manager: this.data.listManager,
      saveTime: new Date().toISOString()
    };
    
    wx.setStorageSync('inventoryDraft', draft);
  },

  // 加载清单草稿
  loadInventoryDraft() {
    const draft = wx.getStorageSync('inventoryDraft');
    
    if (draft) {
      this.setData({
        currentOperationType: draft.operationType,
        operationTypeIndex: this.data.operationTypes.indexOf(draft.operationType),
        inventoryList: draft.list,
        listRemark: draft.remark || '',
        listManager: draft.manager || ''
      });
      this.checkQuantityDifference();
    }
  },

  // 生成清单文件
  generateInventorySheet() {
    if (this.data.inventoryList.length === 0) return;
    
    this.showLoading('生成清单中...');
    
    // 模拟生成清单（实际项目中可生成PDF或Excel）
    setTimeout(() => {
      // 这里只是模拟，实际项目中需要调用真实的生成接口
      this.hideLoading();
      
      wx.showModal({
        title: '清单生成成功',
        content: '清单已生成，是否需要分享或打印？',
        confirmText: '分享',
        cancelText: '打印',
        success: (res) => {
          if (res.confirm) {
            this.shareInventorySheet();
          } else if (res.cancel) {
            this.printInventorySheet();
          }
        }
      });
    }, 1000);
  },

  // 分享清单
  shareInventorySheet() {
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  },

  // 打印清单
  printInventorySheet() {
    wx.showToast({
      title: '打印功能开发中',
      icon: 'none'
    });
  },

  // 确认出入库操作
  confirmOperation() {
    if (this.data.inventoryList.length === 0) return;
    
    if (!this.data.listManager) {
      this.showToast('请填写负责人');
      return;
    }
    
    // 入库操作检查是否有未核对项
    if (this.data.currentOperationType === '入库') {
      const uncheckedItems = this.data.inventoryList.filter(item => !item.checked);
      if (uncheckedItems.length > 0) {
        wx.showModal({
          title: '存在未核对项',
          content: `有${uncheckedItems.length}项未核对，是否继续？`,
          confirmText: '继续',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              this.processOperation();
            }
          }
        });
        return;
      }
    }
    
    this.processOperation();
  },

  // 处理出入库操作
  processOperation() {
    this.showLoading(`确认${this.data.currentOperationType}中...`);
    
    // 模拟提交操作（实际项目中替换为真实接口）
    setTimeout(() => {
      try {
        // 调用全局方法更新器材状态
        const app = getApp();
        this.data.inventoryList.forEach(item => {
          // 入库使用实际数量，出库使用计划数量
          const actualQty = this.data.currentOperationType === '入库' ? item.actualQty : item.quantity;
          
          app.updateEquipment(item.id, {
            status: this.data.currentOperationType === '入库' ? '在库' : '借出',
            updateTime: new Date().toISOString(),
            // 更新库存数量
            stock: this.data.currentOperationType === '入库' 
              ? (item.stock || 0) + actualQty
              : (item.stock || 0) - actualQty
          });
        });
        
        // 记录操作日志
        const operationDesc = this.data.inventoryList.map(item => {
          const qty = this.data.currentOperationType === '入库' ? item.actualQty : item.quantity;
          return `${item.name}(${qty}个)`;
        }).join('、');
        
        app.addOperationLog(
          `${this.data.currentOperationType}清单：${operationDesc}，负责人：${this.data.listManager}`
        );
        
        // 处理入库时更新出库记录状态
        if (this.data.currentOperationType === '入库') {
          this.data.inventoryList.forEach(item => {
            if (item.source === 'outbound' && item.outboundId) {
              app.updateOutboundStatus(item.outboundId, true);
            }
          });
        }
        
        // 清空清单
        this.setData({
          inventoryList: [],
          listRemark: '',
          listManager: '',
          hasQuantityDifference: false
        });
        
        // 清除草稿
        wx.removeStorageSync('inventoryDraft');
        
        this.hideLoading();
        wx.showModal({
          title: '操作成功',
          content: `${this.data.currentOperationType}操作已完成，是否生成记录凭证？`,
          confirmText: '生成凭证',
          cancelText: '返回',
          success: (res) => {
            if (res.confirm) {
              this.generateInventorySheet();
            }
          }
        });
      } catch (err) {
        console.error('确认操作失败:', err);
        this.hideLoading();
        this.showToast('操作失败，请重试');
      }
    }, 1500);
  },

  // 备注信息变更
  onRemarkChange(e) {
    this.setData({ listRemark: e.detail.value });
    this.saveInventoryDraft();
  },

  // 负责人变更
  onManagerChange(e) {
    this.setData({ listManager: e.detail.value });
    this.saveInventoryDraft();
  },

  // 显示帮助引导
  showHelpGuide() {
    wx.showModal({
      title: '使用帮助',
      content: '1. 条码生成：选择器材生成对应的条码，可用于标识器材\n2. 出入库清单：添加器材形成清单，完成后可生成凭证\n3. 清单会自动保存为草稿，下次可继续编辑',
      showCancel: false
    });
  },

  // 显示加载
  showLoading(text) {
    this.setData({
      showLoading: true,
      loadingText: text || '加载中...'
    });
  },

  // 隐藏加载
  hideLoading() {
    this.setData({ showLoading: false });
  },

  // 显示提示
  showToast(message) {
    this.setData({
      showToast: true,
      toastMessage: message
    });
    
    // 3秒后自动隐藏
    setTimeout(() => {
      this.setData({ showToast: false });
    }, 3000);
  }
})
    