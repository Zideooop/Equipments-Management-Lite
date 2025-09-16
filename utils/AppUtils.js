// 应用工具类 - 提供通用工具方法
const AppUtils = {
  /**
   * 安全处理数组，防止null/undefined导致的错误
   * @param {Array} arr - 要处理的数组
   * @returns {Array} 安全的数组，如果输入为null/undefined则返回空数组
   */
  safeArray(arr) {
    if (!Array.isArray(arr)) {
      return [];
    }
    return arr;
  },

  /**
   * 本地存储操作封装
   * @param {string} key - 存储键名
   * @param {any} value - 要存储的值，不传则为获取操作
   * @param {string} type - 数据类型，可选值：'array', 'object'
   * @returns {any} 存储的值或操作结果
   */
  storage(key, value, type) {
    if (typeof value !== 'undefined') {
      // 存储操作
      try {
        let storageValue = value;
        if (type === 'array' || type === 'object') {
          storageValue = JSON.stringify(value);
        }
        wx.setStorageSync(key, storageValue);
        return true;
      } catch (e) {
        console.error(`存储${key}失败:`, e);
        return false;
      }
    } else {
      // 获取操作
      try {
        const value = wx.getStorageSync(key);
        if (value) {
          if (type === 'array') {
            return this.safeArray(JSON.parse(value));
          } else if (type === 'object') {
            return JSON.parse(value) || {};
          }
          return value;
        }
        return null;
      } catch (e) {
        console.error(`获取${key}失败:`, e);
        return null;
      }
    }
  },

  /**
   * 安全的存储操作封装
   * @param {string} operation - 操作类型 get/set/remove
   * @param {string} key - 存储键名
   * @param {any} value - 存储值，get/remove操作可不传
   * @param {string} type - 数据类型 array/object
   * @returns {any} 操作结果
   */
  safeStorageOperation(operation, key, value, type) {
    try {
      switch (operation) {
        case 'get':
          return this.storage(key, undefined, type);
        case 'set':
          return this.storage(key, value, type);
        case 'remove':
          wx.removeStorageSync(key);
          return true;
        default:
          return false;
      }
    } catch (e) {
      console.error(`存储操作${operation} ${key}失败:`, e);
      return false;
    }
  },

  /**
   * 格式化日期
   * @param {Date|string} date - 日期对象或字符串
   * @param {string} format - 格式化字符串，如 'yyyy-MM-dd hh:mm:ss'
   * @returns {string} 格式化后的日期字符串
   */
  formatDate(date, format = 'yyyy-MM-dd hh:mm:ss') {
    if (!date) return '';
    if (typeof date === 'string') {
      date = new Date(date);
    }
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }

    const o = {
      'M+': date.getMonth() + 1,
      'd+': date.getDate(),
      'h+': date.getHours(),
      'm+': date.getMinutes(),
      's+': date.getSeconds(),
      'q+': Math.floor((date.getMonth() + 3) / 3),
      'S': date.getMilliseconds()
    };

    if (/(y+)/.test(format)) {
      format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
    }

    for (const k in o) {
      if (new RegExp('(' + k + ')').test(format)) {
        format = format.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)));
      }
    }

    return format;
  }
};

module.exports = {
  AppUtils
};
