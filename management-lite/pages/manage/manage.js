// pages/manage/manage.js
Page({
  data: {
    equipmentList: [],
    filteredList: [],
    searchKey: '',
    statusFilter: 'all',
    statusOptions: ['all', '在库', '借出', '维修中'],
    loading: false,
    isFilterShow: false
  },

  onLoad() {
    this.loadEquipmentList();
  },

  onShow() {
    this.loadEquipmentList();
  },

  // 下拉刷新
  onPullDownRefresh() {
    const app = getApp();
    app.syncData(false).then(result => {
      if (result.success) {
        this.loadEquipmentList();
        wx.showToast({
          title: '同步成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: result.message || '同步失败',
          icon: 'none'
        });
      }
      wx.stopPullDownRefresh();
    });
  },

  // 数据更新回调
  onDataUpdated() {
    this.loadEquipmentList();
  },

  // 加载器材列表
  loadEquipmentList() {
    this.setData({ loading: true });
    
    try {
      const app = getApp();
      const equipmentList = app.getEquipmentList();
      
      // 按更新时间排序，最新的在前
      equipmentList.sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime));
      
      this.setData({
        equipmentList,
        filteredList: equipmentList
      });
      
      // 应用当前筛选条件
      this.applyFilters();
    } catch (error) {
      console.error('加载器材列表失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKey: e.detail.value.trim()
    }, () => {
      this.applyFilters();
    });
  },

  // 切换状态筛选
  onStatusChange(e) {
    const status = e.detail.value;
    this.setData({
      statusFilter: status,
      isFilterShow: false
    }, () => {
      this.applyFilters();
    });
  },

  // 显示/隐藏筛选器
  toggleFilter() {
    this.setData({
      isFilterShow: !this.data.isFilterShow
    });
  },

  // 应用筛选条件
  applyFilters() {
    const { equipmentList, searchKey, statusFilter } = this.data;
    
    let filtered = [...equipmentList];
    
    // 应用状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    // 应用搜索筛选
    if (searchKey) {
      const key = searchKey.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(key) || 
        item.code.toLowerCase().includes(key) ||
        item.type.toLowerCase().includes(key) ||
        item.location.toLowerCase().includes(key)
      );
    }
    
    this.setData({
      filteredList: filtered
    });
  },

  // 跳转到添加页面
  goToAdd() {
    wx.navigateTo({
      url: '/pages/add/add'
    });
  },

  // 跳转到详情页面
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/equipmentDetail/equipmentDetail?id=${id}`
    });
  },

  // 扫码功能
  scanCode() {
    wx.scanCode({
      success: (res) => {
        const scanResult = res.result;
        if (!scanResult) {
          wx.showToast({ title: '未识别到有效内容', icon: 'none' });
          return;
        }
        
        // 检查是否为已存在的器材
        const app = getApp();
        const equipmentList = app.getEquipmentList();
        const matchedEquipment = equipmentList.find(item => 
          item.code === scanResult || item.id === scanResult ||
          item.specification === scanResult
        );
        
        if (matchedEquipment) {
          // 已存在，跳转到详情页
          wx.navigateTo({
            url: `/pages/equipmentDetail/equipmentDetail?id=${matchedEquipment.id}`
          });
        } else {
          // 不存在，询问是否添加
          wx.showModal({
            title: '未找到该器材',
            content: `是否将 "${scanResult}" 登记入库？`,
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 跳转至添加页并带入扫码结果
                wx.navigateTo({
                  url: `/pages/add/add?scanResult=${encodeURIComponent(scanResult)}`
                });
              }
            }
          });
        }
      },
      fail: (err) => {
        console.error('扫码失败:', err);
        wx.showToast({
          title: '扫码失败',
          icon: 'none'
        });
      }
    });
  }
});
