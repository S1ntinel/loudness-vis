import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { soundFieldAnalyser, SOUND_FIELD_BANDS } from '../audio/soundField';
import { cssVar } from '../theme';

/**
 * 声场分析球面板（俯视图）
 * - 头部图标固定在中心
 * - 4 个频段球围绕头部分布
 *   - 角度：pan ∈ [-1, 1] → 左到右扇区（前方为 12 点钟）
 *   - 距离：(1 - centerness) * radius（pan 越偏，离头部越远）
 *   - 大小：sqrt(energy) 决定半径
 *   - 颜色：频段固定色
 * - 平滑动画（球位置/大小用 lerp）
 */
export default function SoundField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 每个球的平滑状态（动画用）
  const ballsRef = useRef(SOUND_FIELD_BANDS.map(() => ({
    x: 0,    // 当前实际位置（相对中心，单位 = canvas 半径）
    y: 0,
    r: 0,    // 半径
  })));

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx2d = canvas.getContext('2d')!;

    function fit() {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(2, Math.round(r.width * dpr));
      canvas.height = Math.max(2, Math.round(r.height * dpr));
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    const onVis = () => { isVisible = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', onVis);

    let raf = 0;
    let lastProcessTime = 0;
    let isVisible = true;
    // 缓存 CSS 变量
    const cssGrid = cssVar('--grid-strong', 'rgba(35,50,90,0.10)');
    const cssText3 = cssVar('--text-3', '#888');
    const cssText2 = cssVar('--text-2', '#5a6273');
    function draw(now = performance.now()) {
      if (!isVisible) { raf = requestAnimationFrame(draw); return; }
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx2d.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2 + 8;     // 略向下偏，给上方"前方"留空间
      const radius = Math.min(w, h) * 0.40;

      // 网格圈
      const gridColor = cssGrid;
      ctx2d.strokeStyle = gridColor;
      ctx2d.lineWidth = 1;
      [0.4, 0.7, 1.0].forEach(rr => {
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, radius * rr, 0, Math.PI * 2);
        ctx2d.stroke();
      });
      // 十字轴
      ctx2d.beginPath();
      ctx2d.moveTo(cx - radius * 1.05, cy);
      ctx2d.lineTo(cx + radius * 1.05, cy);
      ctx2d.moveTo(cx, cy - radius * 1.05);
      ctx2d.lineTo(cx, cy + radius * 1.05);
      ctx2d.stroke();

      // 取实时频段数据
      if (engine.isPlaying && now - lastProcessTime >= 33) {
        soundFieldAnalyser.process();
        lastProcessTime = now;
      }
      const bands = soundFieldAnalyser.getBands();

      // 计算每个球的目标位置/大小，然后平滑插值
      for (let bi = 0; bi < SOUND_FIELD_BANDS.length; bi++) {
        const { L, R } = bands[bi];
        const energy = (L + R) * 0.5;
        const denom = L + R + 1e-9;
        const pan = (R - L) / denom;          // -1 全左 → +1 全右

        // 角度：pan = 0 正前方（12 点），pan = -1 正左（9 点），pan = +1 正右（3 点）
        // 在俯视图里，y 轴朝下、屏幕上方=听者前方
        const theta = Math.PI / 2 + pan * (Math.PI / 2);  // 90° 至 ±0°/180° 范围
        // 反过来：12 点 = 270°（屏幕上）= -π/2，3 点 = 0°，9 点 = π
        // 我们以正前方为 angle = -π/2，pan→ 偏移 angle = -π/2 + pan * π/2
        const angle = -Math.PI / 2 + pan * (Math.PI / 2);

        // 距离：能量越大越远（最大 = radius * 0.95）
        const energyNorm = Math.min(1, energy * 12); // ×12 经验缩放，让常见信号占满
        const dist = energyNorm * radius * 0.85;

        // 球大小
        const ballR = 6 + energyNorm * 14;

        // 平滑插值（每帧推进 ~0.25 倍）
        const ball = ballsRef.current[bi];
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        ball.x = ball.x * 0.75 + tx * 0.25;
        ball.y = ball.y * 0.75 + ty * 0.25;
        ball.r = ball.r * 0.75 + ballR * 0.25;
      }

      // 头部（在中心）
      ctx2d.fillStyle = cssText3;
      ctx2d.beginPath();
      ctx2d.ellipse(cx, cy, radius * 0.10, radius * 0.13, 0, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.strokeStyle = cssText2;
      ctx2d.lineWidth = 1;
      ctx2d.stroke();
      // 鼻尖（朝上 = 听者前方）
      ctx2d.fillStyle = cssText2;
      ctx2d.beginPath();
      ctx2d.moveTo(cx, cy - radius * 0.15);
      ctx2d.lineTo(cx - 4, cy - radius * 0.10);
      ctx2d.lineTo(cx + 4, cy - radius * 0.10);
      ctx2d.closePath();
      ctx2d.fill();

      // 球
      for (let bi = 0; bi < SOUND_FIELD_BANDS.length; bi++) {
        const band = SOUND_FIELD_BANDS[bi];
        const ball = ballsRef.current[bi];
        const x = cx + ball.x;
        const y = cy + ball.y;

        // 外发光
        ctx2d.fillStyle = band.color + '40';
        ctx2d.beginPath();
        ctx2d.arc(x, y, ball.r * 1.6, 0, Math.PI * 2);
        ctx2d.fill();
        // 主体
        ctx2d.fillStyle = band.color;
        ctx2d.beginPath();
        ctx2d.arc(x, y, ball.r, 0, Math.PI * 2);
        ctx2d.fill();
        // 标签
        ctx2d.fillStyle = '#fff';
        ctx2d.font = '10px MiSans, "Microsoft YaHei", sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.textBaseline = 'middle';
        ctx2d.fillText(band.label, x, y);
      }
      ctx2d.textAlign = 'start';
      ctx2d.textBaseline = 'alphabetic';

      // 方向标注
      ctx2d.fillStyle = cssText3;
      ctx2d.font = '11px MiSans, "Microsoft YaHei", sans-serif';
      ctx2d.textAlign = 'center';
      ctx2d.fillText('前 Front', cx, cy - radius * 1.05 - 4);
      ctx2d.fillText('后 Back',  cx, cy + radius * 1.05 + 14);
      ctx2d.textAlign = 'left';
      ctx2d.fillText('左 L', 4, cy + 4);
      ctx2d.textAlign = 'right';
      ctx2d.fillText('右 R', w - 4, cy + 4);
      ctx2d.textAlign = 'start';

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
