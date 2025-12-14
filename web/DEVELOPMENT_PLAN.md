# Sliver Web UI 开发计划

## 项目目标

**将 Sliver CLI 全部功能转换为 Web 界面**，包括服务器管理命令和交互式操作功能，提供完整的 Web 管理体验。

## CLI 命令 → Web 功能对照表

基于 `/client/command/` 目录分析，以下是需要实现的功能：

### ✅ Phase 1-2: 基础管理功能

| CLI 命令 | Web 功能 | 说明 |
|---------|---------|------|
| `sessions` | Sessions 列表页 | 查看、选择、关闭 Session |
| `beacons` | Beacons 列表页 | 查看、删除 Beacon，任务管理 |
| `jobs` | Listeners 页面 | 查看运行中的 Listeners |
| `mtls/http/https/dns` | 启动 Listener 表单 | 创建各类型监听器 |
| `generate` | Implant 生成页 | 生成 Session/Beacon Implant |
| `profiles` | Profile 管理 | 创建、使用生成配置 |
| `implants` | Implant 列表 | 管理已生成的 Implant |

### ✅ Phase 3: 数据管理功能

| CLI 命令 | Web 功能 | 说明 |
|---------|---------|------|
| `hosts` | Hosts 页面 | 查看被控主机信息 |
| `loot` | Loot 页面 | 管理收集的战利品 |
| `creds` | Credentials 页面 | 管理凭据数据库 |
| `operators` | Operators 页面 | 管理操作员 |
| `websites` | 网站托管页面 | 管理 HTTP C2 静态内容 |

### ✅ Phase 4: 扩展管理功能

| CLI 命令 | Web 功能 | 说明 |
|---------|---------|------|
| `armory` | 扩展商店 | 安装/管理扩展和别名 |
| `c2profile` | C2 配置页 | 管理 HTTP C2 Profile |
| `certificates` | 证书管理 | 管理 TLS 证书 |
| `canaries` | Canary 管理 | 管理 DNS canary 检测 |

### ✅ Phase 5-6: 交互式功能 (WebSocket)

| CLI 命令 | Web 功能 | 技术方案 |
|---------|---------|---------|
| `shell` | Web 终端 | xterm.js + WebSocket 双向通信 |
| `execute` | 命令执行 | 异步任务 + 结果推送 |
| `execute-assembly` | .NET 程序集执行 | 文件上传 + 异步执行 |
| `screenshot` | 屏幕截图 | WebSocket 推送图片 |
| `download` | 文件下载 | 分块下载 + 进度条 |
| `upload` | 文件上传 | 分块上传 + 断点续传 |
| `portfwd` | 端口转发管理 | 转发规则 CRUD |
| `rportfwd` | 反向端口转发 | 转发规则 CRUD |
| `socks` | SOCKS 代理管理 | 代理启停 + 状态显示 |
| `privilege/*` | 权限提升 | 表单触发 + 结果展示 |
| `migrate` | 进程迁移 | 进程列表 + 确认迁移 |

### ✅ Phase 7: 高级交互功能

| CLI 命令 | Web 功能 | 技术方案 |
|---------|---------|---------|
| `ps` | 进程列表 | 实时进程树 |
| `ls/cd/pwd/mkdir/rm` | 文件浏览器 | 图形化文件管理器 |
| `ifconfig/netstat` | 网络信息 | 网络配置展示 |
| `info` | 系统信息 | 详细系统信息面板 |
| `whoami/getuid/getgid` | 用户信息 | 当前用户权限展示 |
| `env` | 环境变量 | 环境变量列表 |
| `registry` | 注册表 (Win) | 注册表浏览器 |

## 技术栈

### Frontend (client/)
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件**: shadcn/ui + TailwindCSS
- **状态管理**: TanStack Query + Zustand
- **表单**: React Hook Form + Zod
- **路由**: React Router v6
- **终端模拟**: xterm.js + xterm-addon-fit
- **文件管理**: react-dropzone

### BFF Server (server/)
- **语言**: Go
- **HTTP 框架**: Gin
- **WebSocket**: gorilla/websocket
- **认证**: JWT (Web) + Sliver Config (gRPC)
- **文件传输**: 分块流式处理

## 架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │  REST API   │  │  WebSocket  │  │  xterm.js   │                  │
│  │  (管理操作)  │  │  (事件/交互) │  │  (终端)     │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
└─────────┼────────────────┼────────────────┼─────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Go BFF Server                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │  REST API   │  │  WS Manager │  │  Stream     │                  │
│  │  Handlers   │  │  (事件分发)  │  │  Handler    │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                          │
│         └────────────────┴────────────────┘                          │
│                          │                                           │
│                    ┌─────┴─────┐                                     │
│                    │ gRPC Pool │                                     │
│                    └─────┬─────┘                                     │
└──────────────────────────┼──────────────────────────────────────────┘
                           │ mTLS
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Sliver Server                                   │
│                    (gRPC + Events)                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## 目录结构

```
/Users/eric/work/sliver/web/
├── client/                     # React 前端
│   ├── src/
│   │   ├── components/         # UI 组件
│   │   │   ├── ui/            # shadcn/ui
│   │   │   ├── layout/        # 布局
│   │   │   ├── sessions/      # Session 组件
│   │   │   ├── beacons/       # Beacon 组件
│   │   │   ├── listeners/     # Listener 组件
│   │   │   ├── implants/      # Implant 组件
│   │   │   ├── terminal/      # xterm.js 终端
│   │   │   ├── files/         # 文件浏览器
│   │   │   └── process/       # 进程管理
│   │   ├── pages/             # 页面
│   │   ├── api/               # API 客户端
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── stores/            # Zustand 状态
│   │   └── types/             # TypeScript 类型
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Go BFF
│   ├── main.go
│   ├── handlers/              # HTTP 处理器
│   │   ├── auth.go
│   │   ├── sessions.go
│   │   ├── beacons.go
│   │   ├── jobs.go
│   │   ├── implants.go
│   │   ├── interactive.go     # 交互式命令
│   │   └── files.go           # 文件传输
│   ├── middleware/            # 中间件
│   ├── rpc/                   # gRPC 客户端
│   └── ws/                    # WebSocket 管理
│       ├── hub.go             # 连接管理
│       ├── shell.go           # Shell 流
│       └── events.go          # 事件分发
│
└── Makefile
```

## API 设计

### REST Endpoints

```
# 认证
POST   /api/v1/auth/login
GET    /api/v1/auth/me

# Sessions
GET    /api/v1/sessions
GET    /api/v1/sessions/:id
DELETE /api/v1/sessions/:id

# Beacons
GET    /api/v1/beacons
GET    /api/v1/beacons/:id
DELETE /api/v1/beacons/:id
GET    /api/v1/beacons/:id/tasks

# Listeners
GET    /api/v1/jobs
DELETE /api/v1/jobs/:id
POST   /api/v1/listeners/mtls
POST   /api/v1/listeners/http
POST   /api/v1/listeners/https
POST   /api/v1/listeners/dns
POST   /api/v1/listeners/wg

# Implants
GET    /api/v1/implants
DELETE /api/v1/implants/:name
POST   /api/v1/generate
POST   /api/v1/generate/beacon
GET    /api/v1/profiles
POST   /api/v1/profiles

# Hosts
GET    /api/v1/hosts
DELETE /api/v1/hosts/:id
GET    /api/v1/hosts/:id/iocs

# Loot
GET    /api/v1/loot
POST   /api/v1/loot
GET    /api/v1/loot/:id
DELETE /api/v1/loot/:id

# Credentials
GET    /api/v1/credentials
POST   /api/v1/credentials
DELETE /api/v1/credentials/:id

# Operators
GET    /api/v1/operators

# Websites
GET    /api/v1/websites
POST   /api/v1/websites
DELETE /api/v1/websites/:name

# 交互式命令 (Session/Beacon)
POST   /api/v1/sessions/:id/execute      # execute
POST   /api/v1/sessions/:id/screenshot   # screenshot
GET    /api/v1/sessions/:id/ps           # ps
POST   /api/v1/sessions/:id/ls           # ls
POST   /api/v1/sessions/:id/cd           # cd
POST   /api/v1/sessions/:id/download     # download (启动)
POST   /api/v1/sessions/:id/upload       # upload (启动)
GET    /api/v1/sessions/:id/info         # info
GET    /api/v1/sessions/:id/ifconfig     # ifconfig
GET    /api/v1/sessions/:id/netstat      # netstat

# 端口转发
GET    /api/v1/sessions/:id/portfwd
POST   /api/v1/sessions/:id/portfwd
DELETE /api/v1/sessions/:id/portfwd/:fwdId
GET    /api/v1/sessions/:id/rportfwd
POST   /api/v1/sessions/:id/rportfwd
DELETE /api/v1/sessions/:id/rportfwd/:fwdId

# SOCKS
GET    /api/v1/sessions/:id/socks
POST   /api/v1/sessions/:id/socks
DELETE /api/v1/sessions/:id/socks/:socksId

# 权限提升
POST   /api/v1/sessions/:id/privilege/getsystem
POST   /api/v1/sessions/:id/privilege/getprivs

# 进程操作
POST   /api/v1/sessions/:id/migrate
```

### WebSocket Endpoints

```
# 事件订阅
WS /ws/events
事件类型:
- session:connected / session:disconnected
- beacon:registered / beacon:checkin
- job:started / job:stopped
- task:completed

# Shell 交互 (双向流)
WS /ws/sessions/:id/shell
消息格式:
- { type: "stdin", data: "command\n" }
- { type: "stdout", data: "output..." }
- { type: "stderr", data: "error..." }
- { type: "resize", cols: 80, rows: 24 }

# 文件传输进度
WS /ws/transfers/:transferId
消息格式:
- { type: "progress", bytes: 1024, total: 10240 }
- { type: "complete" }
- { type: "error", message: "..." }
```

## 开发阶段

### Phase 1: 项目初始化 ✅
- [x] 创建前端项目 (Vite + React + TypeScript)
- [x] 配置 TailwindCSS + shadcn/ui
- [x] 创建 BFF Go 项目
- [x] 实现基础路由和布局

### Phase 2: 核心功能 ✅
- [x] 认证系统 (JWT + Sliver Config)
- [x] Sessions 页面 (列表、详情、关闭)
- [x] Beacons 页面 (列表、详情、任务)
- [x] Jobs/Listeners 页面 (查看、创建、停止)
- [x] Implants 页面 (列表、生成、Profiles)

### Phase 3: 数据管理 ✅
- [x] Hosts 页面
- [x] Loot 页面
- [x] Credentials 页面
- [x] Operators 页面
- [x] Websites 页面

### Phase 4: 扩展管理 ✅
- [x] Armory 扩展商店
- [x] C2 Profile 管理
- [x] 证书管理
- [x] Canaries 管理

### Phase 5: 实时功能 ✅
- [x] WebSocket 事件订阅
- [x] 实时状态更新
- [x] 通知系统 (Toast)

### Phase 6: 交互式功能 ✅
- [x] Web 终端 (xterm.js + WebSocket Shell)
- [x] 命令执行 (execute/execute-assembly)
- [x] 屏幕截图
- [x] 文件浏览器 (ls/cd/mkdir/rm)
- [x] 文件传输 (download/upload)
- [x] 进程管理 (ps/migrate)
- [x] 系统信息 (info/ifconfig/netstat)

### Phase 7: 网络功能 ✅
- [x] 端口转发管理
- [x] 反向端口转发
- [x] SOCKS 代理管理
- [x] 权限提升操作

### Phase 8: 优化完善 ✅
- [x] 主题切换 (深色/浅色)
- [x] 响应式设计 (移动端侧边栏, 自适应布局)
- [x] 错误处理 (Error Boundary)
- [x] 性能优化 (懒加载, 代码分割)
- [x] 国际化 (中/英) - react-i18next

## 核心技术实现

### 1. Shell WebSocket 实现

**BFF Server (Go)**:
```go
// ws/shell.go
func (h *ShellHandler) HandleShell(c *gin.Context) {
    sessionID := c.Param("id")

    // 升级为 WebSocket
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        return
    }
    defer conn.Close()

    // 创建 gRPC 流
    stream, err := h.rpc.Shell(context.Background())
    if err != nil {
        return
    }

    // 启动 Shell
    stream.Send(&sliverpb.ShellReq{
        Request: &commonpb.Request{SessionID: sessionID},
        Path:    "/bin/bash",
        EnablePTY: true,
    })

    // 双向转发
    go h.wsToGrpc(conn, stream)
    h.grpcToWs(stream, conn)
}
```

**Frontend (React)**:
```typescript
// components/terminal/ShellTerminal.tsx
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

export function ShellTerminal({ sessionId }: Props) {
    const termRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket>();

    useEffect(() => {
        const term = new Terminal();
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(termRef.current!);
        fitAddon.fit();

        // 连接 WebSocket
        const ws = new WebSocket(`ws://localhost:8080/ws/sessions/${sessionId}/shell`);
        wsRef.current = ws;

        ws.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            if (msg.type === 'stdout' || msg.type === 'stderr') {
                term.write(msg.data);
            }
        };

        term.onData((data) => {
            ws.send(JSON.stringify({ type: 'stdin', data }));
        });

        return () => {
            ws.close();
            term.dispose();
        };
    }, [sessionId]);

    return <div ref={termRef} className="h-full" />;
}
```

### 2. 文件传输实现

**分块上传**:
```typescript
// api/files.ts
export async function uploadFile(
    sessionId: string,
    remotePath: string,
    file: File,
    onProgress: (progress: number) => void
) {
    const CHUNK_SIZE = 1024 * 1024; // 1MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // 初始化上传
    const { transferId } = await api.post(`/sessions/${sessionId}/upload`, {
        path: remotePath,
        size: file.size,
    });

    // 分块上传
    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        await api.post(`/transfers/${transferId}/chunk`, chunk, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'X-Chunk-Index': i,
            },
        });

        onProgress((i + 1) / totalChunks * 100);
    }

    // 完成上传
    await api.post(`/transfers/${transferId}/complete`);
}
```

### 3. gRPC 连接池

```go
// rpc/pool.go
type ClientPool struct {
    clients map[string]*Client
    mu      sync.RWMutex
}

func (p *ClientPool) GetClient(configPath string) (*Client, error) {
    p.mu.RLock()
    if client, ok := p.clients[configPath]; ok {
        p.mu.RUnlock()
        return client, nil
    }
    p.mu.RUnlock()

    p.mu.Lock()
    defer p.mu.Unlock()

    client, err := NewClient(configPath)
    if err != nil {
        return nil, err
    }

    p.clients[configPath] = client
    return client, nil
}
```

## 页面设计

### Dashboard
- Session/Beacon/Listener 数量统计
- 最近活动时间线
- 系统状态

### Sessions/Beacons 列表
- 表格列表：ID、Name、OS、User、Host、Last Check-in
- 操作：查看详情、Shell、截图、关闭
- 筛选：按 OS、状态

### Session/Beacon 详情页
- 基本信息面板
- **交互标签页**:
  - Shell 终端
  - 文件浏览器
  - 进程列表
  - 网络信息
  - 截图历史
- **网络标签页**:
  - 端口转发列表
  - SOCKS 代理
- **操作标签页**:
  - 命令执行
  - 权限提升
  - 进程迁移

### Listeners
- 当前运行的 Jobs 列表
- 创建新 Listener 表单（mTLS/HTTP/HTTPS/DNS/WG）
- 停止 Listener

### Implants
- 已生成 Implant 列表
- Profiles 管理
- Generate 表单
