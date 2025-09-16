/**
 * 图片资源工具类，处理图片加载失败问题
 */
const imageUtil = {
  // 图片资源映射表，统一管理所有图片路径
  imageMap: {
    'func-close': '/images/function/func-close.png',
    'func-back': '/images/function/func-back.png',
    'func-filter': '/images/function/func-filter.png',
    'func-add-white': '/images/function/func-add-white.png',
    'func-add': '/images/function/func-add.png',
    'func-batch-add': '/images/function/func-batch-add.png',
    'equip-no': '/images/function/equip-no.png',
    'status-all': '/images/status/status-all.png',
    'status-available': '/images/status/status-available.png',
    'status-borrowed': '/images/status/status-borrowed.png',
    'status-sync': '/images/status/status-sync.png',
    'status-sync-succeed': '/images/status/status-sync-succeed.png',
    'status-sync-failed': '/images/status/status-sync-failed.png',
    'func-upcoming': '/images/function/func-upcoming.png',
    'func-recycle': '/images/function/func-recycle.png',
    'func-about': '/images/function/func-about.png',
    'func-borrow': '/images/function/func-borrow.png',
    'func-arrow-right': '/images/function/func-arrow-right.png',
    'func-sync': '/images/function/func-sync.png',  // 新增同步图标
    'func-stats': '/images/function/func-stats.png'  ,// 新增统计图标
    'func-manage': '/images/function/func-manage.png',
  'func-record': '/images/function/func-record.png',
  'func-setting': '/images/function/func-setting.png'
  },
  
  // 获取图片路径，带容错处理
  getImagePath(key) {
    // 检查图片是否存在
    if (!this.imageMap[key]) {
      console.warn(`图片资源 ${key} 未定义`);
      return '/images/function/func-default.png'; // 默认图片路径
    }
    return this.imageMap[key];
  },
  
  // 图片加载失败处理函数
  handleImageError(e, key) {
    console.warn(`图片 ${this.getImagePath(key)} 加载失败`);
    // 尝试设置默认图片
    if (e.currentTarget) {
      e.currentTarget.setData({
        src: '/images/function/func-default.png'
      });
    }
  },
  
  // 预加载图片资源，减少加载失败
  preloadImages() {
    const keys = Object.keys(this.imageMap);
    keys.forEach(key => {
      const img = new Image();
      img.src = this.getImagePath(key);
      img.onerror = () => {
        console.warn(`图片预加载失败: ${this.getImagePath(key)}`);
      };
    });
  }
};

module.exports = imageUtil;
    