const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const crypto = require('crypto');

// 密码加密（与前端统一）
const encryptPassword = (password) => {
  return crypto.createHash('md5').update(password).digest('hex');
};

// 处理注册
const handleRegister = async (params) => {
  const { username, password } = params;
  
  // 检查用户名是否已存在
  const user = await db.collection('users')
    .where({ username })
    .get();
    
  if (user.data.length > 0) {
    return { success: false, message: '用户名已存在' };
  }
  
  // 创建新用户
  await db.collection('users').add({
    data: {
      username,
      password,
      role: '普通用户',
      createTime: new Date().toISOString(),
      lastLoginTime: null,
      token: null,
      tokenExpireTime: null
    }
  });
  
  return { success: true, message: '注册成功' };
};

// 处理登录
const handleLogin = async (params) => {
  const { username, password, code, userInfo } = params;
  const wxContext = cloud.getWXContext();
  
  // 账号密码登录
  if (username && password) {
    const user = await db.collection('users')
      .where({ username })
      .get();

    if (user.data.length === 0) {
      return { success: false, message: '用户名不存在' };
    }

    const storedUser = user.data[0];
    if (storedUser.password !== password) {
      return { success: false, message: '密码错误' };
    }

    // 生成登录token
    const token = crypto.randomUUID();
    const tokenExpireTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    await db.collection('users')
      .doc(storedUser._id)
      .update({
        data: { 
          token, 
          tokenExpireTime,
          lastLoginTime: new Date().toISOString()
        }
      });

    return {
      success: true,
      userInfo: {
        id: storedUser._id,
        username: storedUser.username,
        nickName: storedUser.nickName || username,
        role: storedUser.role || '普通用户',
        token
      }
    };
  }

  // 微信快捷登录
  if (code && userInfo) {
    // 调用微信接口获取openid
    const wxRes = await cloud.openapi.login.code2Session({ code });
    
    // 查找是否已存在该用户
    const user = await db.collection('users')
      .where({ openid: wxRes.openid })
      .get();

    let userId;
    // 新用户自动注册
    if (user.data.length === 0) {
      const res = await db.collection('users').add({
        data: {
          openid: wxRes.openid,
          username: `wx_${wxRes.openid.slice(0, 8)}`,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          role: '普通用户',
          password: encryptPassword(Math.random().toString(36).slice(-8)), // 随机密码
          createTime: new Date().toISOString(),
          lastLoginTime: new Date().toISOString()
        }
      });
      userId = res._id;
    } else {
      userId = user.data[0]._id;
      // 更新用户信息
      await db.collection('users').doc(userId).update({
        data: { 
          nickName: userInfo.nickName, 
          avatarUrl: userInfo.avatarUrl,
          lastLoginTime: new Date().toISOString()
        }
      });
    }

    // 生成token
    const token = crypto.randomUUID();
    const tokenExpireTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await db.collection('users').doc(userId).update({
      data: { token, tokenExpireTime }
    });

    const userData = await db.collection('users').doc(userId).get();
    return {
      success: true,
      userInfo: {
        id: userId,
        username: userData.data.username,
        nickName: userData.data.nickName,
        role: userData.data.role,
        avatarUrl: userData.data.avatarUrl,
        token
      }
    };
  }

  return { success: false, message: '缺少登录参数' };
}




;

// 处理密码重置
const handleResetPassword = async (params) => {
  const { username, newPassword } = params;
  
  const user = await db.collection('users')
    .where({ username })
    .get();
    
  if (user.data.length === 0) {
    return { success: false, message: '用户名不存在' };
  }
  
  await db.collection('users')
    .where({ username })
    .update({
      data: { 
        password: newPassword,
        updateTime: new Date().toISOString()
      }
    });
    
  return { success: true, message: '密码重置成功' };
};

// 处理Token验证
const handleVerifyToken = async (params) => {
  const { token } = params;
  
  if (!token) return { success: true, valid: false, message: 'Token不能为空' };
  
  const result = await db.collection('users').where({ token }).get();
  
  if (result.data.length === 0) {
    return { success: true, valid: false, message: '无效的Token' };
  }
  
  // 检查Token是否过期
  const user = result.data[0];
  const now = new Date().getTime();
  const expireTime = new Date(user.tokenExpireTime).getTime();
  
  if (expireTime < now) {
    return { success: true, valid: false, message: 'Token已过期' };
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
};

// 检查用户是否存在
const handleCheckUserExists = async (params) => {
  const { username } = params;
  const user = await db.collection('users').where({ username }).get();
  return { 
    success: true, 
    exists: user.data.length > 0 
  };
};

// 入口函数
exports.main = async (event, context) => {
  const { action, ...params } = event;
  
  try {
    switch (action) {
      case 'register': 
        return handleRegister(params);
      case 'login': 
        return handleLogin(params);
      case 'resetPassword': 
        return handleResetPassword(params);
      case 'verifyToken': 
        return handleVerifyToken(params);
      case 'checkUserExists':
        return handleCheckUserExists(params);
      default: 
        return { success: false, message: '无效操作' };
    }
  } catch (err) {
    console.error('用户操作失败', err);
    return { success: false, message: '服务器异常' };
  }
};
