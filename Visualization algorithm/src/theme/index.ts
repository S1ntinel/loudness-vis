// 工具：读取当前 body 上某个 CSS 变量（绘 canvas 用）
export function cssVar(name: string, fallback = ''): string {
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v || fallback;
}
