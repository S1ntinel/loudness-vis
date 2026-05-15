import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeviceStore } from '../../store/useDeviceStore';
import { useUIStore } from '../../store';
import { engine } from '../../audio/engine';
import { useEngineState } from '../../audio/useEngineState';
import s from './Devices.module.css';

interface SystemAudioSession {
  sessionId: string;
  displayName: string;
  processName: string;
  processId: number;
  isSystemSession: boolean;
  active: boolean;
  muted: boolean;
  volumePercent: number;
  exePath: string;
  iconDataUrl: string;
}

export default function Devices() {
  const { t } = useTranslation();
  const {
    devices,
    selectedInput,
    selectedOutput,
    inputLevel,
    isMonitoring,
    sampleRate,
    channelCount,
    setSelectedInput,
    setSelectedOutput,
    setInputLevel,
    setIsMonitoring,
    setAudioContextInfo,
    refreshDevices,
  } = useDeviceStore();
  const volume = useUIStore(state => state.volume);
  const setVolume = useUIStore(state => state.setVolume);
  const { audioBuffer, isPlaying } = useEngineState();

  const [error, setError] = useState<string | null>(null);
  const [appMuted, setAppMuted] = useState(false);
  const [outputMonitoring, setOutputMonitoring] = useState(false);
  const [systemSessions, setSystemSessions] = useState<SystemAudioSession[]>([]);
  const [systemMixerError, setSystemMixerError] = useState<string | null>(null);
  const [systemMixerLoading, setSystemMixerLoading] = useState(false);
  const lastVolumeRef = useRef(Math.max(volume, 0.6));
  const sessionVolumeTimersRef = useRef<Record<string, number>>({});
  
  const monitorRef = useRef<{
    stream: MediaStream | null;
    analyser: AnalyserNode | null;
    raf: number;
  }>({ stream: null, analyser: null, raf: 0 });

  // 初始化：刷新设备列表并获取 AudioContext 信息
  useEffect(() => {
    void refreshDevices();
    setAudioContextInfo(engine.ctx.sampleRate, 2);
  }, [refreshDevices, setAudioContextInfo]);

  useEffect(() => {
    if (typeof window.electronAPI?.listAudioSessions !== 'function') {
      setSystemMixerError(t('devices.winMixerUnsupported'));
      return;
    }

    let disposed = false;
    let pollingId = 0;

    const refresh = async (silent: boolean) => {
      if (!silent) setSystemMixerLoading(true);
      try {
        const sessions = await window.electronAPI!.listAudioSessions();
        if (disposed) return;
        setSystemSessions(sessions);
        setSystemMixerError(null);
      } catch (err) {
        if (disposed) return;
        const message = err instanceof Error ? err.message : String(err);
        setSystemMixerError(t('devices.winSessionFailFmt', { msg: message }));
      } finally {
        if (!disposed && !silent) {
          setSystemMixerLoading(false);
        }
      }
    };

    void refresh(false);
    pollingId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refresh(true);
    }, 1800);

    return () => {
      disposed = true;
      window.clearInterval(pollingId);
      Object.values(sessionVolumeTimersRef.current).forEach(timer => window.clearTimeout(timer));
      sessionVolumeTimersRef.current = {};
    };
  }, []);

  // 监听设备变化
  useEffect(() => {
    const handleDeviceChange = () => {
      refreshDevices();
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, [refreshDevices]);

  // 输入电平监控
  useEffect(() => {
    if (!isMonitoring || !selectedInput) {
      stopMonitoring();
      return;
    }

    startMonitoring();
    return () => stopMonitoring();
  }, [isMonitoring, selectedInput]);

  async function startMonitoring() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedInput ? { exact: selectedInput } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const analyser = engine.ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      const source = engine.ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      monitorRef.current = { stream, analyser, raf: 0 };

      const dataArray = new Float32Array(analyser.fftSize);
      
      function updateLevel() {
        if (!monitorRef.current.analyser) return;
        monitorRef.current.analyser.getFloatTimeDomainData(dataArray);
        
        // 计算 RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const db = 20 * Math.log10(rms + 1e-10);
        
        setInputLevel(db);
        monitorRef.current.raf = requestAnimationFrame(updateLevel);
      }
      
      updateLevel();
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(t('devices.audioAccessFailFmt', { msg: message }));
      setIsMonitoring(false);
    }
  }

  function stopMonitoring() {
    const { stream, analyser, raf } = monitorRef.current;
    if (raf) cancelAnimationFrame(raf);
    if (analyser) analyser.disconnect();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    monitorRef.current = { stream: null, analyser: null, raf: 0 };
    setInputLevel(-Infinity);
  }

  const inputDevices = devices.filter(d => d.kind === 'audioinput');
  const outputDevices = devices.filter(d => d.kind === 'audiooutput');
  const appVolumePercent = Math.round(volume * 100);

  async function selectOutputDevice(deviceId: string) {
    setSelectedOutput(deviceId);
    try {
      const supported = await engine.setOutputDevice(deviceId);
      if (!supported && deviceId !== 'default') {
        setError(t('devices.outputDeviceUnsupported'));
      } else {
        setError(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(t('devices.outputSwitchFailFmt', { msg: message }));
    }
  }

  function setAppVolumePercent(percent: number) {
    const next = Math.max(0, Math.min(100, percent));
    if (next > 0) lastVolumeRef.current = next / 100;
    setAppMuted(next === 0);
    setVolume(next / 100);
  }

  function toggleAppMute() {
    if (appMuted || volume === 0) {
      const restored = Math.max(0.01, lastVolumeRef.current);
      setAppMuted(false);
      setVolume(restored);
    } else {
      lastVolumeRef.current = Math.max(volume, 0.01);
      setAppMuted(true);
      setVolume(0);
    }
  }

  function upsertSystemSession(session: SystemAudioSession | null) {
    if (!session) return;
    setSystemSessions(prev => {
      const next = prev.slice();
      const index = next.findIndex(item => item.sessionId === session.sessionId);
      if (index >= 0) {
        next[index] = session;
        return next;
      }
      return [session, ...next];
    });
  }

  async function refreshSystemSessions(silent = false) {
    if (typeof window.electronAPI?.listAudioSessions !== 'function') {
      setSystemMixerError(t('devices.winMixerUnsupported'));
      return;
    }
    if (!silent) setSystemMixerLoading(true);
    try {
      const sessions = await window.electronAPI.listAudioSessions();
      setSystemSessions(sessions);
      setSystemMixerError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSystemMixerError(t('devices.winSessionFailFmt', { msg: message }));
    } finally {
      if (!silent) setSystemMixerLoading(false);
    }
  }

  async function toggleSystemSessionMute(session: SystemAudioSession) {
    if (typeof window.electronAPI?.setAudioSessionMute !== 'function') return;
    const nextMuted = !session.muted;
    setSystemSessions(prev => prev.map(item => item.sessionId === session.sessionId
      ? { ...item, muted: nextMuted, volumePercent: nextMuted ? item.volumePercent : item.volumePercent }
      : item));

    try {
      const updated = await window.electronAPI.setAudioSessionMute(session.sessionId, nextMuted);
      upsertSystemSession(updated);
      void refreshSystemSessions(true);
      setSystemMixerError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSystemMixerError(t('devices.muteFailFmt', { name: session.displayName, msg: message }));
      void refreshSystemSessions(true);
    }
  }

  function queueSystemSessionVolume(session: SystemAudioSession, percent: number) {
    const next = Math.max(0, Math.min(100, percent));
    setSystemSessions(prev => prev.map(item => item.sessionId === session.sessionId
      ? { ...item, volumePercent: next, muted: next === 0 ? true : item.muted }
      : item));

    const existingTimer = sessionVolumeTimersRef.current[session.sessionId];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    sessionVolumeTimersRef.current[session.sessionId] = window.setTimeout(async () => {
      try {
        if (typeof window.electronAPI?.setAudioSessionVolume !== 'function') return;
        const updated = await window.electronAPI.setAudioSessionVolume(session.sessionId, next);
        upsertSystemSession(updated);
        void refreshSystemSessions(true);
        setSystemMixerError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setSystemMixerError(t('devices.volumeFailFmt', { name: session.displayName, msg: message }));
        void refreshSystemSessions(true);
      } finally {
        delete sessionVolumeTimersRef.current[session.sessionId];
      }
    }, 140);
  }

  function getSessionGlyph(session: SystemAudioSession): string {
    if (session.isSystemSession) return '🔔';
    const raw = (session.displayName || session.processName || 'A').trim();
    return raw.slice(0, 1).toUpperCase();
  }

  async function toggleOutputRouting() {
    if (outputMonitoring) {
      try {
        const supported = await engine.setOutputDevice('default');
        setOutputMonitoring(false);
        setError(supported ? null : t('devices.outputFallback'));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(t('devices.outputSwitchFailFmt', { msg: message }));
      }
      return;
    }
    if (!selectedOutput) {
      setError(t('devices.needSelectOutput'));
      return;
    }
    if (!audioBuffer) {
      setError(t('devices.needLoadAudio'));
      return;
    }
    try {
      const supported = await engine.setOutputDevice(selectedOutput);
      if (engine.ctx.state === 'suspended') await engine.ctx.resume();
      setOutputMonitoring(true);
      setError(supported || selectedOutput === 'default'
        ? null
        : t('devices.outputFallback'));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(t('devices.outputSwitchFailFmt', { msg: message }));
    }
  }

  // 电平表颜色
  function getLevelColor(db: number): string {
    if (db > -3) return '#e85d4a'; // 红色 - 接近削波
    if (db > -12) return '#e8a64a'; // 黄色 - 注意
    if (db > -24) return '#4ad8a8'; // 绿色 - 良好
    return '#3b6db5'; // 蓝色 - 较低
  }

  function getLevelWidth(db: number): number {
    // 将 dB 映射到 0-100%
    const minDb = -60;
    const maxDb = 0;
    const clamped = Math.max(minDb, Math.min(maxDb, db));
    return ((clamped - minDb) / (maxDb - minDb)) * 100;
  }

  return (
    <div className={s.container}>
        <header className={s.header}>
          <h2 className={s.title}>{t('devices.title')}</h2>
         <button className={s.refreshBtn} onClick={() => { void refreshDevices(); void refreshSystemSessions(); }}>
           {t('devices.refresh')}
         </button>
       </header>

      {error && (
        <div className={s.error}>{error}</div>
      )}

      <div className={s.grid}>
        {/* 输入设备 */}
        <section className={s.section}>
          <h3 className={s.sectionTitle}>
            <span className={s.icon}>🎤</span>
            {t('devices.inputDevices')}
            <span className={s.count}>{inputDevices.length}</span>
          </h3>

          <div className={s.deviceList}>
            {inputDevices.map(device => (
              <div
                key={device.deviceId}
                className={`${s.deviceCard} ${selectedInput === device.deviceId ? s.deviceActive : ''}`}
                onClick={() => setSelectedInput(device.deviceId)}
                title={`ID: ${device.deviceId}`}
              >
                <div className={s.deviceInfo}>
                  <div className={s.deviceName}>{device.label}</div>
                </div>
                {selectedInput === device.deviceId && (
                  <div className={s.deviceBadge}>{t('devices.selected')}</div>
                )}
              </div>
            ))}
            {inputDevices.length === 0 && (
              <div className={s.empty}>{t('devices.noInput')}</div>
            )}
          </div>
        </section>

        {/* 输入监控（独立 section） */}
        {selectedInput && (
          <section className={s.section}>
            <h3 className={s.sectionTitle}>
              <span className={s.icon}>📈</span>
              {t('devices.inputMonitor')}
            </h3>
            <div className={s.monitorSection}>
              <div className={s.monitorHeader}>
                <span>{t('devices.currentInput')}</span>
                <button
                  className={`${s.monitorBtn} ${isMonitoring ? s.monitorBtnActive : ''}`}
                  onClick={() => setIsMonitoring(!isMonitoring)}
                >
                  {isMonitoring ? t('devices.stopMonitor') : t('devices.startMonitor')}
                </button>
              </div>

              {isMonitoring && (
                <div className={s.levelMeter}>
                  <div className={s.levelBar}>
                    <div
                      className={s.levelFill}
                      style={{
                        width: `${getLevelWidth(inputLevel)}%`,
                        background: getLevelColor(inputLevel),
                        boxShadow: `0 0 10px ${getLevelColor(inputLevel)}`,
                      }}
                    />
                  </div>
                  <div className={s.levelValue}>
                    {inputLevel > -Infinity ? `${inputLevel.toFixed(1)} dB` : '-∞ dB'}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 输出设备 */}
        <section className={s.section}>
          <h3 className={s.sectionTitle}>
            <span className={s.icon}>🔊</span>
            {t('devices.outputDevices')}
            <span className={s.count}>{outputDevices.length}</span>
          </h3>

          <div className={s.deviceList}>
            {outputDevices.map(device => (
              <div
                key={device.deviceId}
                className={`${s.deviceCard} ${selectedOutput === device.deviceId ? s.deviceActive : ''}`}
                onClick={() => { void selectOutputDevice(device.deviceId); }}
                title={`ID: ${device.deviceId}`}
              >
                <div className={s.deviceInfo}>
                  <div className={s.deviceName}>{device.label}</div>
                </div>
                <div className={s.deviceActions}>
                  <span
                    className={`${s.outputLed} ${selectedOutput === device.deviceId && isPlaying ? s.outputLedActive : ''}`}
                    title={selectedOutput === device.deviceId && isPlaying ? t('devices.outputActive') : t('devices.outputInactive')}
                  />
                  {selectedOutput === device.deviceId && (
                    <div className={s.deviceBadge}>{t('devices.selected')}</div>
                  )}
                </div>
              </div>
            ))}
            {outputDevices.length === 0 && (
              <div className={s.empty}>{t('devices.noOutput')}</div>
            )}
          </div>
        </section>

        {/* 输出路由（独立 section） */}
        {selectedOutput && (
          <section className={s.section}>
            <h3 className={s.sectionTitle}>
              <span className={s.icon}>🎯</span>
              {t('devices.outputRouting')}
            </h3>
            <div className={s.monitorSection}>
              <div className={s.monitorHeader}>
                <span>{t('devices.currentOutput')}</span>
                <button
                  className={`${s.monitorBtn} ${outputMonitoring ? s.monitorBtnActive : ''}`}
                  onClick={() => { void toggleOutputRouting(); }}
                >
                  {outputMonitoring ? t('devices.switchBackDefault') : t('devices.switchOutput')}
                </button>
              </div>
              <div className={s.monitorHint}>
                {t('devices.outputRoutingHint')}
              </div>
            </div>
          </section>
        )}

        {/* 应用程序音量控制 */}
        <section className={`${s.section} ${s.appVolumeSection}`}>
          <h3 className={s.sectionTitle}>
            <span className={s.icon}>🎚️</span>
            {t('devices.winMixer')}
            <span className={s.count}>{systemSessions.length}</span>
          </h3>

          <div className={s.monitorHint}>
            {t('devices.winMixerHint')}
          </div>

          {systemMixerError && (
            <div className={s.inlineError}>{systemMixerError}</div>
          )}

          <div className={s.appVolumeList}>
            {systemMixerLoading && systemSessions.length === 0 && (
              <div className={s.empty}>{t('devices.winMixerLoading')}</div>
            )}

            {!systemMixerLoading && systemSessions.length === 0 && !systemMixerError && (
              <div className={s.empty}>{t('devices.winMixerEmpty')}</div>
            )}

            {systemSessions.map(session => (
              <div key={session.sessionId} className={`${s.appVolumeItem} ${session.muted ? s.appMuted : ''}`}>
                <button
                  className={`${s.appMuteBtn} ${s.appIconBtn}`}
                  onClick={() => { void toggleSystemSessionMute(session); }}
                  title={session.muted ? t('devices.unmuteAction', { name: session.displayName }) : t('devices.muteAction', { name: session.displayName })}
                >
                  {session.iconDataUrl ? (
                    <img src={session.iconDataUrl} alt="" className={s.appIconImage} />
                  ) : (
                    <span className={s.appIconFallback}>{getSessionGlyph(session)}</span>
                  )}
                  {session.muted && <span className={s.appMuteOverlay}>🔇</span>}
                </button>

                <div className={s.appVolumeInfo}>
                  <div className={s.appVolumeRow}>
                    <div className={s.appVolumeName}>{session.displayName}</div>
                    <span
                      className={`${s.outputLed} ${session.active ? s.outputLedActive : ''}`}
                      title={session.active ? t('devices.sessionActive') : t('devices.sessionInactive')}
                    />
                  </div>
                  <div className={s.deviceId}>
                    {session.isSystemSession ? t('devices.systemSession') : `${session.processName} · PID ${session.processId}`}
                  </div>
                  <div className={s.appVolumeSlider}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={session.volumePercent}
                      onChange={e => queueSystemSessionVolume(session, parseInt(e.target.value, 10))}
                      className={s.slider}
                    />
                    <span className={s.appVolumeValue}>
                      {session.muted ? `${t('devices.muted')} · ${session.volumePercent}%` : `${session.volumePercent}%`}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <div className={s.localMixerLabel}>{t('devices.localMixer')}</div>
            <div className={`${s.appVolumeItem} ${appMuted || volume === 0 ? s.appMuted : ''}`}>
              <button
                className={s.appMuteBtn}
                onClick={toggleAppMute}
                title={appMuted || volume === 0 ? t('devices.unmuteToggle') : t('devices.muteToggle')}
              >
                {appMuted || volume === 0 ? '🔇' : '🔊'}
              </button>
              <div className={s.appVolumeInfo}>
                <div className={s.appVolumeName}>{t('devices.currentAppOutput')}</div>
                <div className={s.appVolumeSlider}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={appMuted ? 0 : appVolumePercent}
                    onChange={e => setAppVolumePercent(parseInt(e.target.value, 10))}
                    className={s.slider}
                  />
                  <span className={s.appVolumeValue}>
                    {appMuted || volume === 0 ? t('devices.muted') : `${appVolumePercent}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 音频系统信息 */}
        <section className={s.section}>
          <h3 className={s.sectionTitle}>
            <span className={s.icon}>ℹ️</span>
            {t('devices.systemInfo')}
          </h3>

          <div className={s.infoGrid}>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>{t('devices.sampleRate')}</div>
              <div className={s.infoValue}>{sampleRate} Hz</div>
            </div>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>{t('devices.channelCount')}</div>
              <div className={s.infoValue}>{channelCount}</div>
            </div>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>{t('devices.bufferSize')}</div>
              <div className={s.infoValue}>{engine.ctx.baseLatency?.toFixed(3) || 'N/A'} s</div>
            </div>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>{t('devices.audioCtxState')}</div>
              <div className={s.infoValue}>{engine.ctx.state}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
