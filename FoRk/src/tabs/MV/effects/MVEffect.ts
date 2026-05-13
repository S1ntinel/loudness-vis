export type EffectParamValue = string | number | boolean;
export type EffectParams = Record<string, EffectParamValue>;

export interface AudioData {
  frequencyData: Float32Array;
  waveformData: Float32Array;
  waveformDataR: Float32Array;
  sampleRate: number;
  peak: number;
  rms: number;
  bassEnergy: number;
  midEnergy: number;
  trebleEnergy: number;
  rmsLevel: number;
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  time: number;
  deltaTime: number;
}

export abstract class MVEffect {
  abstract readonly type: string;
  abstract readonly name: string;
  abstract readonly description: string;
  
  protected params: EffectParams = {};
  protected enabled: boolean = true;
  
  constructor(params: EffectParams = {}) {
    this.params = params;
  }
  
  setParams(params: EffectParams) {
    this.params = { ...this.params, ...params };
  }
  
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
  
  abstract render(context: RenderContext, audioData: AudioData): void;
  
  // 辅助方法：获取颜色
  protected getHSL(hue: number, saturation: number, lightness: number, alpha: number = 1): string {
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
  }
  
  // 辅助方法：获取频谱能量（按频率范围）
  protected getFrequencyEnergy(frequencyData: Float32Array, minFreq: number, maxFreq: number, sampleRate: number): number {
    const nyquist = sampleRate / 2;
    const minBin = Math.floor((minFreq / nyquist) * frequencyData.length);
    const maxBin = Math.floor((maxFreq / nyquist) * frequencyData.length);
    
    let sum = 0;
    let count = 0;
    for (let i = minBin; i <= maxBin && i < frequencyData.length; i++) {
      sum += frequencyData[i];
      count++;
    }
    
    return count > 0 ? sum / count : 0;
  }
  
  // 辅助方法：平滑值
  protected smoothValue(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
  }

  protected getNumberParam(name: string, fallback: number): number {
    const value = this.params[name];
    return typeof value === 'number' ? value : fallback;
  }

  protected getStringParam(name: string, fallback: string): string {
    const value = this.params[name];
    return typeof value === 'string' ? value : fallback;
  }

  protected getBooleanParam(name: string, fallback: boolean): boolean {
    const value = this.params[name];
    return typeof value === 'boolean' ? value : fallback;
  }
}
