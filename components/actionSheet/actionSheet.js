Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    items: {
      type: Array,
      value: []
    }
  },
  data: {
    animation: null
  },
  observers: {
    'show'(show) {
      this.setAnimation(show);
    }
  },
  methods: {
    setAnimation(show) {
      const animation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease'
      });
      
      if (show) {
        animation.translateY(0).step();
      } else {
        animation.translateY('100%').step();
      }
      
      this.setData({
        animation: animation.export()
      });
    },
    onItemTap(e) {
      const index = e.currentTarget.dataset.index;
      this.triggerEvent('select', { index });
      this.setData({ show: false });
    },
    onMaskTap() {
      this.setData({ show: false });
    }
  }
})
