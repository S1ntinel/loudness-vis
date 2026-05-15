import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trackEngine } from '../../audio/trackEngine';
import { useTrackState } from '../../audio/useTrackState';
import { useDeviceStore } from '../../store/useDeviceStore';
import ScrollingWaveform from '../../panels/ScrollingWaveform';
import TrackList from '../../panels/TrackList';
import { formatTime } from '../../audio/stats';
import s from './Record.module.css';

export default function Record() {
  const { t } = useTranslation();
  const { isRecording, isPaused, permissionState } = useTrackState();
  const { devices, selectedInput, setSelectedInput, refreshDevices } = useDeviceStore();
  const [elapsed, setElapsed] = useState(0);
  const [recordSourceLabel, setRecordSourceLabel] = useState('Microphone');

  // 实时刷新计时器
  useEffect(() => {
    if (!isRecording) { setElapsed(0); return; }
    let raf = 0;
    const loop = () => {
      setElapsed(trackEngine.getElapsed());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isRecording]);

  // 进入页签时主动请求一次麦克风权限（让滚动波形能动）
  useEffect(() => {
    if (permissionState === 'idle') trackEngine.requestMic();
  }, [permissionState]);

  // 刷新设备列表
  useEffect(() => {
    refreshDevices();
  }, []);

  const inputDevices = devices.filter(d => d.kind === 'audioinput');

  // 探测系统回环设备（Stereo Mix / 立体声混音 / Wave Out 等）
  const loopbackKeywords = ['stereo mix', 'wave out', 'loopback', 'what u hear', '混音', '立体声'];
  const loopbackDevice = inputDevices.find(device =>
    loopbackKeywords.some(keyword => device.label.toLowerCase().includes(keyword))
  ) ?? null;
  const selectedInputDevice = selectedInput
    ? inputDevices.find(device => device.deviceId === selectedInput) ?? null
    : null;
  const selectedInputIsLoopback = selectedInputDevice
    ? loopbackKeywords.some(keyword => selectedInputDevice.label.toLowerCase().includes(keyword))
    : false;

  function confirmAudioSourceBeforeRecording(mode: 'main' | 'system'): boolean {
    if (mode === 'system' && loopbackDevice) {
      return true;
    }

    if (mode === 'main' && loopbackDevice && selectedInputIsLoopback) {
      return true;
    }

    const deviceLabel = selectedInputDevice?.label || t('record.defaultMic', 'Default Microphone');
    const message = mode === 'system'
      ? t('record.quickSystemAudioConfirm', 'No loopback device is configured in the Record panel. Continuing will only capture {{device}} and may result in video with no system audio. Continue anyway?', { device: deviceLabel })
      : t('record.recordSourceConfirm', 'The current Record panel source is {{device}}, not a configured system-audio loopback device. If you start now, you may get visuals only or no playback audio. Continue anyway?', { device: deviceLabel });
    return window.confirm(message);
  }

  function onMainClick() {
    if (!isRecording) {
      if (!confirmAudioSourceBeforeRecording('main')) {
        return;
      }
      trackEngine.startRecording(selectedInput ?? undefined);
    } else {
      trackEngine.stopRecording();
    }
  }

  function onDeviceChange(deviceId: string) {
    setSelectedInput(deviceId);
    if (!isRecording && permissionState === 'granted') {
      trackEngine.stopMic();
    }
  }

  function autoConfigSystemAudio() {
    if (loopbackDevice) {
      setSelectedInput(loopbackDevice.deviceId);
      return true;
    }
    return false;
  }

  /** 一键录制：自动选 loopback + 开始录制；找不到 loopback 时用默认麦克风。 */
  function quickRecordSystemAudio() {
    if (isRecording) {
      trackEngine.stopRecording();
      return;
    }
    if (!confirmAudioSourceBeforeRecording('system')) {
      return;
    }
    const deviceToUse = loopbackDevice ? loopbackDevice.deviceId : (selectedInput ?? undefined);
    if (loopbackDevice) {
      setSelectedInput(loopbackDevice.deviceId);
    }
    trackEngine.startRecording(deviceToUse);
  }

  return (
    <div className={s.layout}>
      {/* 控制区 */}
      <div className={`${s.panel} ${s.controls}`}>
        <h3 className={s.panelTitle}>
          <span className={s.triangle}>▶</span>
          {t('record.recordControl')}
          <span className={s.panelTitleEn}>Recorder</span>
        </h3>

        <div className={s.recordCircle}>
          <button
            className={`${s.recordBtn} ${isRecording ? s.recording : ''}`}
            onClick={onMainClick}
            disabled={permissionState === 'denied'}
          >
            {isRecording ? t('record.stopRec') : t('record.record_')}
          </button>

          <div className={s.timer}>{formatTime(elapsed)}</div>
          <div className={s.timerSub}>
            {!isRecording ? t('record.tipStartRecord') : isPaused ? t('record.paused') : t('record.recording')}
          </div>

          <div className={s.subBtns}>
            <button
              className={s.subBtn}
              onClick={() => isPaused ? trackEngine.resumeRecording() : trackEngine.pauseRecording()}
              disabled={!isRecording}
            >
              {isPaused ? t('record.resume') : t('record.pause')}
            </button>
          </div>

          {/* 一键录制系统音频卡片（独立 sub-panel） */}
          <div className={s.quickSystemAudio}>
            <div className={s.quickSystemAudioTitle}>
              {t('record.quickSystemAudioTitle')}
            </div>
            <div className={s.quickSystemAudioDesc}>
              {t('record.quickSystemAudioDesc')}
            </div>
            <div className={loopbackDevice ? s.quickSystemAudioStatusOk : s.quickSystemAudioStatusWarn}>
              {loopbackDevice
                ? t('record.quickSystemAudioReady', { name: loopbackDevice.label })
                : t('record.quickSystemAudioMissing')}
            </div>
            <button
              className={`${s.quickSystemAudioBtn} ${isRecording ? s.quickSystemAudioBtnRecording : ''}`}
              onClick={quickRecordSystemAudio}
              disabled={permissionState === 'denied'}
            >
              {isRecording ? t('record.quickSystemAudioStopBtn') : t('record.quickSystemAudioBtn')}
            </button>
          </div>

          {/* 录音源选择 */}
          <div className={s.recordSourcePanel}>
            <div className={s.recordSourceLabel}>{t('record.audioSource', 'Audio Source')}</div>
            <select
              className={s.recordSourceSelect}
              value={selectedInput || ''}
              onChange={event => onDeviceChange(event.target.value)}
            >
              <option value="">{t('record.defaultMic', 'Default Microphone')}</option>
              {inputDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
            <div className={s.recordSourceId}>
              {t('record.sourceId', 'Source ID')}: {isRecording ? trackEngine.currentRecordingLabel : selectedInput ? (inputDevices.find(d => d.deviceId === selectedInput)?.label || selectedInput.slice(0, 16) + '...') : t('record.defaultMic', 'Microphone')}
            </div>
            <button className={s.subBtn} onClick={async () => {
              const found = autoConfigSystemAudio();
              if (!found) {
                window.alert(t('record.noLoopbackFound', 'No system audio loopback device detected. Please enable Stereo Mix in Windows Sound settings > Recording devices, then right-click Show Disabled Devices.'));
                return;
              }
              // Auto-start recording with the configured device
              if (!isRecording) {
                trackEngine.startRecording(selectedInput ?? undefined);
              }
            }}>
              {t('record.autoConfigSystemAudio', 'Auto-Config & Record')}
            </button>
            <div className={s.recordSourceHint}>
              {t('record.loopbackHint', 'To record system audio, select "Stereo Mix", "Wave Out", or a loopback device above. Click the auto-config button to try automatic detection.')}
            </div>
          </div>

          <div className={s.permissionSlot}>
            {permissionState === 'denied' && (
              <div className={`${s.permissionHint} ${s.permissionDenied}`}>
                {t('record.permissionDenied')}
              </div>
            )}
            {permissionState === 'requesting' && (
              <div className={s.permissionHint}>{t('record.permissionRequesting')}</div>
            )}
          </div>
        </div>
      </div>

      {/* 实时滚动波形 */}
      <div className={`${s.panel} ${s.scroll}`}>
        <h3 className={s.panelTitle}>
          <span className={s.triangle}>▶</span>
          {t('record.scrollingWaveform')}
          <span className={s.panelTitleEn}>Live Scrolling</span>
        </h3>
        <ScrollingWaveform
          className={s.scrollCanvas}
          active={permissionState === 'granted'}
        />
      </div>

      {/* 轨道列表（录音 + 上传） */}
      <div className={`${s.panel} ${s.list}`}>
        <h3 className={s.panelTitle}>
          <span className={s.triangle}>▶</span>
          {t('record.tracksList')}
          <span className={s.panelTitleEn}>Tracks · drag handles to trim</span>
        </h3>
        <TrackList />
      </div>
    </div>
  );
}
