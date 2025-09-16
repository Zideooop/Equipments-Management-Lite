export default {
  // 颜色映射表（供主题管理器直接使用）
  colorMap: {
    blue: {
      primary: '#1677ff',
      secondary: '#69b1ff'
    },
    green: {
      primary: '#2ecc71',
      secondary: '#a1e0a8'
    },
    orange: {
      primary: '#e67e22',
      secondary: '#f3b385'
    },
    purple: {
      primary: '#9b59b6',
      secondary: '#d8b9e3'
    },
    red: {
      primary: '#e74c3c',
      secondary: '#f5a7a0'
    }
  },

  // 基础配置
  config: {
    mode: 'auto', // auto/light/dark
    color: 'blue', // 主题色标识
    darkMode: false // 强制深色模式开关（mode为light/dark时生效）
  },

  // 模式变量（明暗模式基础变量，与主题管理器使用的命名保持一致）
  darkVars: {
    textPrimary: '#ffffff',
    textSecondary: '#bbbbbb',
    textTertiary: '#999999',
    bgPrimary: '#1a1a1a',
    bgSecondary: '#2c2c2c',
    bgTertiary: '#383838',
    borderColor: '#444444',
    shadowColor: 'rgba(0, 0, 0, 0.3)'
  },
  lightVars: {
    textPrimary: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    bgPrimary: '#ffffff',
    bgSecondary: '#f5f5f5',
    bgTertiary: '#eeeeee',
    borderColor: '#e5e5e5',
    shadowColor: 'rgba(0, 0, 0, 0.08)'
  },

  // 动态获取当前主题配置
  getCurrentTheme(themeConfig, systemDarkMode) {
    const { mode, color, darkMode } = themeConfig;
    // 确定明暗模式
    const isDark = mode === 'auto' 
      ? systemDarkMode 
      : mode === 'dark' || (mode === 'light' && darkMode);
    
    // 合并主题配置
    return {
      ...themeConfig,
      isDark,
      color: this.colorMap[color] || this.colorMap.blue,
      vars: isDark ? this.darkVars : this.lightVars
    };
  }
};
