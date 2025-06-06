# API 迁移修正总结

## 修正概述

根据后端API文件 (`src/api/readme/`) 的接口定义，对前端API调用进行了以下修正：

## 1. 图谱API路径修正 (`src/api/graph.ts`)

### 修正内容：
- **路径更新**：将所有图谱API路径从 `/data/graph/*` 修正为 `/graph/*`

### 具体修改：
- `getGraphInfo()`: `/data/graph` → `/graph/`
- `getGraphNodes()`: `/data/graph/nodes` → `/graph/nodes`
- `getGraphNode()`: `/data/graph/node` → `/graph/node`
- `addEntitiesByJsonl()`: `/data/graph/add-by-jsonl` → `/graph/add-by-jsonl`
- `indexNodes()`: `/data/graph/index-nodes` → `/graph/index-nodes`
- `startIndexer()`: `/data/graph/start-indexer` → `/graph/start-indexer`
- `stopIndexer()`: `/data/graph/stop-indexer` → `/graph/stop-indexer`
- `getIndexerStatus()`: `/data/graph/indexer-status` → `/graph/indexer-status`
- `runIndexerNow()`: `/data/graph/run-indexer-now` → `/graph/run-indexer-now`

## 2. 聊天API参数修正 (`src/api/chat.ts`)

### 修正内容：
- **更新模型接口参数结构**：根据后端API定义调整参数传递方式

### 具体修改：
- `updateModels()`: 将参数改为查询参数形式，符合后端接口定义

## 3. 类型导入修正 (`src/api/index.ts`)

### 修正内容：
- **类型导入更新**：修正axios类型导入，使用正确的类型定义

### 具体修改：
- 将 `AxiosRequestConfig` 改为 `InternalAxiosRequestConfig`

## 4. 接口地址对照表

### 聊天API (`/chat`)
| 功能 | 前端调用 | 后端接口 | 状态 |
|------|----------|----------|------|
| 流式聊天 | `/chat/` | `/chat/` | ✅ 正确 |
| 模型调用 | `/chat/call` | `/chat/call` | ✅ 正确 |
| 获取模型列表 | `/chat/models` | `/chat/models` | ✅ 正确 |
| 更新模型列表 | `/chat/models/update` | `/chat/models/update` | ✅ 已修正 |
| 获取会话 | `/chat/sessions/{id}` | `/chat/sessions/{id}` | ✅ 正确 |
| 删除会话 | `/chat/sessions/{id}` | `/chat/sessions/{id}` | ✅ 正确 |

### 数据API (`/data`)
| 功能 | 前端调用 | 后端接口 | 状态 |
|------|----------|----------|------|
| 获取数据库列表 | `/data/` | `/data/` | ✅ 正确 |
| 创建数据库 | `/data/` | `/data/` | ✅ 正确 |
| 删除数据库 | `/data/` | `/data/` | ✅ 正确 |
| 查询测试 | `/data/query-test` | `/data/query-test` | ✅ 正确 |
| 文件转分块 | `/data/file-to-chunk` | `/data/file-to-chunk` | ✅ 正确 |
| 通过文件添加 | `/data/add-by-file` | `/data/add-by-file` | ✅ 正确 |
| 通过分块添加 | `/data/add-by-chunks` | `/data/add-by-chunks` | ✅ 正确 |
| 获取数据库信息 | `/data/info` | `/data/info` | ✅ 正确 |
| 删除文档 | `/data/document` | `/data/document` | ✅ 正确 |
| 获取文档信息 | `/data/document` | `/data/document` | ✅ 正确 |
| 上传文件 | `/data/upload` | `/data/upload` | ✅ 正确 |
| 获取文件列表 | `/data/files` | `/data/files` | ✅ 正确 |
| 删除文件 | `/data/file` | `/data/file` | ✅ 正确 |

### 图谱API (`/graph`)
| 功能 | 前端调用 | 后端接口 | 状态 |
|------|----------|----------|------|
| 获取图谱信息 | `/graph/` | `/graph/` | ✅ 已修正 |
| 获取节点列表 | `/graph/nodes` | `/graph/nodes` | ✅ 已修正 |
| 获取特定节点 | `/graph/node` | `/graph/node` | ✅ 已修正 |
| 添加实体 | `/graph/add-by-jsonl` | `/graph/add-by-jsonl` | ✅ 已修正 |
| 索引节点 | `/graph/index-nodes` | `/graph/index-nodes` | ✅ 已修正 |
| 启动索引器 | `/graph/start-indexer` | `/graph/start-indexer` | ✅ 已修正 |
| 停止索引器 | `/graph/stop-indexer` | `/graph/stop-indexer` | ✅ 已修正 |
| 索引器状态 | `/graph/indexer-status` | `/graph/indexer-status` | ✅ 已修正 |
| 立即运行索引 | `/graph/run-indexer-now` | `/graph/run-indexer-now` | ✅ 已修正 |

## 5. 注意事项

1. **流式响应处理**：聊天API的流式响应处理保持不变，继续使用fetch API处理流式数据
2. **错误处理**：所有API调用都保持原有的错误处理机制
3. **类型安全**：所有修正都保持了TypeScript的类型安全
4. **向后兼容**：修正不会影响现有的组件调用方式

## 6. 测试建议

建议对以下功能进行测试：
1. 图谱相关功能（路径已全部更新）
2. 聊天模型管理功能（参数结构已调整）
3. 流式聊天功能（确保正常工作）
4. 文件上传和管理功能

修正完成后，前端API调用应该与后端接口完全匹配。
