// 主题管理工具类
class ThemeManager {
  // 默认主题配置
  static defaultTheme = {
    mode: 'light', // 明亮模式/暗黑模式
    primaryColor: '#1677ff' // 主题主色
  }
  
  // 初始化主题
  static initTheme() {
    const savedTheme = wx.getStorageSync('appTheme')
    const theme = savedTheme ? savedTheme : this.defaultTheme
    this.applyTheme(theme)
    return theme
  }
  
  // 保存主题设置
  static saveTheme(theme) {
    // 合并新设置与已有设置
    const currentTheme = this.getCurrentTheme()
    const newTheme = { ...currentTheme, ...theme }
    
    // 保存到本地存储
    app.saveEquipmentList('appTheme', newTheme)
    
    // 应用新主题
    this.applyTheme(newTheme)
    
    return newTheme
  }
  
  // 获取当前主题
  static getCurrentTheme() {
    return wx.getStorageSync('appTheme') || this.defaultTheme
  }
  
  // 应用主题（兼容方式）
  static applyTheme(theme) {
    try {
      // 方案1：使用全局变量，在页面中通过数据绑定应用
      getApp().globalData.theme = theme
      
      // 方案2：如果基础库版本支持，使用wx.setNavigationBarColor
      if (wx.setNavigationBarColor) {
        const isDark = theme.mode === 'dark'
        wx.setNavigationBarColor({
          frontColor: isDark ? '#ffffff' : '#000000',
          backgroundColor: theme.primaryColor
        })
      }
      
      // 发布主题更新事件，让所有页面响应主题变化
      wx.eventEmitter.emit('themeChange', theme)
    } catch (e) {
      console.error('应用主题失败:', e)
    }
  }
  
  // 切换明暗模式
  static toggleMode() {
    const currentTheme = this.getCurrentTheme()
    const newMode = currentTheme.mode === 'light' ? 'dark' : 'light'
    return this.saveTheme({ mode: newMode })
  }
  
  // 设置主题色
  static setPrimaryColor(color) {
    return this.saveTheme({ primaryColor: color })
  }
}

module.exports = ThemeManager
