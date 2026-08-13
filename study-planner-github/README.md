# 学习计划

一个通用的跨端学习计划应用：Windows 桌面端、手机/平板网页端，以及可选的云端数据同步。不绑定具体考试或课程，科目和颜色都可以自定义。

## 功能

- 每日、每周、每月三种计划周期
- 科目自定义与颜色区分
- 单条添加、批量文本添加、txt/Word 文件导入
- 导出 txt 或 Word（Word 为表格格式，包含全部字段）
- 完成状态、进行中、时长、优先级、备注
- 备注中的 B 站链接一键打开
- 今日看板、日历视图、完成率与学习时长统计
- 账号注册登录，多端数据同步

## 技术栈

- 前端：React、Vite、lucide-react
- 后端：Express、Node.js 内置 SQLite
- 桌面端：Electron

## 本地开发

环境要求：Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

服务端默认运行在 `http://127.0.0.1:8787`，前端开发服务器默认运行在 `http://127.0.0.1:5173`。

## 桌面端开发

开发模式启动桌面窗口：

```bash
npm run desktop:dev
```

构建后启动桌面窗口：

```bash
npm run build
npm run desktop
```

打包 Windows 安装程序：

```bash
npm run pack
```

安装包会生成到 `release-dist/` 目录。

## 部署

部署脚本位于 `deploy/`，适用于 Ubuntu 等 Linux 服务器。以 PowerShell 为例：

```powershell
.\deploy\deploy-to-server.ps1 -ServerIp your-server-ip
```

也可以双击 `deploy\run-deploy.bat`，并在参数中传入服务器 IP。

生产环境建议使用 Nginx 反向代理并配置 HTTPS，参考 `deploy/nginx.conf.example`。

## 数据说明

- 后端使用 Node.js 内置 SQLite，数据库文件默认位于 `data/app.db`
- JWT 密钥首次启动自动生成并保存在 `data/jwt-secret`
- 默认端口为 `8787`，可通过环境变量 `PORT` 修改
- 建议定期备份 `data/` 目录

## 项目结构

```text
src/         前端源码
server/      后端 API
electron/    Electron 桌面端入口
scripts/     构建与辅助脚本
deploy/      服务器部署脚本
public/      静态资源
```
