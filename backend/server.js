const express = require('express');
const cors = require('cors');
const { authenticator } = require('otplib');

const app = express();
const port = 3001;

// 允许跨域请求（开发环境，生产环境应限制来源）
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGIN || 'http://localhost:5173' 
    : true // 开发环境允许所有来源
}));

// Express 5.x 已内置 JSON 解析，无需 body-parser
app.use(express.json());

// 输入验证辅助函数
const validateInput = (token, secret, step, algorithm, digits) => {
  const errors = [];
  
  if (!token || typeof token !== 'string') {
    errors.push('token 必须是字符串');
  } else if (!new RegExp(`^\\d{${digits}}$`).test(token)) {
    errors.push(`token 必须是${digits}位数字`);
  }
  
  if (!secret || typeof secret !== 'string') {
    errors.push('secret 必须是字符串');
  } else if (secret.trim().length === 0) {
    errors.push('secret 不能为空');
  }
  
  if (step !== undefined) {
    const stepNum = parseInt(step);
    if (isNaN(stepNum) || stepNum < 5 || stepNum > 300) {
      errors.push('step 必须是5-300之间的整数');
    }
  }
  
  const validAlgorithms = ['sha1', 'sha256', 'sha512'];
  if (algorithm && !validAlgorithms.includes(algorithm)) {
    errors.push(`algorithm 必须是以下之一: ${validAlgorithms.join(', ')}`);
  }

  if (digits !== undefined) {
    const digitsNum = parseInt(digits);
    if (isNaN(digitsNum) || digitsNum < 6 || digitsNum > 10) {
      errors.push('digits 必须是6-10之间的整数');
    }
  }
  console.log('errors:', errors);
  return errors;
};

/**
 * 验证接口 endpoint
 * 接收前端发来的 token 以及生成该 token 所需的配置参数
 */
app.post('/api/verify', (req, res) => {
  const { token, secret, step, algorithm, digits } = req.body;

  console.log('收到验证请求:', { token, step, algorithm, digits });

  // 输入验证
  const validationErrors = validateInput(token, secret, step, algorithm, digits);
  if (validationErrors.length > 0) {
    return res.status(400).json({ 
      success: false, 
      message: '参数验证失败',
      errors: validationErrors
    });
  }

  try {
    // 1. 在服务端配置 otplib，确保与客户端参数一致
    authenticator.options = {
        step: parseInt(step) || 30,
        algorithm: algorithm || 'sha1',
        digits: parseInt(digits) || 6,
        window: 0  // 允许前后 1 个时间步长的误差，适应网络延迟和时钟偏移
      };

    // 2. 核心验证逻辑：检查客户端的 token 是否匹配服务端的计算结果
    // authenticator.check() 会自动使用当前服务端时间
    const isValid = authenticator.check(token, secret);

    if (isValid) {
      console.log('✅ 验证成功');
      res.json({ success: true, message: '验证通过！口令有效。' });
    } else {
      console.log('❌ 验证失败');
      res.json({ success: false, message: '验证失败！口令无效或已过期。' });
    }
  } catch (error) {
    console.error('验证出错:', error);
    res.status(500).json({ 
      success: false, 
      message: '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('未处理的错误:', err);
  res.status(500).json({ 
    success: false, 
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(port, () => {
  console.log(`后端验证服务已启动: http://localhost:${port}`);
});