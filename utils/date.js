// utils/date.js
module.exports = {
  formatDate: (dateString) => {
    if (!dateString) return '无记录';
    const date = new Date(dateString.replace(/-/g, '/')); // 兼容iOS
    if (isNaN(date.getTime())) return '无记录';
    return `${date.getFullYear()}年${
      (date.getMonth() + 1).toString().padStart(2, '0')
    }月${date.getDate().toString().padStart(2, '0')}日 ${
      date.getHours().toString().padStart(2, '0')
    }:${date.getMinutes().toString().padStart(2, '0')}`;
  }
};