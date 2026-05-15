// Electron 主进程
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { execFile } = require('node:child_process');
const path = require('node:path');

const isDev = process.env.ELECTRON_DEV === '1';
const knownAudioSessionProcessIds = new Map();
const knownAudioSessionTargets = new Map();
const RELEASE_OWNER = 'S1ntinel';
const RELEASE_REPO = 'loudness-vis';
const RELEASE_API_URL = `https://api.github.com/repos/${RELEASE_OWNER}/${RELEASE_REPO}/releases/latest`;
const RELEASES_PAGE_URL = `https://github.com/${RELEASE_OWNER}/${RELEASE_REPO}/releases/latest`;
const updateCache = {
  checkedAt: 0,
  result: null,
};
const UPDATE_CACHE_MS = 6 * 60 * 60 * 1000;

function getAudioHelperPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'helpers', 'audio-session-helper.ps1');
  }
  return path.join(__dirname, 'audio-session-helper.ps1');
}

function getWindowIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.ico');
  }
  return path.join(__dirname, '..', 'assets', 'icons', 'app.ico');
}

function runAudioSessionHelper(action, extraArgs = []) {
  if (process.platform !== 'win32') {
    if (action === 'list') return Promise.resolve([]);
    return Promise.reject(new Error('系统级音量合成器仅支持 Windows。'));
  }

  return new Promise((resolve, reject) => {
    const audioHelperPath = getAudioHelperPath();
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

function normalizeSessionKey(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function cacheAudioSessionTarget(session) {
  if (!session?.sessionId) return;
  knownAudioSessionTargets.set(session.sessionId, {
    processId: typeof session.processId === 'number' ? session.processId : 0,
    processName: normalizeSessionKey(session.processName),
    displayName: normalizeSessionKey(session.displayName),
    exePath: normalizeSessionKey(session.exePath),
  });
}

function isSameAudioSessionTarget(session, target) {
  if (!session || !target) return false;
  const sessionExePath = normalizeSessionKey(session.exePath);
  if (target.exePath && sessionExePath && sessionExePath === target.exePath) {
    return true;
  }

  if (target.processId > 0 && session.processId === target.processId) {
    return true;
  }

  const sessionProcessName = normalizeSessionKey(session.processName);
  const sessionDisplayName = normalizeSessionKey(session.displayName);
  if (target.processName && target.displayName) {
    return sessionProcessName === target.processName && sessionDisplayName === target.displayName;
  }

  return false;
}

function collectRelatedAudioSessions(sessionId, currentSessions) {
  const cachedTarget = knownAudioSessionTargets.get(sessionId) || null;
  const exactSession = currentSessions.find(session => session.sessionId === sessionId) || null;
  const target = exactSession
    ? {
        processId: typeof exactSession.processId === 'number' ? exactSession.processId : 0,
        processName: normalizeSessionKey(exactSession.processName),
        displayName: normalizeSessionKey(exactSession.displayName),
        exePath: normalizeSessionKey(exactSession.exePath),
      }
    : cachedTarget;

  if (!target) {
    return [];
  }

  const seen = new Set();
  const related = [];
  for (const session of currentSessions) {
    if (!session?.sessionId || seen.has(session.sessionId)) continue;
    if (!isSameAudioSessionTarget(session, target)) continue;
    seen.add(session.sessionId);
    related.push(session);
  }

  return related;
}

async function listAudioSessions() {
  const result = await runAudioSessionHelper('list');
  const sessions = Array.isArray(result)
    ? result.map(normalizeAudioSession).filter(Boolean)
    : [];

  for (const session of sessions) {
    if (session.sessionId) {
      knownAudioSessionProcessIds.set(session.sessionId, session.processId || 0);
      cacheAudioSessionTarget(session);
    }
  }

  return sessions;
}

function buildSetMuteArgs(sessionId, muted) {
  return [
    '-SessionId',
    String(sessionId),
    '-Muted',
    Boolean(muted) ? '1' : '0',
  ];
}

function buildSetVolumeArgs(sessionId, volumePercent) {
  return [
    '-SessionId',
    String(sessionId),
    '-VolumePercent',
    String(volumePercent),
  ];
}

function isAudioSessionNotFoundError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Target audio session was not found');
}

async function applySessionAction(sessionId, helperAction, helperArgsBuilder) {
  const applyToSessionIds = async (sessionIds) => {
    let firstUpdated = null;
    let updatedAnySession = false;
    const attempted = new Set();

    for (const targetSessionId of sessionIds) {
      if (!targetSessionId || attempted.has(targetSessionId)) continue;
      attempted.add(targetSessionId);
      try {
        const updated = await runAudioSessionHelper(helperAction, helperArgsBuilder(targetSessionId));
        const normalized = normalizeAudioSession(updated);
        if (normalized?.sessionId) {
          knownAudioSessionProcessIds.set(normalized.sessionId, normalized.processId || 0);
          cacheAudioSessionTarget(normalized);
        }
        if (!firstUpdated && normalized) firstUpdated = normalized;
        updatedAnySession = true;
      } catch (error) {
        if (!isAudioSessionNotFoundError(error)) {
          throw error;
        }
      }
    }

    return { firstUpdated, updatedAnySession };
  };

  try {
    const result = await runAudioSessionHelper(helperAction, helperArgsBuilder(sessionId));
    const normalized = normalizeAudioSession(result);
    if (normalized?.sessionId) {
      knownAudioSessionProcessIds.set(normalized.sessionId, normalized.processId || 0);
      cacheAudioSessionTarget(normalized);
    }

    const currentSessions = await listAudioSessions();
    const relatedSessions = collectRelatedAudioSessions(sessionId, currentSessions)
      .filter(session => session.sessionId !== normalized?.sessionId);
    if (relatedSessions.length > 0) {
      await applyToSessionIds(relatedSessions.map(session => session.sessionId));
    }

    return normalized;
  } catch (error) {
    if (!isAudioSessionNotFoundError(error)) {
      throw error;
    }
  }

  let fallbackProcessId = knownAudioSessionProcessIds.get(sessionId) || 0;
  const currentSessions = await listAudioSessions();
  const relatedSessions = collectRelatedAudioSessions(sessionId, currentSessions);
  if (fallbackProcessId <= 0) {
    fallbackProcessId = currentSessions.find(session => session.sessionId === sessionId)?.processId || 0;
  }

  if (fallbackProcessId <= 0 && relatedSessions.length === 0) {
    throw new Error('Target audio session was not found.');
  }

  const fallbackSessions = currentSessions.filter(session => session.processId === fallbackProcessId);
  if (fallbackSessions.length === 0 && relatedSessions.length === 0) {
    throw new Error('Target audio session was not found.');
  }

  const prioritizedSessions = relatedSessions.length > 0 ? relatedSessions : fallbackSessions;
  const { firstUpdated, updatedAnySession } = await applyToSessionIds(prioritizedSessions.map(session => session.sessionId));

  if (!updatedAnySession) {
    throw new Error('Target audio session was not found.');
  }

  return firstUpdated ?? fallbackSessions[0] ?? null;
}

async function setAudioSessionMute(sessionId, muted) {
  return applySessionAction(sessionId, 'set-mute', (targetSessionId) => buildSetMuteArgs(targetSessionId, muted));
}

async function setAudioSessionVolume(sessionId, volumePercent) {
  return applySessionAction(sessionId, 'set-volume', (targetSessionId) => buildSetVolumeArgs(targetSessionId, volumePercent));
}

function normalizeVersion(value) {
  return String(value || '').trim().replace(/^v/i, '');
}

function compareVersionStrings(a, b) {
  const aParts = normalizeVersion(a).split('.').map(part => Number.parseInt(part, 10) || 0);
  const bParts = normalizeVersion(b).split('.').map(part => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLength; i += 1) {
    const left = aParts[i] || 0;
    const right = bParts[i] || 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }
  return 0;
}

async function checkForUpdates(force = false) {
  const now = Date.now();
  if (!force && updateCache.result && now - updateCache.checkedAt < UPDATE_CACHE_MS) {
    return updateCache.result;
  }

  const currentVersion = app.getVersion();
  let result = {
    currentVersion,
    latestVersion: currentVersion,
    updateAvailable: false,
    url: RELEASES_PAGE_URL,
    checkedAt: now,
  };

  try {
    const response = await fetch(RELEASE_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'LoudnessVis-Update-Check',
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub API ${response.status}`);
    }
    const release = await response.json();
    const latestVersion = typeof release.tag_name === 'string' ? release.tag_name : currentVersion;
    const url = typeof release.html_url === 'string'
      ? release.html_url
      : RELEASES_PAGE_URL;
    result = {
      currentVersion,
      latestVersion,
      updateAvailable: compareVersionStrings(latestVersion, currentVersion) > 0,
      url,
      checkedAt: now,
    };
  } catch (error) {
    console.error('[update-check] failed:', error instanceof Error ? error.message : error);
  }

  updateCache.checkedAt = now;
  updateCache.result = result;
  return result;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    title: 'LoudnessVis',
    backgroundColor: '#0d1117',
    show: false,
    icon: getWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.loudnessvis.app');
}

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

ipcMain.handle('audio-sessions:list', async () => listAudioSessions());
ipcMain.handle('audio-sessions:set-mute', async (_event, sessionId, muted) => setAudioSessionMute(String(sessionId), muted));
ipcMain.handle('audio-sessions:set-volume', async (_event, sessionId, volumePercent) => {
  const next = Math.max(0, Math.min(100, Number(volumePercent) || 0));
  return setAudioSessionVolume(String(sessionId), next);
});
ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('app:check-for-updates', async (_event, force) => checkForUpdates(Boolean(force)));
ipcMain.handle('app:open-external', async (_event, url) => {
  if (typeof url !== 'string' || !url.trim()) return false;
  await shell.openExternal(url);
  return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
