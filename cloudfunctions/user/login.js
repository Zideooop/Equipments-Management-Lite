// 在生成token的云函数中（如登录接口），延长过期时间（示例）
// cloudfunctions/user/login.js（假设存在）
const generateToken = (userId) => {
  const token = jwt.sign({ userId }, 'your-secret-key', {
    expiresIn: '7d' // 改为7天（默认可能较短，如1天）
  });
  return token;
};