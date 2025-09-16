// 浮动按钮组件 - 提供可定制的悬浮菜单功能
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 菜单配置项
    menuItems: {
      type: Array,
      value: [],
      observer: function(newVal) {
        this._handleMenuItemsChange(newVal);
      },
      validator: function(value) {
        return this._validateMenuItems(value);
      }
    },
    // 主按钮颜色
    mainColor: {
      type: String,
      value: '#1677ff'
    },
    // 展开状态颜色
    openColor: {
      type: String,
      value: '#f53f3f'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    isOpen: false,       // 菜单是否展开
    isAnimating: false,  // 是否正在动画
    safeMenuItems: []    // 经过安全处理的菜单配置
  },

  /**
   * 组件的生命周期函数
   */
  lifetimes: {
    // 组件实例进入页面节点树时执行
    attached() {
      this._initComponent();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化组件
     * @private
     */
    _initComponent() {
      // 确保menuItems始终为有效的数组
      if (!Array.isArray(this.data.menuItems) || this.data.menuItems.length === 0) {
        console.warn('浮动按钮组件：menuItems为空，使用默认配置');
        this.setData({
          safeMenuItems: [{ icon: '/images/function/func-add.png', text: '添加', action: 'default' }]
        });
      } else {
        this.setData({ safeMenuItems: this.data.menuItems });
      }
    },

    /**
     * 处理菜单配置变化
     * @param {Array} newVal - 新的菜单配置
     * @private
     */
    _handleMenuItemsChange(newVal) {
      if (!Array.isArray(newVal) || newVal.length === 0) {
        console.warn('浮动按钮组件：menuItems为空，使用默认配置');
        this.setData({
          safeMenuItems: [{ icon: '/images/function/func-add.png', text: '添加', action: 'default' }]
        });
      } else {
        this.setData({ safeMenuItems: newVal });
      }
    },

    /**
     * 验证菜单配置的有效性
     * @param {Array} value - 菜单配置
     * @returns {boolean} 是否有效
     * @private
     */
    _validateMenuItems(value) {
      if (!Array.isArray(value)) return false;
      
      // 验证每个菜单项是否包含必要字段
      return value.every(item => 
        typeof item === 'object' && 
        item.text && 
        typeof item.text === 'string'
      );
    },

    /**
     * 切换菜单展开/收起状态
     */
    toggleMenu() {
      if (this.data.isAnimating) return;
      
      this.setData({ isAnimating: true }, () => {
        // 使用setTimeout确保动画效果稳定
        setTimeout(() => {
          this.setData({
            isOpen: !this.data.isOpen,
            isAnimating: false
          });
        }, 50);
      });
    },
    
    /**
     * 处理菜单项点击事件
     * @param {Object} e - 事件对象
     */
    handleMenuClick(e) {
      const index = e.currentTarget.dataset.index;
      
      // 边界检查
      if (index === undefined || index < 0 || index >= this.data.safeMenuItems.length) {
        console.error('无效的菜单项索引:', index);
        return;
      }
      
      const menuItem = this.data.safeMenuItems[index];
      
      if (menuItem && menuItem.action) {
        this.triggerEvent('menuclick', {
          index,
          item: menuItem
        });
      }
      
      this.setData({ isOpen: false });
    }
  }
})
    