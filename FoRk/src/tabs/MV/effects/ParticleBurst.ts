import { MVEffect, RenderContext, AudioData } from './MVEffect';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

export class ParticleBurstEffect extends MVEffect {
  readonly type = 'particle-burst';
  readonly name = '粒子爆发';
  readonly description = '音频驱动的粒子爆发效果';
  
  private particles: Particle[] = [];
  private lastEnergy: number = 0;
  
  render(context: RenderContext, audioData: AudioData): void {
    const { ctx, width, height } = context;
    const { frequencyData, sampleRate } = audioData;
    
    const density = this.getNumberParam('density', 50);
    const speed = this.getNumberParam('speed', 60);
    const baseSize = this.getNumberParam('size', 3);
    const gravity = this.getNumberParam('gravity', 20) * 0.01;
    
    // 计算整体能量
    const bassEnergy = this.getFrequencyEnergy(frequencyData, 20, 200, sampleRate);
    const midEnergy = this.getFrequencyEnergy(frequencyData, 200, 2000, sampleRate);
    const trebleEnergy = this.getFrequencyEnergy(frequencyData, 2000, 20000, sampleRate);
    const totalEnergy = (bassEnergy + midEnergy + trebleEnergy) / 3;
    
    // 检测节拍（能量突变）
    const energyDelta = totalEnergy - this.lastEnergy;
    this.lastEnergy = totalEnergy;
    
    // 生成新粒子
    if (energyDelta > 0.1 || totalEnergy > 0.6) {
      const spawnCount = Math.floor(totalEnergy * density * 0.5);
      for (let i = 0; i < spawnCount; i++) {
        this.spawnParticle(width, height, totalEnergy, speed, baseSize);
      }
    }
    
    // 更新和绘制粒子
    this.particles = this.particles.filter(p => {
      // 更新位置
      p.x += p.vx;
      p.y += p.vy;
      p.vy += gravity;
      p.life--;
      
      // 绘制
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio * 0.8;
      const size = p.size * lifeRatio;
      
      if (size > 0.5) {
        ctx.fillStyle = this.getHSL(p.hue, 80, 60, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // 发光效果
        ctx.shadowColor = this.getStringParam('glowColor', this.getHSL(p.hue, 80, 60, alpha * 0.5));
        ctx.shadowBlur = size * 2;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      return p.life > 0;
    });
  }
  
  private spawnParticle(width: number, height: number, energy: number, speed: number, baseSize: number) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = (Math.random() * 0.5 + 0.5) * speed * energy;
    const hue = this.getNumberParam('hue', 210) + Math.random() * 60 - 30;
    
    this.particles.push({
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 60 + Math.random() * 60,
      maxLife: 120,
      size: baseSize * (0.5 + Math.random()) * (1 + energy),
      hue,
    });
  }
}
