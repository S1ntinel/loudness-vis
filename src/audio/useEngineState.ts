import { useEffect, useState } from 'react';
import { engine } from './engine';

/** 订阅 engine 的状态变化，让组件触发重渲染 */
export function useEngineState() {
  const [tick, setTick] = useState(0);
  useEffect(() => engine.subscribe(() => setTick(v => v + 1)), []);
  return {
    audioBuffer: engine.audioBuffer,
    isPlaying: engine.isPlaying,
    pauseOffset: engine.pauseOffset,
    waveformPeaks: engine.waveformPeaks,
    _tick: tick, // 强制刷新依赖
  };
}
