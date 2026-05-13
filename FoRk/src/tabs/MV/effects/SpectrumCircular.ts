import { MVEffect, RenderContext, AudioData } from './MVEffect';

export class SpectrumCircularEffect extends MVEffect {
  readonly type = 'spectrum-circular';
  readonly name = '圆形频谱';
  readonly description = '旋转的圆形频谱效果';
  
  private smoothedValues: number[] = [];
  private rotation: number = 0;
  
  render(context: RenderContext, audioData: AudioData): void {
    const { ctx, width, height, time } = context;
    const { frequencyData } = audioData;
    
    const count = this.getNumberParam('count', 64);
    const radius = this.getNumberParam('radius', 120);
    const innerRadius = this.getNumberParam('innerRadius', 40);
    const rotationSpeed = this.getNumberParam('rotation', 1) * 0.02;
    const sensitivity = this.getNumberParam('sensitivity', 1);
    const smoothing = this.getNumberParam('smoothing', 0.3);
    const glow = this.getNumberParam('glow', 0.6);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, this.getStringParam('colorA', this.getHSL(195, 80, 62)));
    gradient.addColorStop(1, this.getStringParam('colorB', this.getHSL(265, 80, 70)));
    const glowColor = this.getStringParam('glowColor', this.getStringParam('colorA', '#60a5fa'));
    
    // 初始化平滑值数组
    if (this.smoothedValues.length !== count) {
      this.smoothedValues = new Array(count).fill(0);
    }
    
    this.rotation += rotationSpeed;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const maxBarLength = Math.min(width, height) * 0.35 - radius;
    
    // 使用对数频率分布
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + this.rotation;
      
      // 计算频率范围
      const t1 = i / count;
      const t2 = (i + 1) / count;
      const f1 = Math.pow(10, logMin + t1 * (logMax - logMin));
      const f2 = Math.pow(10, logMin + t2 * (logMax - logMin));
      
      // 获取该频段的能量
      const energy = this.getFrequencyEnergy(frequencyData, f1, f2, audioData.sampleRate);
      
      // 平滑处理
       const targetLength = Math.min(1, energy * sensitivity * 2.2);
       this.smoothedValues[i] = this.smoothValue(
         this.smoothedValues[i],
         targetLength,
         smoothing
       );
      
      const barLength = this.smoothedValues[i] * maxBarLength;
      
      // 计算颜色
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.max(1, this.getNumberParam('lineWidth', 3));
      ctx.lineCap = 'round';
      
      // 绘制条形
      const x1 = centerX + Math.cos(angle) * innerRadius;
      const y1 = centerY + Math.sin(angle) * innerRadius;
      const x2 = centerX + Math.cos(angle) * (innerRadius + barLength);
      const y2 = centerY + Math.sin(angle) * (innerRadius + barLength);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      
      // 添加发光效果
      if (glow > 0.01 && this.smoothedValues[i] > 0.05) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 4 + glow * 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    
    // 绘制内圆
     ctx.strokeStyle = this.getStringParam('colorB', this.getHSL(220, 50, 50, 0.3));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
}
