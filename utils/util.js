// 通用工具函数

/**
 * 格式化日期时间
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateString) {
  if (!dateString) return '未知时间';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '未知时间';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}秒前`;
  else if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
  else if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
  else if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}天前`;
  else {
    const year = date.getFullYear();
    const month = padZero(date.getMonth() + 1);
    const day = padZero(date.getDate());
    return `${year}-${month}-${day}`;
  }
}

/**
 * 数字补零
 * @param {number} num - 数字
 * @returns {string} 补零后的字符串
 */
function padZero(num) {
  return num < 10 ? '0' + num : num;
}

/**
 * 生成随机ID
 * @param {number} length - ID长度
 * @returns {string} 随机ID
 */
function generateRandomId(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = {
  formatDate,
  padZero,
  generateRandomId
};
    