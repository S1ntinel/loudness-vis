import { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMVStore, type MVRecordingFormatId } from '../../../store/useMVStore';
import { useMVAssetsStore } from '../../../store/useMVAssetsStore';
import s from './RecordPanel.module.css';

type ExportPresetId =
  | 'bilibili-1080p'
  | 'youtube-1080p'
  | 'youtube-4k'
  | 'douyin-vertical'
  | 'archive'
  | 'custom-mp4';

interface ExportPreset {
  id: ExportPresetId;
  label: string;
  width: number; // 0 = 跟随 stage canvas
  height: number;
  fps: number;
  bitrate: number;
  mimeType: string;
  extension: string;
  formatId: MVRecordingFormatId;
}

const PRESETS: ExportPreset[] = [
  { id: 'bilibili-1080p', label: 'B站 1080p · 8Mbps', width: 1920, height: 1080, fps: 60, bitrate: 8_000_000, mimeType: 'video/webm;codecs=vp9', extension: 'webm', formatId: 'webm-vp9' },
  { id: 'youtube-1080p', label: 'YouTube 1080p · 12Mbps', width: 1920, height: 1080, fps: 60, bitrate: 12_000_000, mimeType: 'video/webm;codecs=vp9', extension: 'webm', formatId: 'webm-vp9' },
  { id: 'youtube-4k', label: 'YouTube 4K · 35Mbps', width: 3840, height: 2160, fps: 60, bitrate: 35_000_000, mimeType: 'video/webm;codecs=vp9', extension: 'webm', formatId: 'webm-vp9' },
  { id: 'douyin-vertical', label: '抖音竖屏 1080×1920 · 6Mbps', width: 1080, height: 1920, fps: 30, bitrate: 6_000_000, mimeType: 'video/webm;codecs=vp9', extension: 'webm', formatId: 'webm-vp9' },
  { id: 'archive', label: '归档 · 跟随画面 · 20Mbps', width: 0, height: 0, fps: 60, bitrate: 20_000_000, mimeType: 'video/webm;codecs=vp9', extension: 'webm', formatId: 'webm-vp9' },
  { id: 'custom-mp4', label: 'MP4 / H.264（若环境支持）· 6Mbps', width: 0, height: 0, fps: 60, bitrate: 6_000_000, mimeType: 'video/mp4;codecs=h264', extension: 'mp4', formatId: 'mp4' },
];

function getAvailablePresets(): ExportPreset[] {
  if (typeof MediaRecorder === 'undefined') return [];
  return PRESETS.filter(p => MediaRecorder.isTypeSupported(p.mimeType));
}

function buildFileName(title: string, artist: string, preset: ExportPreset): string {
  const safe = `${title.trim() || 'Untitled'} - ${artist.trim() || 'Unknown'}`.replace(/[<>:"/\\|?*]+/g, '-');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `${safe}-${preset.id}-${ts}.${preset.extension}`;
}

export default function RecordPanel() {
  const { t } = useTranslation();
  const { isRecording, setRecording, text } = useMVStore();
  const activeAudioId = useMVAssetsStore(state => state.activeAudioId);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedPreset, setRecordedPreset] = useState<ExportPreset | null>(null);
  const [recordTime, setRecordTime] = useState(0);
  const [presetId, setPresetId] = useState<ExportPresetId>('bilibili-1080p');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerStartRef = useRef<number>(0);
  const intervalRef = useRef<number>(0);
  const scalerRafRef = useRef<number>(0);
  const scalerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const availablePresets = useMemo(() => getAvailablePresets(), []);
  const selectedPreset = availablePresets.find(p => p.id === presetId) ?? availablePresets[0];

  const startRecording = useCallback(() => {
    const stageCanvas = document.querySelector<HTMLCanvasElement>('canvas[data-mv-stage="true"]');
    if (!stageCanvas || !selectedPreset) return;

    const shouldContinue = window.confirm(
      activeAudioId
        ? t('mv.recordAudioConfirm', 'The current MV export still records canvas video only. If you need audible playback, first complete the audio capture / routing setup in the Record panel, or this export may contain picture only. Continue?')
        : t('mv.recordNoAudioConfirm', 'No MV audio asset or Record-panel audio capture configuration is ready. Starting now will export picture only. Continue?')
    );
    if (!shouldContinue) return;

    let stream: MediaStream;
    if (selectedPreset.width === 0 || selectedPreset.height === 0) {
      // 直接录制 stage canvas
      stream = stageCanvas.captureStream(selectedPreset.fps);
    } else {
      // offscreen canvas 缩放到目标分辨率
      const offscreen = document.createElement('canvas');
      offscreen.width = selectedPreset.width;
      offscreen.height = selectedPreset.height;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;
      scalerCanvasRef.current = offscreen;
      const tick = () => {
        if (!scalerCanvasRef.current) return;
        offCtx.fillStyle = '#000';
        offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
        const sw = stageCanvas.width;
        const sh = stageCanvas.height;
        if (sw > 0 && sh > 0) {
          const srcRatio = sw / sh;
          const dstRatio = offscreen.width / offscreen.height;
          let drawW: number, drawH: number, dx = 0, dy = 0;
          if (srcRatio > dstRatio) {
            // src 更宽，按高度对齐，左右留黑边
            drawH = offscreen.height;
            drawW = drawH * srcRatio;
            dx = (offscreen.width - drawW) / 2;
          } else {
            drawW = offscreen.width;
            drawH = drawW / srcRatio;
            dy = (offscreen.height - drawH) / 2;
          }
          offCtx.drawImage(stageCanvas, dx, dy, drawW, drawH);
        }
        scalerRafRef.current = requestAnimationFrame(tick);
      };
      scalerRafRef.current = requestAnimationFrame(tick);
      stream = offscreen.captureStream(selectedPreset.fps);
    }

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedPreset.mimeType,
      videoBitsPerSecond: selectedPreset.bitrate,
    });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: selectedPreset.mimeType });
      setRecordedBlob(blob);
      setRecordedPreset(selectedPreset);
      setRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = 0;
      }
      if (scalerRafRef.current) {
        cancelAnimationFrame(scalerRafRef.current);
        scalerRafRef.current = 0;
      }
      scalerCanvasRef.current = null;
    };

    mediaRecorder.start(100);
    setRecording(true);
    setRecordTime(0);
    timerStartRef.current = Date.now();
    intervalRef.current = window.setInterval(() => {
      setRecordTime((Date.now() - timerStartRef.current) / 1000);
    }, 100);
  }, [activeAudioId, selectedPreset, setRecording, t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const downloadVideo = useCallback(() => {
    if (!recordedBlob || !recordedPreset) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildFileName(text.songTitle, text.artistName, recordedPreset);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [recordedBlob, recordedPreset, text]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className={s.panel}>
      <h3 className={s.title}>{t('mv.record')}</h3>
      <label className={s.formatRow}>
        <span>{t('mv.exportPreset')}</span>
        <select
          className={s.formatSelect}
          value={selectedPreset?.id ?? ''}
          disabled={isRecording || availablePresets.length === 0}
          onChange={event => setPresetId(event.target.value as ExportPresetId)}
        >
          {availablePresets.map(p => (
            <option key={p.id} value={p.id}>{t(`mv.exportPresets.${p.id}`, p.label)}</option>
          ))}
        </select>
      </label>

      <div className={s.controls}>
        {!isRecording ? (
          <button
            className={s.recordBtn}
            onClick={startRecording}
            disabled={!selectedPreset || !document.querySelector('canvas[data-mv-stage="true"]')}
          >
            {t('mv.startRecord')}
          </button>
        ) : (
          <button
            className={`${s.recordBtn} ${s.recording}`}
            onClick={stopRecording}
          >
            {t('mv.stopRecord')} ({formatTime(recordTime)})
          </button>
        )}
      </div>

      {isRecording && (
        <div className={s.recordingIndicator}>
          <span className={s.recordingDot} />
          {selectedPreset?.width
            ? t('mv.recordingFmt', { w: selectedPreset.width, h: selectedPreset.height, fps: selectedPreset.fps })
            : t('mv.recordingFollow')}
        </div>
      )}

      {recordedBlob && !isRecording && recordedPreset && (
        <div className={s.result}>
          <p className={s.resultText}>
            {t('mv.recordingComplete')}
            <br />{t('mv.duration')}: {formatTime(recordTime)}
            <br />{t('mv.size')}: {(recordedBlob.size / 1024 / 1024).toFixed(2)} MB
            <br />{t('mv.preset_')}: {t(`mv.exportPresets.${recordedPreset.id}`, recordedPreset.label)}
          </p>
          <button className={s.downloadBtn} onClick={downloadVideo}>{t('mv.downloadVideo')}</button>
          <button
            className={s.clearBtn}
            onClick={() => { setRecordedBlob(null); setRecordedPreset(null); setRecordTime(0); }}
          >
            {t('mv.clearRecord')}
          </button>
        </div>
      )}

      <div className={s.info}>
        <p>{t('mv.recordTips')}</p>
        <ul>
          <li>{t('mv.recordTip1')}</li>
          <li>{t('mv.recordTip2')}</li>
          <li>{t('mv.recordTip3')}</li>
          <li>{t('mv.recordTip4')}</li>
        </ul>
      </div>
    </div>
  );
}
