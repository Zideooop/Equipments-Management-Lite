Component({
  properties: {
    // 菜单配置
    menuItems: {
      type: Array,
      value: []
    }
  },
  data: {
    isOpen: false // 菜单是否展开
  },
  methods: {
    // 切换菜单展开/收起
    toggleMenu() {
      this.setData({
        isOpen: !this.data.isOpen
      });
    },
    
    // 处理菜单项点击
    handleMenuClick(e) {
      const index = e.currentTarget.dataset.index;
      const menuItem = this.data.menuItems[index];
      
      if (menuItem && menuItem.action) {
        // 触发自定义事件，传递点击的菜单项信息
        this.triggerEvent('menuclick', {
          index,
          item: menuItem
        });
      }
      
      // 点击后收起菜单
      this.setData({
        isOpen: false
      });
    }
  }
})