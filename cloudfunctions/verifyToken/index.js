// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  traceUser: true,
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { token } = event;
    
    if (!token) {
      return {
        success: true,
        valid: false,
        message: 'Token不能为空'
      };
    }
    
    // 查询拥有该token的用户
    const result = await db.collection('users')
      .where({ token })
      .get();
      
    if (result.data.length === 0) {
      return {
        success: true,
        valid: false,
        message: '无效的Token'
      };
    }
    
    const user = result.data[0];
    const now = new Date();
    const expireTime = new Date(user.tokenExpireTime);
    
    // 检查Token是否过期
    if (now > expireTime) {
      return {
        success: true,
        valid: false,
        message: 'Token已过期'
      };
    }
    
    return {
      success: true,
      valid: true,
      userInfo: {
        id: user._id,
        username: user.username,
        nickName: user.nickName,
        role: user.role
      }
    };
  } catch (error) {
    console.error('验证Token失败', error);
    return {
      success: false,
      message: error.message || '验证Token失败'
    };
  }
};
