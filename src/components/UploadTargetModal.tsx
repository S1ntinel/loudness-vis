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
  const { pendingUpload, setPendingUpload, setFileName, setTab } = useUIStore();
  if (!pendingUpload) return null;

  async function sendToAnalyze() {
    const file = pendingUpload!;
    setPendingUpload(null);
    setFileName(file.name);
    setTab('analyze');
    const r = await engine.loadFile(file);
    if (!r.ok) setFileName('解码失败：' + (r.error || ''));
  }

  async function sendToTracks() {
    const file = pendingUpload!;
    setPendingUpload(null);
    setTab('record');
    const t = await trackEngine.addTrackFromFile(file);
    if (!t) alert('解码失败');
  }

  function cancel() {
    setPendingUpload(null);
  }

  return (
    <div className={s.backdrop} onClick={cancel}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <h2 className={s.title}>选择上传目标</h2>
        <div className={s.fileName}>{pendingUpload.name}</div>

        <div className={s.options}>
          <button className={`${s.option} ${s.optAnalyze}`} onClick={sendToAnalyze}>
            <div className={s.optIcon}>📊</div>
            <div className={s.optName}>送入分析</div>
            <div className={s.optDesc}>替换当前分析面板的音频，看波形 / 频响 / 指标</div>
          </button>
          <button className={`${s.option} ${s.optTracks}`} onClick={sendToTracks}>
            <div className={s.optIcon}>🎚</div>
            <div className={s.optName}>送入轨道</div>
            <div className={s.optDesc}>加入录音 Tab 的轨道列表，可以截取片段并导出</div>
          </button>
        </div>

        <button className={s.cancel} onClick={cancel}>取消</button>
      </div>
    </div>
  );
}
