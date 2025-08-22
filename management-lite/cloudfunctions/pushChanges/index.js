// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  traceUser: true,
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 生成Token
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const { username, password, code, userInfo } = event;
    
    // 如果提供了username和password，说明是账号密码登录
    if (username && password) {
      // 查询用户
      const userRes = await db.collection('users')
        .where({ username })
        .get();
        
      if (userRes.data.length === 0) {
        return { success: false, message: '用户名不存在' };
      }
      
      const user = userRes.data[0];
      
      // 验证密码（实际项目中应使用加密存储和验证）
      if (user.password !== password) {
        return { success: false, message: '密码错误' };
      }
      
      // 生成token
      const token = generateToken();
      // Token有效期7天
      const tokenExpireTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      // 更新最后登录时间和token
      await db.collection('users')
        .doc(user._id)
        .update({
          data: {
            lastLoginTime: new Date().toISOString(),
            token: token,
            tokenExpireTime: tokenExpireTime
          }
        });
        
      return {
        success: true,
        userInfo: {
          id: user._id,
          username: user.username,
          nickName: user.nickName || user.username,
          role: user.role || 'user',
          token: token,
          lastLoginTime: new Date().toISOString()
        }
      };
    }
    
    // 否则是微信登录
    if (code && userInfo) {
      // 查询用户是否已存在
      const result = await db.collection('users').where({
        openid: wxContext.OPENID
      }).get();
      
      let user;
      const token = generateToken();
      // Token有效期7天
      const tokenExpireTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      if (result.data.length > 0) {
        // 用户已存在，更新信息
        user = result.data[0];
        await db.collection('users').where({
          _id: user._id
        }).update({
          data: {
            lastLoginTime: new Date().toISOString(),
            token: token,
            tokenExpireTime: tokenExpireTime,
            ...(userInfo && {
              nickName: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl,
              gender: userInfo.gender
            })
          }
        });
        
        user = {
          ...user,
          lastLoginTime: new Date().toISOString(),
          token: token,
          tokenExpireTime: tokenExpireTime,
          ...(userInfo && {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender
          })
        };
      } else {
        // 用户不存在，创建新用户
        const newUser = {
          openid: wxContext.OPENID,
          username: 'wx_' + wxContext.OPENID.substring(0, 8),
          createTime: new Date().toISOString(),
          lastLoginTime: new Date().toISOString(),
          token: token,
          tokenExpireTime: tokenExpireTime,
          role: 'user', // 默认角色
          ...(userInfo && {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender
          })
        };
        
        const addResult = await db.collection('users').add({
          data: newUser
        });
        
        user = {
          ...newUser,
          _id: addResult._id
        };
      }
      
      return {
        success: true,
        userInfo: {
          id: user._id,
          username: user.username,
          nickName: user.nickName || '用户' + user._id.substring(0, 6),
          avatarUrl: user.avatarUrl,
          role: user.role,
          token: user.token,
          lastLoginTime: user.lastLoginTime
        }
      };
    }
    
    // 缺少必要参数
    return {
      success: false,
      message: '登录参数不完整'
    };
  } catch (error) {
    console.error('登录失败', error);
    return {
      success: false,
      message: error.message || '登录失败'
    };
  }
};
