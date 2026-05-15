import { MVEffect, RenderContext, AudioData } from './MVEffect';

export class SpectrumBarEffect extends MVEffect {
  readonly type = 'spectrum-bar';
  readonly name = '条形频谱';
  readonly description = '经典的条形频谱效果';
  
  private smoothedValues: number[] = [];
  
  render(context: RenderContext, audioData: AudioData): void {
    const { ctx, width, height } = context;
    const { frequencyData } = audioData;
    
    const count = this.getNumberParam('count', 64);
    const preferredBarWidth = this.getNumberParam('width', 8);
    const gap = this.getNumberParam('gap', 2);
    const radius = this.getNumberParam('radius', 2);
    const direction = this.getNumberParam('direction', 0); // 0: 向上, 1: 向下, 2: 双向
    const fitWidth = this.getNumberParam('fitWidth', 1);
    const fillHeight = this.getNumberParam('fillHeight', 0.7);
    const offsetX = this.getNumberParam('offsetX', 0);
    const offsetY = this.getNumberParam('offsetY', 0);
    const scale = this.getNumberParam('scale', 1);
    const glow = this.getNumberParam('glow', 0.6);
    const smoothing = this.getNumberParam('smoothing', 0.3);
    const sensitivity = this.getNumberParam('sensitivity', 1);
    const gradient = ctx.createLinearGradient(0, height, width, 0);
    gradient.addColorStop(0, this.getStringParam('colorA', this.getHSL(200, 80, 58)));
    gradient.addColorStop(1, this.getStringParam('colorB', this.getHSL(230, 80, 70)));
    const glowColor = this.getStringParam('glowColor', this.getStringParam('colorA', '#60a5fa'));
    
    // 初始化平滑值数组
    if (this.smoothedValues.length !== count) {
      this.smoothedValues = new Array(count).fill(0);
    }
    
    const frameWidth = width * scale;
    const frameHeight = height * scale;
    const centerX = width / 2 + offsetX * width;
    const centerY = height / 2 + offsetY * height;

    const barWidth = fitWidth > 0
      ? Math.max(1, (frameWidth - gap * (count - 1)) / count)
      : preferredBarWidth;
    const totalWidth = count * barWidth + gap * (count - 1);
    const startX = centerX - totalWidth / 2;
    const maxBarHeight = frameHeight * fillHeight;
    
    // 使用对数频率分布
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    
    for (let i = 0; i < count; i++) {
      // 计算频率范围
      const t1 = i / count;
      const t2 = (i + 1) / count;
      const f1 = Math.pow(10, logMin + t1 * (logMax - logMin));
      const f2 = Math.pow(10, logMin + t2 * (logMax - logMin));
      
      // 获取该频段的能量
      const energy = this.getFrequencyEnergy(frequencyData, f1, f2, audioData.sampleRate);
      
      // 平滑处理
       const targetHeight = Math.min(1, energy * sensitivity * 2.2);
       this.smoothedValues[i] = this.smoothValue(
         this.smoothedValues[i],
         targetHeight,
         smoothing
       );
      
      const barHeight = this.smoothedValues[i] * maxBarHeight;
      const x = startX + i * (barWidth + gap);
      
      // 计算颜色
      ctx.fillStyle = gradient;
      
      // 绘制条形
      if (direction === 0) {
        // 向上
        this.roundRect(ctx, x, centerY + frameHeight / 2 - barHeight, barWidth, barHeight, radius);
      } else if (direction === 1) {
        // 向下
        this.roundRect(ctx, x, centerY - frameHeight / 2, barWidth, barHeight, radius);
      } else {
        // 双向
        const halfHeight = barHeight / 2;
        this.roundRect(ctx, x, centerY - halfHeight, barWidth, barHeight, radius);
      }
      
      ctx.fill();
      
      // 添加发光效果
      if (glow > 0.01 && this.smoothedValues[i] > 0.05) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 4 + glow * 22;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }
  
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
