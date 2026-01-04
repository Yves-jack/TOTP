# TOTP 双因素认证实验室

一个基于 React 的 TOTP（基于时间的一次性密码）交互式演示平台，帮助用户直观理解双因素认证的工作原理。

## 🌟 项目特性

- **实时 TOTP 生成**：动态显示当前有效的一次性密码
- **参数可调**：支持自定义密钥、时间步长、哈希算法和口令长度
- **移动端同步**：生成 QR 码供手机认证应用扫描
- **后端验证模拟**：模拟服务器验证流程
- **安全风险提示**：连续验证失败时的风险预警
- **响应式设计**：适配桌面和移动设备

## 📋 前置条件

- Node.js (v16 或更高版本)
- npm 或 yarn 包管理器
- 现代浏览器（支持 ES6+）

## 🚀 快速开始

### 安装依赖并启动服务

```bash
# 启动前端开发服务器
cd frontend
npm install
npm run dev

# 启动后端 API 服务器
cd ../backend
npm install
npm start
```

访问 `http://localhost:5173` 查看应用。

## 🏗️ 构建部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📁 项目结构

```
frontend/
├── src/
│   ├── App.jsx          # 主应用组件
│   └── main.jsx         # 应用入口
├── public/              # 静态资源
├── index.html           # HTML 模板
└── package.json         # 项目配置
```

## 🔧 技术栈

- **前端框架**：React 18
- **状态管理**：React Hooks
- **UI 组件**：Lucide React
- **TOTP 算法**：otplib
- **二维码生成**：qrcode.react
- **HTTP 客户端**：axios
- **样式**：Tailwind CSS

## 📝 使用说明

1. **生成密钥**：点击刷新按钮生成新的随机密钥
2. **调整参数**：修改时间步长、哈希算法或口令长度
3. **同步手机**：展开二维码，用认证应用扫描
4. **验证口令**：输入当前口令测试验证流程

## ⚠️ 注意事项

- 确保前后端服务器同时运行
- 手机扫描二维码时需保持时间同步
- 连续验证失败 5 次将触发安全预警

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进项目。

## 🔗 相关资源

- [RFC 6238 - TOTP 标准](https://tools.ietf.org/html/rfc6238)
- [otplib 文档](https://otplib.github.io/otplib/)
- [Google Authenticator](https://support.google.com/accounts/answer/1066447)
