// «Красивая» шкала оси Y: округляет максимум вверх до 1/2/2.5/5·10^k и
// возвращает равномерные засечки (0, 50, 100, …) — как на референс-макете.
export function niceScale(maxValue: number, tickCount = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return { max: 1, ticks: [0, 1] };
  }
  const rawStep = maxValue / tickCount;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  let stepMul: number;
  if (norm <= 1) stepMul = 1;
  else if (norm <= 2) stepMul = 2;
  else if (norm <= 2.5) stepMul = 2.5;
  else if (norm <= 5) stepMul = 5;
  else stepMul = 10;
  const step = stepMul * mag;
  const niceMax = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= niceMax + step * 1e-6; v += step) ticks.push(v);
  return { max: niceMax, ticks };
}

// Компактная подпись суммы для оси: 1 250 → «1.2k».
export function shortAmount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `${Math.round(n)}`;
}
