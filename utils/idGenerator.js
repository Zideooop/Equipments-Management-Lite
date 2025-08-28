const { generateRandomId } = require('./util');

/**
 * 生成器材ID
 * @param {string} type - 器材类型
 * @returns {string} 器材ID
 */
function generateEquipmentId(type) {
  // 类型缩写映射
  const typeAbbreviations = {
    '电脑': 'PC',
    '相机': 'CAM',
    '镜头': 'LEN',
    '三脚架': 'TRI',
    '麦克风': 'MIC',
    '录音笔': 'REC',
    '灯光': 'LIT',
    '电池': 'BAT',
    '充电器': 'CHG',
    '存储卡': 'MEM',
    '其他': 'OTH'
  };
  
  // 获取类型缩写，默认为OTH
  const abbr = typeAbbreviations[type] || 'OTH';
  
  // 生成时间戳部分（年月日）
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // 生成随机部分
  const randomStr = generateRandomId(4);
  
  // 组合成器材ID
  return `${abbr}-${dateStr}-${randomStr}`;
}

module.exports = {
  generateEquipmentId
};
    