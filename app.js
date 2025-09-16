/*
 * 设备管理小程序
 * Copyright (c) 2024 设备管理小程序开发团队
 * 基于MIT许可证开源，详情参见LICENSE文件
 */

// 核心依赖导入 - 仅导入非云相关模块
const { generateEquipmentId } = require('./models/equipment.js');
const themeConfig = require('./models/theme.js').default;
const { AppUtils } = require('./utils/AppUtils.js'); // 保留导入的工具类

// ==========================
// 配置常量 - 集中管理可配置项
// ==========================
const CONFIG = {
  CLOUD_ENV: "cloudbase-5gx4izq3da5eda5e", // 云环境ID
  STORAGE_KEYS: {
    EQUIPMENT: 'equipmentList',
    USER_INFO: 'userInfo',
    LAST_SYNC: 'lastSyncTime',
    DATA_CHANGED: 'dataChanged',
    LOCAL_CHANGES: 'localChanges',
    RECYCLE_BIN: 'recycleBin',
    OP_LOGS: 'operationLogs',
    APP_SETTINGS: 'appSettings'
  },
  SYNC_STATUSES: {
    IDLE: 'idle',
    SYNCING: 'syncing',
    SUCCESS: 'success',
    FAILED: 'failed',
    PENDING: 'pending'
  },
  OPERATION_TYPES: ['添加', '更新', '借出', '归还', '删除', '永久删除']
};

// ==========================
// 全局事件总线 - 独立模块
// ==========================
class EventBus {
  constructor() {
    this.events = Object.create(null);
  }

  on(event, callback) {
    if (typeof callback !== 'function') return;
    this.events[event] = this.events[event] || [];
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (!this.events[event]) return;
    if (callback) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    } else {
      this.events[event] = [];
    }
  }

  emit(event, data) {
    if (!this.events[event]) return;
    [...this.events[event]].forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`事件[${event}]触发失败`, err);
      }
    });
  }
}

// ==========================
// 主题管理器 - 独立模块
// ==========================
class ThemeManager {
  constructor(app) {
    this.app = app;
    this.themeConfig = themeConfig;
    this.init();
  }

  init() {
    const settings = AppUtils.storage(CONFIG.STORAGE_KEYS.APP_SETTINGS) || {};
    this.theme = settings.theme || { ...this.themeConfig };
    AppUtils.storage(CONFIG.STORAGE_KEYS.APP_SETTINGS, { ...settings, theme: this.theme });
    this.app.globalData.theme = this.theme;
    this.bindSystemThemeChange();
    this.applyTheme();
  }

  bindSystemThemeChange() {
    wx.onThemeChange(res => {
      if (this.theme.mode === 'auto') {
        this.applyTheme({ systemDarkMode: res.theme === 'dark' });
      }
    });
  }

  applyTheme(customConfig = {}) {
    const theme = { ...this.theme, ...customConfig };
    let isDarkMode = false;

    switch (theme.mode) {
      case 'auto':
        isDarkMode = theme.systemDarkMode || false;
        break;
      case 'dark':
        isDarkMode = true;
        break;
      default:
        isDarkMode = false;
    }

    const safeConfig = this.themeConfig || { colorMap: {}, darkVars: {}, lightVars: {} };
    const colorConfig = safeConfig.colorMap[theme.color] || safeConfig.colorMap.blue || {};
    const vars = isDarkMode ? safeConfig.darkVars : safeConfig.lightVars;

    wx.setNavigationBarColor({
      frontColor: isDarkMode ? '#ffffff' : '#000000',
      backgroundColor: vars?.bgPrimary || (isDarkMode ? '#1a1a1a' : '#ffffff')
    });

    wx.setBackgroundColor({
      backgroundColor: vars?.bgPrimary,
      backgroundColorTop: vars?.bgPrimary,
      backgroundColorBottom: vars?.bgPrimary
    });

    this.app.globalData.theme = { ...theme, isDarkMode };
    this.notifyPages(isDarkMode, colorConfig);
  }

  notifyPages(isDarkMode, colorConfig) {
    getCurrentPages().forEach(page => {
      if (typeof page.onThemeChange === 'function') {
        page.onThemeChange(isDarkMode, colorConfig);
      }
    });
  }
}

// ==========================
// 核心应用类
// ==========================
App({
  // 提供全局配置访问
  CONFIG: CONFIG,
  
  // 提供工具类访问
  utils: AppUtils,
  
  // 初始化入口 - 确保云初始化优先
  onLaunch() {
    // 1. 初始化全局数据（不含云相关）
    this.initGlobalData();
    // 2. 初始化事件总线
    this.initEventBus();
    // 3. 优先初始化云环境（关键修复）
    this.initCloud().then(() => {
      // 4. 云初始化成功后才加载SyncManager并继续初始化
      this.loadSyncManager();
      this.initStorage();
      this.initThemeManager();
      this.initSyncFlow();
    }).catch(() => {
      // 5. 云初始化失败仍继续初始化其他功能（降级处理）
      this.initStorage();
      this.initThemeManager();
      AppUtils.showFeedback('云服务不可用，部分功能受限', 'warning');
    });
  },

  // 1. 初始化全局数据
  initGlobalData() {
    this.globalData = {
      cloudInitialized: false,
      userInfo: null,
      equipmentList: [],
      syncStatus: CONFIG.SYNC_STATUSES.IDLE,
      lastSyncTime: null,
      dataChanged: false,
      theme: null,
      isGuest: false,
      isAdmin: false,
      activityLog: []
    };
  },

  // 2. 初始化事件总线
  initEventBus() {
    this.globalEvent = new EventBus();
  },

  // 3. 云环境初始化（返回Promise确保异步初始化完成）
  initCloud() {
    return new Promise((resolve, reject) => {
      if (!wx.cloud) {
        console.error('请升级基础库以支持云能力');
        this.globalData.cloudInitialized = false;
        reject(new Error('云能力不支持'));
        return;
      }

      try {
        wx.cloud.init({
          traceUser: true,
          env: CONFIG.CLOUD_ENV
        });
        console.log('云环境初始化成功');
        this.globalData.cloudInitialized = true;
        resolve();
      } catch (error) {
        console.error('云环境初始化失败', error);
        this.globalData.cloudInitialized = false;
        reject(error);
      }
    });
  },

  // 4. 延迟加载SyncManager（关键修复：确保在云初始化后加载）
  loadSyncManager() {
    // 此时wx.cloud.init已完成，安全加载SyncManager
    this.syncManager = require('./utils/syncManager.js');
  },

  // 5. 初始化本地存储 - 修复数组空值判断
  initStorage() {
    // 修复：确保equipmentList是数组（使用safeArray）
    const storedEquipment = AppUtils.storage(CONFIG.STORAGE_KEYS.EQUIPMENT, undefined, 'array');
    this.globalData.equipmentList = AppUtils.safeArray(storedEquipment);
    
    this.globalData.userInfo = AppUtils.storage(CONFIG.STORAGE_KEYS.USER_INFO) || null;
    this.globalData.lastSyncTime = AppUtils.storage(CONFIG.STORAGE_KEYS.LAST_SYNC) || null;
    this.globalData.dataChanged = AppUtils.storage(CONFIG.STORAGE_KEYS.DATA_CHANGED) || false;

    // 修复：确保operationLogs是数组（使用safeArray）
    const storedLogs = AppUtils.storage(CONFIG.STORAGE_KEYS.OP_LOGS, undefined, 'array');
    this.globalData.activityLog = AppUtils.safeArray(storedLogs);

    const user = this.globalData.userInfo;
    this.globalData.isGuest = user?.isGuest || false;
    this.globalData.isAdmin = user?.role === 'admin' || false;

    // 确保本地变更和回收站为数组类型 - 修复null值处理
    [CONFIG.STORAGE_KEYS.LOCAL_CHANGES, CONFIG.STORAGE_KEYS.RECYCLE_BIN].forEach(key => {
      const data = AppUtils.storage(key, undefined, 'array');
      const safeData = AppUtils.safeArray(data);
      // 修复：避免访问null的length属性
      if (safeData.length !== (data ? data.length : 0)) {
        AppUtils.storage(key, [], 'array');
      }
    });
  },

  // 6. 初始化主题管理器
  initThemeManager() {
    this.themeManager = new ThemeManager(this);
  },

  // 7. 初始化同步流程
  initSyncFlow() {
    if (!this.syncManager) return;
    
    this.checkLoginStatus().then(isLoggedIn => {
      if (isLoggedIn && AppUtils.checkCloudInitialized(this)) {
        setTimeout(() => this.syncData({ silent: true }), 1000);
      }
    });
  },

  // ==========================
  // 核心业务方法
  // ==========================
  checkLoginStatus() {
    return new Promise(resolve => {
      const user = this.globalData.userInfo;
      if (!user?.token) {
        resolve(false);
        return;
      }

      if (!AppUtils.checkCloudInitialized(this)) {
        resolve(false);
        return;
      }

      wx.cloud.callFunction({
        name: 'user',
        data: { action: 'verifyToken', token: user.token },
        success: res => {
          if (res.result?.success && res.result?.valid) {
            resolve(true);
          } else {
            this.clearLoginStatus();
            resolve(false);
          }
        },
        fail: err => {
          console.error('登录状态验证失败', err);
          resolve(false);
        }
      });
    });
  },

  findEquipmentById(id) {
    if (!id) {
      console.error('设备ID不能为空');
      return null;
    }
    // 安全处理数组查找
    return AppUtils.safeArray(this.globalData.equipmentList).find(item => item.id === id) || null;
  },

  getEquipmentList() {
    // 返回数组的副本，避免直接修改源数据
    return [...AppUtils.safeArray(this.globalData.equipmentList)];
  },

  saveEquipmentList(list) {
    // 确保存储的是数组
    const safeList = AppUtils.safeArray(list);
    this.globalData.equipmentList = safeList;
    AppUtils.storage(CONFIG.STORAGE_KEYS.EQUIPMENT, safeList, 'array');
    return safeList;
  },

  handleEquipmentOperation(operation, id, data = {}) {
    const list = this.getEquipmentList();
    const operator = this.globalData.userInfo?.username || '未知用户';
    let result = null;

    switch (operation) {
      case 'add':
        const newId = generateEquipmentId(data.type);
        result = {
          id: newId,
          createTime: AppUtils.formatTime(),
          updateTime: AppUtils.formatTime(),
          status: '在库',
          isSynced: false,
          ...data
        };
        list.unshift(result);
        this._logOperation('添加', operator, newId, data.name, data.quantity);
        this._markChange('add', newId, result);
        break;

      case 'update':
        const index = AppUtils.safeArray(list).findIndex(item => item.id === id);
        if (index === -1) return false;
        const oldData = list[index];
        const opType = this._getUpdateOperationType(oldData.status, data.status);
        result = { ...oldData, ...data, updateTime: AppUtils.formatTime(), isSynced: false };
        list[index] = result;
        this._logOperation(opType, operator, id, result.name, result.quantity);
        this._markChange('update', id, result);
        break;

      case 'delete':
        result = this.handleEquipmentOperation('update', id, {
          isDeleted: true,
          status: '已删除',
          isSynced: false
        });
        if (result) {
          this._logOperation('删除', operator, id, result.name, result.quantity);
          this._markChange('delete', id);
        }
        break;

      case 'permanent_delete':
        const oldItem = this.findEquipmentById(id);
        if (!oldItem) return false;
        // 安全过滤数组
        const filtered = AppUtils.safeArray(list).filter(item => item.id !== id);
        this.saveEquipmentList(filtered);
        this._logOperation('永久删除', operator, id, oldItem.name, oldItem.quantity);
        this._markChange('permanent_delete', id);
        result = true;
        break;
    }

    if (operation !== 'permanent_delete') {
      this.saveEquipmentList(list);
    }

    // 通知设备列表已更新
    this.globalEvent.emit('equipmentUpdated', { data: this.globalData.equipmentList });

    if (this.syncManager) {
      this.syncData({ silent: true }).catch(err => 
        console.error(`${operation}后同步失败`, err)
      );
    }

    return result;
  },

  // ==========================
  // 内部辅助方法
  // ==========================
  _logOperation(type, operator, id, name, quantity) {
    if (!CONFIG.OPERATION_TYPES.includes(type)) return;

    const log = {
      id: Date.now().toString(),
      content: `${operator} ${type}了 ${name}`,
      operator,
      type,
      equipmentId: id,
      equipmentName: name,
      quantity: quantity || 1,
      time: AppUtils.formatTime()
    };

    // 安全处理日志数组
    const logs = AppUtils.storage(CONFIG.STORAGE_KEYS.OP_LOGS, undefined, 'array');
    const newLogs = [log, ...logs].slice(0, 100);
    AppUtils.storage(CONFIG.STORAGE_KEYS.OP_LOGS, newLogs, 'array');

    this.globalData.activityLog.unshift({ ...log, createTime: log.time });
  },

  _markChange(type, id, data = {}) {
    this.globalData.dataChanged = true;
    this.globalData.syncStatus = CONFIG.SYNC_STATUSES.PENDING;
    AppUtils.storage(CONFIG.STORAGE_KEYS.DATA_CHANGED, true);
    AppUtils.storage(CONFIG.STORAGE_KEYS.SYNC_STATUS, CONFIG.SYNC_STATUSES.PENDING);
    
    if (this.syncManager) {
      this.syncManager.markDataChanged({ type, id, data });
    }
  },

  _getUpdateOperationType(oldStatus, newStatus) {
    if (newStatus === '借出' && oldStatus !== '借出') return '借出';
    if (newStatus === '在库' && oldStatus === '借出') return '归还';
    return '更新';
  },

  // ==========================
  // 同步相关方法
  // ==========================
  async syncData({ silent = true } = {}) {
    if (!this.syncManager || !AppUtils.checkCloudInitialized(this)) {
      if (!silent) {
        AppUtils.showFeedback('云服务未初始化，无法同步', 'error');
      }
      return { success: false, message: '云服务未初始化' };
    }

    if (this.globalData.syncStatus === CONFIG.SYNC_STATUSES.SYNCING) {
      return { success: false, message: '正在同步中' };
    }

    this.globalData.syncStatus = CONFIG.SYNC_STATUSES.SYNCING;
    this.globalEvent.emit('syncStatusChanged', { status: CONFIG.SYNC_STATUSES.SYNCING });
    if (!silent) wx.showLoading({ title: '同步中...', mask: true });

    try {
      const success = await this.syncManager.fullSync();
      if (!success) throw new Error('同步未完成');

      const now = AppUtils.formatTime();
      this.globalData.lastSyncTime = now;
      this.globalData.syncStatus = CONFIG.SYNC_STATUSES.SUCCESS;
      this.globalData.dataChanged = false;
      
      AppUtils.storage(CONFIG.STORAGE_KEYS.LAST_SYNC, now);
      AppUtils.storage(CONFIG.STORAGE_KEYS.SYNC_STATUS, CONFIG.SYNC_STATUSES.SUCCESS);
      AppUtils.storage(CONFIG.STORAGE_KEYS.DATA_CHANGED, false);

      this.globalEvent.emit('syncStatusChanged', {
        status: CONFIG.SYNC_STATUSES.SUCCESS,
        pendingChanges: this.syncManager.getLocalChanges().length
      });

      if (!silent) {
        wx.hideLoading();
        AppUtils.showFeedback('同步成功', 'success');
      }

      return { success: true, message: '同步完成' };
    } catch (err) {
      this.globalData.syncStatus = CONFIG.SYNC_STATUSES.FAILED;
      this.globalEvent.emit('syncStatusChanged', {
        status: CONFIG.SYNC_STATUSES.FAILED,
        error: err.message,
        pendingChanges: this.syncManager?.getLocalChanges().length || 0
      });

      if (!silent) {
        wx.hideLoading();
        AppUtils.showFeedback('同步失败', 'error');
      }

      console.error('同步失败', err);
      AppUtils.storage(CONFIG.STORAGE_KEYS.SYNC_STATUS, CONFIG.SYNC_STATUSES.FAILED);
      return { success: false, message: err.message || '同步失败' };
    }
  },

  // ==========================
  // 其他辅助方法
  // ==========================
  clearLoginStatus() {
    this.globalData.userInfo = null;
    this.globalData.isGuest = false;
    this.globalData.isAdmin = false;
    AppUtils.storage(CONFIG.STORAGE_KEYS.USER_INFO, null);
  },

  getRecycleBin() {
    return AppUtils.storage(CONFIG.STORAGE_KEYS.RECYCLE_BIN, undefined, 'array');
  },

  saveRecycleBin(data) {
    return AppUtils.storage(CONFIG.STORAGE_KEYS.RECYCLE_BIN, data, 'array');
  }
});
