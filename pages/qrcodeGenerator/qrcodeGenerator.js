// pages/equipmentHub/equipmentHub.js
Page({
  data: {
    equipmentList: [],
    equipmentNames: [],
    selectedEquipmentIndex: -1,
    selectedEquipment: null,
    qrcodeUrl: '',
    showLoading: false,
    loadingText: '加载中...'
  },

  onLoad() {
    this.showLoading('加载器材列表...');
    // 加载器材列表
    const app = getApp();
    // 使用setTimeout模拟异步加载
    setTimeout(() => {
      try {
        const equipmentList = app.getEquipmentList() || [];
        if (equipmentList.length === 0) {
          wx.showToast({
            title: '暂无器材数据',
            icon: 'none',
            duration: 2000
          });
        }
        
        // 提取器材名称用于选择器
        const equipmentNames = equipmentList.map(item => `${item.name} (${item.id})`);
        
        this.setData({
          equipmentList,
          equipmentNames
        });
      } catch (err) {
        wx.showToast({
          title: '数据加载失败',
          icon: 'none',
          duration: 2000
        });
        console.error('加载器材列表失败:', err);
      } finally {
        this.hideLoading();
      }
    }, 800);
  },

  // 显示加载弹窗
  showLoading(text = '加载中...') {
    this.setData({
      showLoading: true,
      loadingText: text
    });
  },

  // 隐藏加载弹窗
  hideLoading() {
    this.setData({
      showLoading: false
    });
  },

  // 选择器材
  onEquipmentChange(e) {
    const index = e.detail.value;
    const selectedEquipment = this.data.equipmentList[index];
    
    this.setData({
      selectedEquipmentIndex: index,
      selectedEquipment: selectedEquipment,
      qrcodeUrl: '' // 清空之前的二维码，显示加载状态
    });
    
    // 生成二维码
    this.generateQrcode(selectedEquipment.id);
  },

  // 生成二维码
  generateQrcode(equipmentId) {
    this.showLoading('生成二维码中...');
    
    // 实际项目中替换为真实接口调用
    wx.request({
      url: 'https://your-api.com/generate-qrcode',
      method: 'POST',
      data: { equipmentId },
      success: (res) => {
        if (res.data && res.data.qrcodeUrl) {
          this.setData({ qrcodeUrl: res.data.qrcodeUrl });
        } else {
          wx.showToast({
            title: '生成失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('生成二维码失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        // 失败时使用默认图片应急
        this.setData({
          qrcodeUrl: `https://picsum.photos/200/200?random=${Math.random()}`
        });
      },
      complete: () => {
        this.hideLoading();
      }
    });
  },

  // 保存二维码图片
  saveQrcode() {
    if (!this.data.qrcodeUrl) return;
    
    // 检查权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.writePhotosAlbum']) {
          // 申请权限
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => {
              this.downloadAndSaveImage();
            },
            fail: () => {
              // 权限被拒绝，引导用户打开设置
              wx.showModal({
                title: '权限不足',
                content: '需要获取相册权限才能保存图片',
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
    this.showLoading('保存中...');
    
    wx.downloadFile({
      url: this.data.qrcodeUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.showToast({ title: '保存成功' });
            },
            fail: (err) => {
              console.error('保存图片失败:', err);
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
          });
        } else {
          wx.showToast({ title: '下载失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('下载图片失败:', err);
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
      complete: () => {
        this.hideLoading();
      }
    });
  },

  // 分享二维码
  shareQrcode() {
    if (!this.data.qrcodeUrl) return;
    
    this.showLoading('准备分享...');
    
    // 先下载图片再分享
    wx.downloadFile({
      url: this.data.qrcodeUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.hideShareMenu({
            menus: ['shareAppMessage', 'shareTimeline']
          });
          
          // 显示分享菜单
          wx.showShareImageMenu({
            path: res.tempFilePath,
            success: () => {
              console.log('分享成功');
            },
            fail: (err) => {
              console.error('分享失败:', err);
              wx.showToast({ title: '分享失败', icon: 'none' });
            }
          });
        }
      },
      fail: (err) => {
        console.error('下载分享图片失败:', err);
        wx.showToast({ title: '分享准备失败', icon: 'none' });
      },
      complete: () => {
        this.hideLoading();
      }
    });
  }
})