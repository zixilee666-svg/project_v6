# Academic Hub v4.0 - 使用说明书

## 🚀 快速开始

### 访问地址
**生产环境**: https://academic-hub-v4-dcdlrsek.edgeone.cool

### 默认登录凭证
```
用户名: admin
密码: 123456
```

---

## 📁 项目结构

```
academic-hub-v4/
├── edge-functions/           # Edge Functions (V8 Runtime)
│   ├── api/
│   │   ├── auth/           # 认证 API
│   │   │   ├── login.js    # POST /api/auth/login
│   │   │   ├── register.js # POST /api/auth/register
│   │   │   ├── me.js       # GET /api/auth/me
│   │   │   └── logout.js   # POST /api/auth/logout
│   │   ├── papers/         # 论文 API
│   │   ├── projects/       # 项目 API
│   │   ├── libraries/      # 文献库 API
│   │   ├── settings/       # 设置 API
│   │   ├── stats/          # 统计 API
│   │   └── search/         # 搜索 API
│   └── lib/
│       ├── kv.js           # KV 存储工具
│       ├── jwt.js          # JWT 认证工具
│       └── cors.js         # HTTP 响应工具
├── cloud-functions/         # Cloud Functions (Node.js)
│   └── api/ai.js          # AI 对话 API (SSE)
├── src/                    # React 19 前端
├── dist/                   # 构建产物
├── pages.config.json       # EdgeOne 配置文件
└── package.json
```

---

## 🔧 本地开发

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 访问
打开浏览器访问 http://localhost:5173

### 4. Mock 模式说明
- 默认使用 Mock 模式，无需后端即可运行
- 如需连接真实后端，设置环境变量:
```bash
VITE_MOCK_MODE=false
VITE_API_URL=http://localhost:8787
```

---

## 🌐 部署到 EdgeOne

### 前置要求
- EdgeOne 账户
- EdgeOne CLI 已安装 (`npm install -g edgeone`)

### 部署步骤

```bash
# 1. 进入项目目录
cd academic-hub-v4

# 2. 登录 EdgeOne (如果未登录)
edgeone login

# 3. 部署
npm run deploy
```

### 配置 KV Storage

部署后需要在 EdgeOne 控制台配置 KV Storage:

1. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)
2. 进入 KV Storage 创建命名空间
3. 绑定到项目，环境变量名: `ACADEMIC_KV`
4. 重新部署使配置生效

### 配置环境变量

```bash
# 设置环境变量
edgeone pages env add JWT_SECRET "your-secret-key"
edgeone pages env add ADMIN_USERNAME "admin"
edgeone pages env add ADMIN_PASSWORD "123456"
```

---

## 📡 API 文档

### 认证 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/register | 用户注册 |
| GET | /api/auth/me | 获取当前用户 |
| POST | /api/auth/logout | 用户登出 |

#### 登录示例
```bash
curl -X POST https://academic-hub-v4-dcdlrsek.edgeone.cool/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
```

#### 响应示例
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "admin-fixed",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

### 论文 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/papers | 获取论文列表 |
| POST | /api/papers | 创建论文 |
| GET | /api/papers/:id | 获取论文详情 |
| PUT | /api/papers/:id | 更新论文 |
| DELETE | /api/papers/:id | 删除论文 |
| POST | /api/papers/:id/favorite | 切换收藏 |

### 项目 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/projects | 获取项目列表 |
| POST | /api/projects | 创建项目 |
| GET | /api/projects/:id | 获取项目详情 |
| PUT | /api/projects/:id | 更新项目 |
| DELETE | /api/projects/:id | 删除项目 |

### 文献库 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/libraries | 获取文献库列表 |
| POST | /api/libraries | 创建文献库 |
| GET | /api/libraries/:id | 获取文献库详情 |
| PUT | /api/libraries/:id | 更新文献库 |
| DELETE | /api/libraries/:id | 删除文献库 |

### 设置 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/settings | 获取用户设置 |
| PUT | /api/settings | 更新用户设置 |

### 统计 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/stats/reading | 获取阅读统计 |

### 搜索 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/search/arxiv?query=xxx | 搜索 arXiv 论文 |

### AI 对话 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/chat | 发送消息 (SSE 流式) |

---

## 🔐 认证说明

除 `/api/auth/login` 和 `/api/auth/register` 外，所有 API 需要认证。

在请求头中添加:
```
Authorization: Bearer <token>
```

---

## 🛠 故障排除

### 1. KV Storage 未配置
如果遇到数据无法保存，检查:
- KV 命名空间是否已创建
- 是否绑定到项目
- 环境变量 `ACADEMIC_KV` 是否设置

### 2. CORS 错误
确保请求头中包含 `Content-Type: application/json`

### 3. Token 过期
JWT Token 默认 7 天过期，重新登录获取新 Token

### 4. 部署失败
```bash
# 清理并重新部署
rm -rf dist
npm run deploy
```

---

## 📝 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 4.0.0 | 2026-04-26 | 全栈重构，Edge Functions + Cloud Functions |
| 3.0.0 | 2026-04-20 | 增强功能版本 |
| 2.0.0 | 2026-04-15 | 前后端分离版本 |

---

## 📞 支持

如有问题，请联系开发者或提交 Issue。

---

*Academic Hub v4.0 - 构建于 EdgeOne 边缘计算平台*
