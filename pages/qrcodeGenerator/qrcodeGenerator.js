// pages/qrcodeGenerator/qrcodeGenerator.js
Page({
  data: {
    equipmentList: [],
    equipmentNames: [],
    selectedEquipmentIndex: -1,
    selectedEquipment: null,
    qrcodeUrl: ''
  },

  onLoad() {
    // 加载器材列表
    const app = getApp();
    const equipmentList = app.getEquipmentList();
    
    // 提取器材名称用于选择器
    const equipmentNames = equipmentList.map(item => `${item.name} (${item.id})`);
    
    this.setData({
      equipmentList,
      equipmentNames
    });
  },

  // 选择器材
  onEquipmentChange(e) {
    const index = e.detail.value;
    const selectedEquipment = this.data.equipmentList[index];
    
    this.setData({
      selectedEquipmentIndex: index,
      selectedEquipment: selectedEquipment
    });
    
    // 生成二维码
    this.generateQrcode(selectedEquipment.id);
  },

  // 生成二维码
  generateQrcode(equipmentId) {
    // 这里使用微信小程序的二维码生成API
    // 实际项目中可能需要后端支持生成带参数的二维码
    wx.showLoading({ title: '生成二维码中...' });
    
    // 模拟生成二维码（实际项目中替换为真实接口）
    setTimeout(() => {
      // 这里使用临时图片代替真实二维码
      const qrcodeUrl = `https://picsum.photos/200/200?random=${Math.random()}`;
      
      this.setData({ qrcodeUrl });
      wx.hideLoading();
    }, 1000);
  },

  // 保存二维码图片
  saveQrcode() {
    if (!this.data.qrcodeUrl) return;
    
    wx.showLoading({ title: '保存中...' });
    
    // 下载图片
    wx.downloadFile({
      url: this.data.qrcodeUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          // 保存图片到相册
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({ title: '保存成功' });
            },
            fail: (err) => {
              wx.hideLoading();
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    });
  },

  // 分享二维码
  shareQrcode() {
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  }
})
    