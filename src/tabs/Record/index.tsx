import { useEffect, useState } from 'react';
import { recordEngine } from '../../audio/recordEngine';
import { useRecordState } from '../../audio/useRecordState';
import ScrollingWaveform from '../../panels/ScrollingWaveform';
import Recordings from '../../panels/Recordings';
import { formatTime } from '../../audio/stats';
import s from './Record.module.css';

export default function Record() {
  const { isRecording, isPaused, permissionState } = useRecordState();
  const [elapsed, setElapsed] = useState(0);

  // 实时刷新计时器
  useEffect(() => {
    if (!isRecording) { setElapsed(0); return; }
    let raf = 0;
    const loop = () => {
      setElapsed(recordEngine.getElapsed());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isRecording]);

  // 进入页签时主动请求一次麦克风权限（让滚动波形能动）
  useEffect(() => {
    if (permissionState === 'idle') recordEngine.requestMic();
    // 退出 Record tab 时不释放，保留滚动波形继续显示电平
  }, [permissionState]);

  function onMainClick() {
    if (!isRecording) recordEngine.startRecording();
    else recordEngine.stopRecording();
  }

  return (
    <div className={s.layout}>
      {/* 控制区 */}
      <div className={`${s.panel} ${s.controls}`}>
        <h3 className={s.panelTitle}>
          <span className={s.triangle}>▶</span>
          录音控制
          <span className={s.panelTitleEn}>Recorder</span>
        </h3>

        <div className={s.recordCircle}>
          <button
            className={`${s.recordBtn} ${isRecording ? s.recording : ''}`}
            onClick={onMainClick}
            disabled={permissionState === 'denied'}
          >
            {isRecording ? '停止' : '录制'}
          </button>

          <div className={s.timer}>{formatTime(elapsed)}</div>
          <div className={s.timerSub}>
            {!isRecording ? '点击中央按钮开始录制' : isPaused ? '已暂停' : '录制中…'}
          </div>

          <div className={s.subBtns}>
            <button
              className={s.subBtn}
              onClick={() => isPaused ? recordEngine.resumeRecording() : recordEngine.pauseRecording()}
              disabled={!isRecording}
            >
              {isPaused ? '恢复' : '暂停'}
            </button>
          </div>

          {permissionState === 'denied' && (
            <div className={`${s.permissionHint} ${s.permissionDenied}`}>
              麦克风权限被拒，浏览器地址栏设置中重新允许后刷新
            </div>
          )}
          {permissionState === 'requesting' && (
            <div className={s.permissionHint}>正在请求麦克风权限…</div>
          )}
        </div>
      </div>

      {/* 实时滚动波形 */}
      <div className={`${s.panel} ${s.scroll}`}>
        <h3 className={s.panelTitle}>
          <span className={s.triangle}>▶</span>
          实时滚动波形
          <span className={s.panelTitleEn}>Live Scrolling</span>
        </h3>
        <ScrollingWaveform
          className={s.scrollCanvas}
          active={permissionState === 'granted'}
        />
      </div>

      {/* 录音列表 */}
      <div className={`${s.panel} ${s.list}`}>
        <h3 className={s.panelTitle}>
          <span className={s.triangle}>▶</span>
          录音列表
          <span className={s.panelTitleEn}>Recordings</span>
        </h3>
        <Recordings />
      </div>
    </div>
  );
}
