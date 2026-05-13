import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store';
import { engine } from '../audio/engine';
import { trackEngine } from '../audio/trackEngine';
import s from './UploadTargetModal.module.css';

/**
 * 上传后让用户选择目标：
 * - 送入分析 → engine.loadFile（替换当前分析音频）
 * - 送入轨道 → trackEngine.addTrackFromFile（加入录音 Tab 列表）
 */
export default function UploadTargetModal() {
  const { t } = useTranslation();
  const { pendingUpload, setPendingUpload, setFileName, setTab } = useUIStore();
  if (!pendingUpload) return null;

  async function sendToAnalyze() {
    const file = pendingUpload!;
    setPendingUpload(null);
    setFileName(file.name);
    setTab('analyze');
    const r = await engine.loadFile(file);
    if (!r.ok) setFileName(t('upload.decodeFailFmt', { msg: r.error || '' }));
  }

  async function sendToTracks() {
    const file = pendingUpload!;
    setPendingUpload(null);
    setTab('record');
    const track = await trackEngine.addTrackFromFile(file);
    if (!track) alert(t('upload.decodeFailShort'));
  }

  function cancel() {
    setPendingUpload(null);
  }

  return (
    <div className={s.backdrop} onClick={cancel}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <h2 className={s.title}>{t('upload.title')}</h2>
        <div className={s.fileName}>{pendingUpload.name}</div>

        <div className={s.options}>
          <button className={`${s.option} ${s.optAnalyze}`} onClick={sendToAnalyze}>
            <div className={s.optIcon}>📊</div>
            <div className={s.optName}>{t('upload.toAnalyze')}</div>
            <div className={s.optDesc}>{t('upload.toAnalyzeDesc')}</div>
          </button>
          <button className={`${s.option} ${s.optTracks}`} onClick={sendToTracks}>
            <div className={s.optIcon}>🎚</div>
            <div className={s.optName}>{t('upload.toTracks')}</div>
            <div className={s.optDesc}>{t('upload.toTracksDesc')}</div>
          </button>
        </div>

        <button className={s.cancel} onClick={cancel}>{t('upload.cancel')}</button>
      </div>
    </div>
  );
}
