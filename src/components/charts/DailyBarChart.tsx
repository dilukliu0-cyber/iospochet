import { Fragment } from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { niceScale, shortAmount } from './chartScale';

type Props = {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
};

const VW = 340;

// Расходы по дням: вертикальные столбцы с осями (диаграмма №4).
export function DailyBarChart({ data, labels, height = 190, color = colors.accent }: Props) {
  if (data.length === 0) {
    return <View style={{ height }} />;
  }

  const padL = 40;
  const padR = 8;
  const padT = 12;
  const padB = 24;
  const plotW = VW - padL - padR;
  const plotH = height - padT - padB;

  const { max: niceMax, ticks } = niceScale(Math.max(...data, 1));
  const n = data.length;
  const slot = plotW / n;
  const barW = Math.max(2, Math.min(slot * 0.6, 14));
  const baseY = padT + plotH;

  const labelCount = Math.min(6, n);
  const xIdx =
    labelCount <= 1
      ? [0]
      : Array.from({ length: labelCount }, (_, k) => Math.round((k * (n - 1)) / (labelCount - 1)));

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${VW} ${height}`}>
      {ticks.map((t, i) => {
        const y = padT + (1 - t / niceMax) * plotH;
        return (
          <Fragment key={`g${i}`}>
            <Line
              x1={padL}
              y1={y}
              x2={VW - padR}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <SvgText x={padL - 6} y={y + 3} fontSize={9} fill={colors.textTertiary} textAnchor="end">
              {shortAmount(t)}
            </SvgText>
          </Fragment>
        );
      })}

      {data.map((v, i) => {
        const barH = (v / niceMax) * plotH;
        const x = padL + i * slot + (slot - barW) / 2;
        return (
          <Rect
            key={`b${i}`}
            x={x}
            y={baseY - barH}
            width={barW}
            height={Math.max(barH, v > 0 ? 2 : 0)}
            rx={barW / 3}
            fill={color}
            opacity={v > 0 ? 1 : 0}
          />
        );
      })}

      {xIdx.map((idx, i) => (
        <SvgText
          key={`x${i}`}
          x={padL + idx * slot + slot / 2}
          y={height - 6}
          fontSize={9}
          fill={colors.textTertiary}
          textAnchor="middle"
        >
          {labels?.[idx] ?? `${idx + 1}`}
        </SvgText>
      ))}
    </Svg>
  );
}
