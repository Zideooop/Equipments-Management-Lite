class Equipment {
  /**
   * 器材数据模型
   * @param {Object} data - 器材数据
   */
  constructor(data) {
    // 生成器材ID的工具函数
    const generateEquipmentId = (type) => {
      const prefix = type ? type.substring(0, 2).toUpperCase() : 'EQ';
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `${prefix}${timestamp}${random}`;
    };
    
    // 基础属性
    this.id = data.id || generateEquipmentId(data.type);
    this.name = data.name || '';
    this.type = data.type || '';
    this.specification = data.specification || '';
    this.quantity = data.quantity || 1;
    this.location = data.location || '';
    this.status = data.status || '在库';
    this.remarks = data.remarks || '';
    
    // 借用相关属性
    this.borrower = data.borrower || '';
    this.contact = data.contact || '';
    this.borrowTime = data.borrowTime || '';
    this.returnTime = data.returnTime || '';
    this.returnActualTime = data.returnActualTime || '';
    
    // 时间属性
    this.createTime = data.createTime || new Date().toISOString();
    this.updateTime = data.updateTime || new Date().toISOString();
    
    // 同步状态
    this.isSynced = data.isSynced || false;
  }

  /**
   * 数据验证
   * @returns {Object} 验证结果
   */
  validate() {
    if (!this.name.trim()) {
      return { valid: false, message: '器材名称不能为空' };
    }
    
    if (!this.type.trim()) {
      return { valid: false, message: '请输入器材类型' };
    }
    
    if (this.quantity < 1 || isNaN(this.quantity)) {
      return { valid: false, message: '数量必须是大于0的数字' };
    }
    
    return { valid: true };
  }
}

module.exports = Equipment;
    