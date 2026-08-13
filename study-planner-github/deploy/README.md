# 服务器部署说明

## 一、先在服务器安全组开放端口

进入云服务器控制台，找到实例的“安全组”配置，添加一条入方向规则：

- 协议类型：TCP
- 端口范围：8787/8787
- 授权对象：0.0.0.0/0
- 动作：允许

SSH 的 22 端口一般已经开放，不要关闭它。

## 二、在 Windows 电脑上运行部署脚本

在 PowerShell 中执行：

```powershell
.\deploy\deploy-to-server.ps1 -ServerIp your-server-ip
```

或者双击 `deploy\run-deploy.bat`，然后按提示传入服务器 IP。

脚本会打包并上传当前项目的 `release/server-bundle.cjs`、`dist` 和 `deploy`，然后在服务器上安装 Node.js 22、创建 systemd 服务并启动。

如果服务器登录用户不是 `root`，可以这样运行：

```powershell
.\deploy\deploy-to-server.ps1 -ServerIp your-server-ip -SshUser ubuntu
```

## 三、桌面端连接服务器

打开桌面应用的设置页，将 API 地址填为：

```text
http://your-server-ip:8787
```

之后账号和计划数据都会保存在服务器的 SQLite 数据库中。
