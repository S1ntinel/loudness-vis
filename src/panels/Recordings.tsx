import { useState } from 'react';
import { recordEngine, type Recording } from '../audio/recordEngine';
import { useRecordState } from '../audio/useRecordState';
import { engine } from '../audio/engine';
import { useUIStore } from '../store';
import { blobToWav } from '../audio/wavEncoder';
import { formatTime } from '../audio/stats';
import s from '../tabs/Record/Record.module.css';

export default function Recordings() {
  const { recordings } = useRecordState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const setTab = useUIStore(st => st.setTab);
  const setFileName = useUIStore(st => st.setFileName);

  if (recordings.length === 0) {
    return <div className={s.recEmpty}>暂无录音</div>;
  }

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function exportWav(rec: Recording) {
    try {
      const wav = await blobToWav(rec.blob, engine.ctx);
      downloadBlob(wav, rec.name + '.wav');
    } catch (e) {
      alert('导出失败：' + (e as Error).message);
    }
  }
  function exportRaw(rec: Recording) {
    const ext = rec.blob.type.includes('webm') ? '.webm' : '.bin';
    downloadBlob(rec.blob, rec.name + ext);
  }

  async function sendToAnalyze(rec: Recording) {
    const file = new File([rec.blob], rec.name + '.webm', { type: rec.blob.type });
    const r = await engine.loadFile(file);
    if (r.ok) {
      setFileName(rec.name);
      setTab('analyze');
    } else {
      alert('解码失败：' + (r.error || ''));
    }
  }

  function startEdit(rec: Recording) {
    setEditingId(rec.id);
    setDraftName(rec.name);
  }
  function commitEdit(id: string) {
    if (draftName.trim()) recordEngine.rename(id, draftName.trim());
    setEditingId(null);
  }

  return (
    <div className={s.recList}>
      {recordings.map(rec => (
        <div key={rec.id} className={s.recItem}>
          <div className={s.recName}>
            {editingId === rec.id ? (
              <input
                autoFocus
                className={s.recNameInput}
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                onBlur={() => commitEdit(rec.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit(rec.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            ) : (
              <span onDoubleClick={() => startEdit(rec)}>{rec.name}</span>
            )}
          </div>
          <div className={s.recDuration}>{formatTime(rec.duration)}</div>
          <div className={s.recActions}>
            <button className={s.recBtn} onClick={() => sendToAnalyze(rec)}>送入分析</button>
            <button className={s.recBtn} onClick={() => exportWav(rec)}>导出 WAV</button>
            <button className={s.recBtn} onClick={() => exportRaw(rec)}>原始</button>
            <button className={s.recBtn} onClick={() => startEdit(rec)}>改名</button>
            <button className={`${s.recBtn} ${s.recBtnDanger}`} onClick={() => recordEngine.remove(rec.id)}>删除</button>
          </div>
        </div>
      ))}
    </div>
  );
}
