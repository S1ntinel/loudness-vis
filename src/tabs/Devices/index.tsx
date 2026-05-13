import { useEffect, useRef, useState } from 'react';
import { useDeviceStore } from '../../store/useDeviceStore';
import { engine } from '../../audio/engine';
import s from './Devices.module.css';

export default function Devices() {
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

  const [error, setError] = useState<string | null>(null);
  // ⚠ 仅 UI 演示数据：浏览器沙箱无法读取/写入系统应用音量
  // 真要"静音其它应用"必须经 Electron 主进程调 Windows COM (IAudioSessionManager2)
  const [appVolumes, setAppVolumes] = useState([
    { id: 'system',  name: '系统声音',  icon: '🔊', volume: 80, muted: false },
    { id: 'browser', name: '浏览器',    icon: '🌐', volume: 65, muted: false },
    { id: 'music',   name: '音乐播放器', icon: '🎵', volume: 45, muted: true  },
    { id: 'game',    name: '游戏',      icon: '🎮', volume: 90, muted: false },
  ]);

  const monitorRef = useRef<{
    stream: MediaStream | null;
    analyser: AnalyserNode | null;
    raf: number;
  }>({ stream: null, analyser: null, raf: 0 });

  // 初始化：刷新设备列表并获取 AudioContext 信息
  useEffect(() => {
    refreshDevices();
    setAudioContextInfo(engine.ctx.sampleRate, 2);
  }, [refreshDevices, setAudioContextInfo]);

  // 监听设备变化（插拔耳机等）
  useEffect(() => {
    const handleDeviceChange = () => { refreshDevices(); };
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
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sum / dataArray.length);
        const db = 20 * Math.log10(rms + 1e-10);
        setInputLevel(db);
        monitorRef.current.raf = requestAnimationFrame(updateLevel);
      }

      updateLevel();
      setError(null);
    } catch (err) {
      setError('无法访问音频输入设备：' + (err as Error).message);
      setIsMonitoring(false);
    }
  }

  function stopMonitoring() {
    const { stream, analyser, raf } = monitorRef.current;
    if (raf) cancelAnimationFrame(raf);
    if (analyser) analyser.disconnect();
    if (stream) stream.getTracks().forEach(track => track.stop());
    monitorRef.current = { stream: null, analyser: null, raf: 0 };
    setInputLevel(-Infinity);
  }

  const inputDevices  = devices.filter(d => d.kind === 'audioinput');
  const outputDevices = devices.filter(d => d.kind === 'audiooutput');

  // 电平表颜色（按 dB）
  function getLevelColor(db: number): string {
    if (db > -3) return '#e85d4a';   // 红
    if (db > -12) return '#e8a64a';  // 黄
    if (db > -24) return '#4ad8a8';  // 绿
    return '#3b6db5';                // 蓝
  }
  function getLevelWidth(db: number): number {
    const minDb = -60, maxDb = 0;
    const clamped = Math.max(minDb, Math.min(maxDb, db));
    return ((clamped - minDb) / (maxDb - minDb)) * 100;
  }

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  return (
    <div className={s.container}>
      <header className={s.header}>
        <h2 className={s.title}>音频设备控制</h2>
        <button className={s.refreshBtn} onClick={() => refreshDevices()}>
          🔄 刷新设备列表
        </button>
      </header>

      {error && <div className={s.error}>{error}</div>}

      <div className={s.grid}>
        {/* 输入设备 */}
        <section className={s.section}>
          <h3 className={s.sectionTitle}>
            <span className={s.icon}>🎤</span>
            输入设备
            <span className={s.count}>{inputDevices.length}</span>
          </h3>
          <div className={s.deviceList}>
            {inputDevices.map(device => (
              <div
                key={device.deviceId}
                className={`${s.deviceCard} ${selectedInput === device.deviceId ? s.deviceActive : ''}`}
                onClick={() => setSelectedInput(device.deviceId)}
              >
                <div className={s.deviceInfo}>
                  <div className={s.deviceName}>{device.label}</div>
                  <div className={s.deviceId}>ID: {device.deviceId.slice(0, 16)}…</div>
                </div>
                {selectedInput === device.deviceId && (
                  <div className={s.deviceBadge}>已选择</div>
                )}
              </div>
            ))}
            {inputDevices.length === 0 && <div className={s.empty}>未找到音频输入设备</div>}
          </div>

          {selectedInput && (
            <div className={s.monitorSection}>
              <div className={s.monitorHeader}>
                <span>输入电平监控</span>
                <button
                  className={`${s.monitorBtn} ${isMonitoring ? s.monitorBtnActive : ''}`}
                  onClick={() => setIsMonitoring(!isMonitoring)}
                >
                  {isMonitoring ? '⏹ 停止监控' : '▶ 开始监控'}
                </button>
              </div>
              {isMonitoring && (
                <div className={s.levelMeter}>
                  <div className={s.levelBar}>
                    <div
                      className={s.levelFill}
                      style={{
                        width: getLevelWidth(inputLevel) + '%',
                        background: getLevelColor(inputLevel),
                        boxShadow: '0 0 10px ' + getLevelColor(inputLevel),
                      }}
                    />
                  </div>
                  <div className={s.levelValue}>
                    {inputLevel > -Infinity ? inputLevel.toFixed(1) + ' dB' : '-∞ dB'}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 输出设备 */}
        <section className={s.section}>
          <h3 className={s.sectionTitle}>
            <span className={s.icon}>🔊</span>
            输出设备
            <span className={s.count}>{outputDevices.length}</span>
          </h3>
          <div className={s.deviceList}>
            {outputDevices.map(device => (
              <div
                key={device.deviceId}
                className={`${s.deviceCard} ${selectedOutput === device.deviceId ? s.deviceActive : ''}`}
                onClick={() => setSelectedOutput(device.deviceId)}
              >
                <div className={s.deviceInfo}>
                  <div className={s.deviceName}>{device.label}</div>
                  <div className={s.deviceId}>ID: {device.deviceId.slice(0, 16)}…</div>
                </div>
                {selectedOutput === device.deviceId && (
                  <div className={s.deviceBadge}>已选择</div>
                )}
              </div>
            ))}
            {outputDevices.length === 0 && <div className={s.empty}>未找到音频输出设备</div>}
          </div>
        </section>

        {/* 应用程序音量控制（演示） */}
        <section className={`${s.section} ${s.appVolumeSection}`}>
          <h3 className={s.sectionTitle}>
            <span className={s.icon}>🎚️</span>
            音量合成器
            <span className={s.count}>{appVolumes.length}</span>
            <span className={s.demoBadge} title="浏览器无法读写其它应用的音量；当前是 UI 演示。要真功能需要 Electron 主进程调 Windows COM (IAudioSessionManager2)。">
              {isElectron ? 'BETA' : 'DEMO'}
            </span>
          </h3>
          <div className={s.demoNote}>
            ⚠ {isElectron
              ? 'Electron 端尚未接入系统音频会话 API，当前仍为 UI 占位。'
              : '浏览器沙箱限制：以下数据为演示，静音/调节不会影响其它应用真实音量。'}
          </div>
          <div className={s.appVolumeList}>
            {appVolumes.map(app => (
              <div key={app.id} className={`${s.appVolumeItem} ${app.muted ? s.appMuted : ''}`}>
                <button
                  className={s.appMuteBtn}
                  onClick={() => {
                    setAppVolumes(prev => prev.map(a =>
                      a.id === app.id ? { ...a, muted: !a.muted } : a
                    ));
                  }}
                  title={app.muted ? '取消静音（仅 UI 状态）' : '静音（仅 UI 状态）'}
                >
                  {app.muted ? '🔇' : app.icon}
                </button>
                <div className={s.appVolumeInfo}>
                  <div className={s.appVolumeName}>{app.name}</div>
                  <div className={s.appVolumeSlider}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={app.muted ? 0 : app.volume}
                      onChange={e => {
                        const vol = parseInt(e.target.value);
                        setAppVolumes(prev => prev.map(a =>
                          a.id === app.id ? { ...a, volume: vol, muted: vol === 0 } : a
                        ));
                      }}
                      className={s.slider}
                    />
                    <span className={s.appVolumeValue}>
                      {app.muted ? '静音' : app.volume + '%'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 音频系统信息 */}
        <section className={s.section}>
          <h3 className={s.sectionTitle}>
            <span className={s.icon}>ℹ️</span>
            音频系统信息
          </h3>
          <div className={s.infoGrid}>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>采样率</div>
              <div className={s.infoValue}>{sampleRate} Hz</div>
            </div>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>声道数</div>
              <div className={s.infoValue}>{channelCount}</div>
            </div>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>缓冲区</div>
              <div className={s.infoValue}>{engine.ctx.baseLatency?.toFixed(3) || 'N/A'} s</div>
            </div>
            <div className={s.infoItem}>
              <div className={s.infoLabel}>状态</div>
              <div className={s.infoValue}>{engine.ctx.state}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
