const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const isDev = Boolean(process.env.PLANNER_DEV);
const devServer = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const defaultPort = Number(process.env.PLANNER_PORT || 8787);

let mainWindow = null;
let serverProcess = null;
let quitting = false;
let apiBase = process.env.PLANNER_API_BASE || '';

function resourcePath(...segments) {
  return app.isPackaged
    ? path.join(process.resourcesPath, ...segments)
    : path.join(__dirname, '..', ...segments);
}

function getServerScriptPath() {
  return resourcePath('server-bundle.cjs');
}

function getNodeExecutablePath() {
  if (app.isPackaged) return resourcePath('node', 'node.exe');
  return process.execPath;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchHealth(url, timeout = 1200) {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    fetch(`${url}/api/health`, { signal: controller.signal })
      .then((response) => resolve(response.ok))
      .catch(() => resolve(false))
      .finally(() => clearTimeout(timer));
  });
}

async function waitForHealth(url, timeout) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await fetchHealth(url)) return true;
    await delay(220);
  }
  return false;
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

function stopLocalService() {
  const child = serverProcess;
  serverProcess = null;
  if (!child || child.killed) return;

  try {
    if (process.platform === 'win32' && child.pid) {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        windowsHide: true,
        stdio: 'ignore',
      });
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    // The child may already be gone; the app can continue closing.
  }
}

async function startLocalService() {
  const defaultUrl = `http://127.0.0.1:${defaultPort}`;
  if (await waitForHealth(defaultUrl, 900)) {
    apiBase = defaultUrl;
    process.env.PLANNER_API_BASE = apiBase;
    return;
  }

  const port = await findFreePort();
  apiBase = `http://127.0.0.1:${port}`;
  process.env.PLANNER_API_BASE = apiBase;

  const scriptPath = getServerScriptPath();
  const nodePath = getNodeExecutablePath();
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`缺少本地服务文件：${scriptPath}`);
  }
  if (!fs.existsSync(nodePath)) {
    throw new Error(`缺少 Node 运行时：${nodePath}`);
  }

  const dataDir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  serverProcess = spawn(nodePath, [scriptPath], {
    cwd: path.dirname(scriptPath),
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      NODE_ENV: 'production',
      PLANNER_API_BASE: apiBase,
      PORT: String(port),
    },
    windowsHide: true,
    stdio: 'ignore',
  });

  serverProcess.on('error', (error) => {
    console.error('本地服务进程启动失败', error);
  });
  serverProcess.on('exit', (code, signal) => {
    serverProcess = null;
    if (!quitting && code !== 0) {
      console.error(`本地服务进程意外退出：${code ?? signal}`);
    }
  });

  const healthy = await waitForHealth(apiBase, 15000);
  if (!healthy) {
    stopLocalService();
    throw new Error('本地服务启动超时，请稍后重试');
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    show: false,
    backgroundColor: '#f4f5fa',
    title: '学习计划',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  mainWindow = win;

  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const current = win.webContents.getURL();
    if (
      url !== current &&
      !url.startsWith('file://') &&
      !url.startsWith('http://localhost') &&
      !url.startsWith('http://127.0.0.1')
    ) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (isDev) {
    win.loadURL(devServer);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.studyplanner.app');
    }

    Menu.setApplicationMenu(null);

    ipcMain.handle('open-external', (_event, url) => {
      if (typeof url === 'string' && /^https?:\/\//.test(url)) {
        shell.openExternal(url);
      }
    });

    if (!isDev) {
      try {
        await startLocalService();
      } catch (error) {
        dialog.showErrorBox('学习计划启动失败', error.message);
        app.quit();
        return;
      }
    }

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('before-quit', () => {
    quitting = true;
    stopLocalService();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
