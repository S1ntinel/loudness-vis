import { useEffect, useRef, useCallback } from 'react';
import { useMVStore } from '../../../store/useMVStore';
import { useMVAssetsStore } from '../../../store/useMVAssetsStore';
import { engine } from '../../../audio/engine';
import { createEffect } from '../effects/EffectFactory';
import { AudioData, RenderContext } from '../effects/MVEffect';
import s from './Stage.module.css';

function getBandEnergy(data: Float32Array, minFreq: number, maxFreq: number, sampleRate: number): number {
  const nyquist = sampleRate / 2;
  const minBin = Math.max(0, Math.floor((minFreq / nyquist) * data.length));
  const maxBin = Math.min(data.length - 1, Math.floor((maxFreq / nyquist) * data.length));
  let sum = 0;
  let count = 0;
  for (let i = minBin; i <= maxBin; i++) {
    sum += data[i];
    count++;
  }
  return count > 0 ? sum / count : 0;
}

export default function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectsRef = useRef<Map<number, ReturnType<typeof createEffect>>>(new Map());
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const linearSpectrumRef = useRef<Float32Array>(new Float32Array(engine.specBuf.length));
  const emptyWaveRef = useRef<Float32Array>(new Float32Array(engine.lBuf.length));
  
  const { slots, global, isPlaying } = useMVStore();
  const hasVisualAsset = useMVAssetsStore(s => s.activeVideoId !== null || s.activeImageId !== null);
  
  // 更新效果实例
  useEffect(() => {
    const currentEffects = effectsRef.current;
    
    // 移除不再需要的效果
    currentEffects.forEach((effect, slotId) => {
      const slot = slots.find(s => s.id === slotId);
      if (!slot || slot.type === 'none') {
        currentEffects.delete(slotId);
      }
    });
    
    // 添加或更新效果
    slots.forEach(slot => {
      if (slot.type === 'none') return;
      
      const existingEffect = currentEffects.get(slot.id);
      if (!existingEffect || existingEffect.type !== slot.type) {
        const newEffect = createEffect(slot.type, { ...slot.params, ...global });
        if (newEffect) {
          newEffect.setEnabled(slot.enabled);
          currentEffects.set(slot.id, newEffect);
        }
      } else {
        existingEffect.setParams({ ...slot.params, ...global });
        existingEffect.setEnabled(slot.enabled);
      }
    });
  }, [slots, global]);
  
  // 渲染循环
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // 确保画布尺寸正确
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }
    
    const width = rect.width;
    const height = rect.height;
    
    // 获取音频数据
    let audioData: AudioData;
    if (engine.isPlaying && engine.specAna) {
      engine.specAna.getFloatFrequencyData(engine.specBuf);
      engine.lAna.getFloatTimeDomainData(engine.lBuf);
      engine.rAna.getFloatTimeDomainData(engine.rBuf);
      
      // 转换频谱数据到线性幅度
      const frequencyData = linearSpectrumRef.current.length === engine.specBuf.length
        ? linearSpectrumRef.current
        : new Float32Array(engine.specBuf.length);
      linearSpectrumRef.current = frequencyData;
      for (let i = 0; i < engine.specBuf.length; i++) {
        frequencyData[i] = Math.pow(10, engine.specBuf[i] / 20);
      }
      
      // 计算峰值和RMS
      let peak = 0;
      let sum = 0;
      for (let i = 0; i < engine.lBuf.length; i++) {
        const abs = Math.abs(engine.lBuf[i]);
        peak = Math.max(peak, abs);
        sum += abs * abs;
      }
      const rms = Math.sqrt(sum / engine.lBuf.length);
      const bassEnergy = getBandEnergy(frequencyData, 20, 250, engine.ctx.sampleRate);
      const midEnergy = getBandEnergy(frequencyData, 250, 2500, engine.ctx.sampleRate);
      const trebleEnergy = getBandEnergy(frequencyData, 2500, 20000, engine.ctx.sampleRate);
      
      audioData = {
        frequencyData,
        waveformData: engine.lBuf,
        waveformDataR: engine.rBuf,
        sampleRate: engine.ctx.sampleRate,
        peak,
        rms,
        bassEnergy,
        midEnergy,
        trebleEnergy,
        rmsLevel: rms,
      };
    } else {
      // 没有音频时提供空数据
      audioData = {
        frequencyData: linearSpectrumRef.current,
        waveformData: emptyWaveRef.current,
        waveformDataR: emptyWaveRef.current,
        sampleRate: 48000,
        peak: 0,
        rms: 0,
        bassEnergy: 0,
        midEnergy: 0,
        trebleEnergy: 0,
        rmsLevel: 0,
      };
    }
    
    // 更新时间
    const now = performance.now();
    const deltaTime = (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;
    timeRef.current += deltaTime;
    
    const renderContext: RenderContext = {
      ctx,
      width,
      height,
      time: timeRef.current,
      deltaTime,
    };
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 按顺序渲染效果
    const sortedEffects = Array.from(effectsRef.current.entries())
      .sort(([a], [b]) => a - b);
    
    for (const [, effect] of sortedEffects) {
      if (effect) {
        effect.render(renderContext, audioData);
      }
    }
    
    rafRef.current = requestAnimationFrame(render);
  }, []);
  
  // 启动渲染循环（始终渲染，让视频/图片在未播音频时也可预览）
  useEffect(() => {
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [render]);
  
  return (
    <div className={s.stageContainer}>
      <canvas
        ref={canvasRef}
        data-mv-stage="true"
        className={s.canvas}
        style={{ width: '100%', height: '100%' }}
      />
      {!isPlaying && !hasVisualAsset && (
        <div className={s.overlay}>
          <div className={s.playHint}>
            <span className={s.playIcon}>▶</span>
            <p>播放音频以开始可视化</p>
          </div>
        </div>
      )}
    </div>
  );
}
