# LoudnessVis 续开发计划

## 项目概述

**项目名称**: LoudnessVis — 响度战争可视化分析器
**当前版本**: demo 0.2 (v0.2.0)
**技术栈**: React 18 + TypeScript + Vite 5 + Zustand + Electron 32
**Fork 位置**: `D:\loudness-vis\FoRk`

## 当前状态分析

### 已完成功能 (demo 0.2)

| 模块 | 状态 | 说明 |
|------|------|------|
| React Web 主界面 | ✅ | Vite + React + TS 主开发结构 |
| 分析 Tab | ✅ | 波形、频谱、声场、LUFS 指标 |
| 录音 Tab | ✅ | 多轨道编辑器、录音、上传 |
| 波形多频段染色 | ✅ | RGB 三频段 + 频谱重心 hue 映射 |
| LUFS 指标 | ✅ | Momentary / Short-term / Integrated / True Peak / LRA |
| 频响曲线多轨对比 | ✅ | 支持多条曲线叠加 |
| 声谱图 | ✅ | STFT 时频热图 + 准星 + 拖动播放头 |
| 声场分析球 | ✅ | 4 频段彩色球面模式 |
| 可视化算法整理 | ✅ | `Visualization algorithm/` 目录 |

### 未完成任务

| 优先级 | 任务 | 复杂度 | 依赖 |
|--------|------|--------|------|
| **P0** | 预设系统 (保存/切换/管理) | 中 | 无 |
| **P0** | 界面美化：圆角 + 背景对比度 | 低 | 无 |
| **P1** | 播放响度面板优化 (Gain 风格) | 中 | 无 |
| **P1** | 频谱波形图响度参考色与坐标优化 | 中 | 无 |
| **P1** | 波形图律动线荧光描边效果 | 中 | 无 |
| **P2** | 阶段 5: 系统设备 + 应用音量控制 | 高 | Electron |
| **P2** | 阶段 7: MV 编辑器 Tab | 高 | React Router |

## 开发计划

### Phase 1: 界面美化与预设系统 (当前重点)

**目标**: 完成用户最近提出的需求，提升 UI 品质

#### 1.1 界面圆角与背景对比度优化
- **文件**: `src/theme/tokens.css`, `src/tabs/Analyze/Analyze.module.css`, `src/tabs/Record/Record.module.css`
- **改动**:
  - 增大面板 `border-radius` (10px → 14px)
  - 提高 `--panel-bg` 对比度 (深色更黑、浅色更不透明)
  - 加重 `--panel-border` 边框
  - 添加 inset 高光做"嵌入感"
  - 指标卡片改为独立彩色卡 (每个有主题色条)

#### 1.2 预设系统
- **新文件**: `src/store/usePresetStore.ts`, `src/components/PresetBar.tsx`
- **改动**:
  - 定义 Preset 快照接口: `{ theme, colorMode, sfMode, waveRatio, viewStart, viewEnd }`
  - localStorage 持久化预设列表
  - 工具栏下方添加预设栏: `< 上一个 | 预设名 | 下一个 | 💾 | ⋯ >`
  - 支持: 加载、保存、重命名、删除预设

#### 1.3 播放响度面板优化 (Gain 风格)
- **文件**: `src/panels/LufsDisplay.tsx`
- **改动**:
  - 参考用户提供的图二，优化 Gain 设置方式
  - 改进 LUFS 显示布局和视觉层次

#### 1.4 频谱波形图优化
- **文件**: `src/panels/Spectrum.tsx`, `src/panels/Waveform.tsx`
- **改动**:
  - 优化响度参考色 (与指标卡片主题色对应)
  - 调整坐标轴样式
  - 浅色背景下频谱图背景保持深色

#### 1.5 波形图荧光描边效果
- **文件**: `src/panels/Waveform.tsx`
- **改动**:
  - 添加律动线的荧光描边 (glow effect)
  - 考虑深色/浅色状态下的可读性和对比度

### Phase 2: 系统设备控制 (阶段 5)

**目标**: 通过 Electron 实现系统音量控制

#### 2.1 Electron 主进程集成
- **文件**: `electron/main.cjs`, `electron/preload.cjs`
- **改动**:
  - 接入 Windows COM `IAudioSessionManager2`
  - 实现系统设备音量读取/设置
  - 预加载脚本暴露 API

#### 2.2 前端 UI
- **文件**: 新增 `src/components/VolumeControl.tsx`
- **改动**:
  - 系统音量滑块
  - 应用音量控制
  - 设备选择下拉

### Phase 3: MV 编辑器 (阶段 7)

**目标**: 独立的 MV 编辑路由

#### 3.1 路由架构
- **依赖**: 安装 `react-router-dom`
- **改动**:
  - 添加 `/analyze`, `/record`, `/mv` 路由
  - MV 编辑器作为独立模块

#### 3.2 Canvas MV 编辑
- **新目录**: `src/tabs/MV/`
- **功能**:
  - 视频帧 Canvas 渲染
  - 时间轴编辑
  - 视频导出

## 执行顺序

```
Phase 1 (立即开始)
  ├── 1.1 圆角 + 对比度 ──→ 1.2 预设系统
  ├── 1.3 播放面板优化 ──→ 1.4 频谱优化
  └── 1.5 荧光描边效果

Phase 2 (Phase 1 完成后)
  └── 2.1 Electron 集成 ──→ 2.2 前端 UI

Phase 3 (可选，Phase 2 完成后)
  └── 3.1 路由架构 ──→ 3.2 Canvas MV
```

## 验证清单

- [ ] 所有面板圆角统一为 14px
- [ ] 深色/浅色模式下背景对比度清晰
- [ ] 预设可保存、加载、删除
- [ ] 播放面板 Gain 风格正确显示
- [ ] 频谱图在浅色背景下保持深色背景
- [ ] 波形荧光描边在两种主题下都清晰
- [ ] `npm run build` 无错误
- [ ] `npm run dev` 功能正常

## 技术约束

1. **类型安全**: 禁止 `as any`, `@ts-ignore`
2. **错误处理**: 禁止空 catch 块
3. **测试**: 不删除失败测试
4. **提交**: 需用户明确请求才 commit
5. **依赖**: 优先使用现有依赖 (React, Zustand)
