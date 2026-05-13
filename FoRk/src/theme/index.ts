// 工具：读取当前 body 上某个 CSS 变量（绘 canvas 用）
// body 上的变量优先级高于 :root（支持 dark 模式和预设覆盖）
export function cssVar(name: string, fallback = ''): string {
  const body = getComputedStyle(document.body).getPropertyValue(name).trim();
  if (body) return body;
  const root = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return root || fallback;
}
