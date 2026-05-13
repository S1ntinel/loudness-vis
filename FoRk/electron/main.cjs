// Electron 主进程
const { app, BrowserWindow, ipcMain } = require('electron');
const { execFile } = require('node:child_process');
const path = require('node:path');

const isDev = process.env.ELECTRON_DEV === '1';
const audioHelperPath = path.join(__dirname, 'audio-session-helper.ps1');

function runAudioSessionHelper(action, extraArgs = []) {
  if (process.platform !== 'win32') {
    if (action === 'list') return Promise.resolve([]);
    return Promise.reject(new Error('系统级音量合成器仅支持 Windows。'));
  }

  return new Promise((resolve, reject) => {
    const args = [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      audioHelperPath,
      '-Action',
      action,
      ...extraArgs,
    ];

    execFile('powershell.exe', args, {
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
      encoding: 'utf8',
    }, (error, stdout, stderr) => {
      if (error) {
        const detail = stderr?.trim() || stdout?.trim() || error.message;
        reject(new Error(detail));
        return;
      }

      const text = stdout.trim();
      if (!text) {
        resolve(action === 'list' ? [] : null);
        return;
      }

      try {
        resolve(JSON.parse(text));
      } catch (parseError) {
        const message = parseError instanceof Error ? parseError.message : String(parseError);
        reject(new Error(`无法解析音量合成器输出：${message}`));
      }
    });
  });
}

function normalizeAudioSession(session) {
  if (!session || typeof session !== 'object') {
    return null;
  }

  const displayName = typeof session.DisplayName === 'string' && session.DisplayName.trim()
    ? session.DisplayName.trim()
    : typeof session.ProcessName === 'string' && session.ProcessName.trim()
      ? session.ProcessName.trim()
      : 'Unknown App';

  return {
    sessionId: typeof session.SessionId === 'string' ? session.SessionId : '',
    displayName,
    processName: typeof session.ProcessName === 'string' ? session.ProcessName : displayName,
    processId: typeof session.ProcessId === 'number' ? session.ProcessId : 0,
    isSystemSession: Boolean(session.IsSystemSession),
    active: Boolean(session.Active),
    muted: Boolean(session.Muted),
    volumePercent: typeof session.VolumePercent === 'number' ? session.VolumePercent : 0,
    exePath: typeof session.ExePath === 'string' ? session.ExePath : '',
    iconDataUrl: typeof session.IconDataUrl === 'string' ? session.IconDataUrl : '',
  };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// 窗口置顶 IPC
ipcMain.handle('win:set-always-on-top', (event, flag) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setAlwaysOnTop(Boolean(flag));
  }
  return Boolean(flag);
});

ipcMain.handle('win:get-always-on-top', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isAlwaysOnTop() : false;
});

ipcMain.handle('audio-sessions:list', async () => {
  const result = await runAudioSessionHelper('list');
  return Array.isArray(result)
    ? result.map(normalizeAudioSession).filter(Boolean)
    : [];
});

ipcMain.handle('audio-sessions:set-mute', async (_event, sessionId, muted) => {
  const result = await runAudioSessionHelper('set-mute', [
    '-SessionId',
    String(sessionId),
    '-Muted',
    Boolean(muted) ? '1' : '0',
  ]);
  return normalizeAudioSession(result);
});

ipcMain.handle('audio-sessions:set-volume', async (_event, sessionId, volumePercent) => {
  const next = Math.max(0, Math.min(100, Number(volumePercent) || 0));
  const result = await runAudioSessionHelper('set-volume', [
    '-SessionId',
    String(sessionId),
    '-VolumePercent',
    String(next),
  ]);
  return normalizeAudioSession(result);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
