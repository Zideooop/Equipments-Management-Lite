// 主题配置模型
export default {
  // 主题模式: auto/light/dark (保持原有基础上扩展功能)
  mode: 'auto',
  // 主题色: blue/green/orange/purple
  color: 'blue',
  // 深色模式开关(当mode为light/dark时生效)
  darkMode: false,
  
  // 预设主题色映射
  colorMap: {
    blue: {
      primary: '#3498db',
      primaryLight: '#ebf5fb',
      primaryDark: '#2980b9'
    },
    green: {
      primary: '#2ecc71',
      primaryLight: '#eafaf1',
      primaryDark: '#27ae60'
    },
    orange: {
      primary: '#e67e22',
      primaryLight: '#fef5e7',
      primaryDark: '#d35400'
    },
    purple: {
      primary: '#9b59b6',
      primaryLight: '#f5eef8',
      primaryDark: '#8e44ad'
    }
  },
  
  // 深色模式变量
  darkVars: {
    textPrimary: '#ffffff',
    textSecondary: '#bbbbbb',
    textTertiary: '#999999',
    bgPrimary: '#1a1a1a',
    bgSecondary: '#2c2c2c',
    bgTertiary: '#383838',
    borderColor: '#444444'
  },
  
  // 浅色模式变量
  lightVars: {
    textPrimary: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    bgPrimary: '#ffffff',
    bgSecondary: '#f5f5f5',
    bgTertiary: '#eeeeee',
    borderColor: '#e5e5e5'
  }
};
