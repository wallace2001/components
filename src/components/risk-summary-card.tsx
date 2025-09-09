// RiskSummaryCard.tsx
import React from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, Stack, Typography, Box } from "@mui/material";

type YearRow = { year: string; green: number; total: number };

const palette = {
  gauge: "#154b5b",
  barBlue: "#355acb",
  barGreen: "#7bc67b",
  axis: "#9e9e9e",
  split: "#e5e9f2",
};

const dataRows: YearRow[] = [
  { year: "2024", green: 28_000_000, total: 400_000_000 },
  { year: "2025", green: 22_000_000, total: 400_000_000 },
  { year: "2026", green: 60_000_000, total: 400_000_000 },
  { year: "2027", green: 24_000_000, total: 400_000_000 },
  { year: "2028", green: 14_000_000, total: 400_000_000 },
];

const numberFmt = (v: number) => v.toLocaleString("en-US");

export default function RiskSummaryCard() {
    const gaugeOption = {
    series: [
        {
        type: "gauge",
        // arco amplo (quase 240°), aberto embaixo
        startAngle: 210,
        endAngle: -30,

        // desce o centro e aumenta o raio para “achatar” o topo visível
        center: ["50%", "86%"],
        radius: "170%",

        min: 0,
        max: 100,
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },

        // 🔧 pontas retas (sem roundCap)
        progress: {
            show: true,
            width: 30,
            roundCap: false,
            itemStyle: { color: palette.gauge },
        },
        axisLine: {
            roundCap: false,
            lineStyle: { width: 30, color: [[1, "#e8eef5"]] },
        },

        detail: { show: false },
        data: [{ value: 100 }],
        },
    ],
    graphic: [
        // Nota/letra
        {
        type: "text",
        left: "center",
        top: "30%",
        style: { text: "A", fontSize: 58, fontWeight: 700, fill: "#3a3a3a" },
        },
        // 100% + Risco Mínimo (numa única graphic pra centralizar perfeitamente)
        {
        type: "text",
        left: "center",
        top: "60%",
        style: {
            text: "{b|100%}\nRisco Mínimo",
            fontSize: 15,
            lineHeight: 20,
            textAlign: "center",
            fill: "#3a3a3a",
            rich: { b: { fontSize: 18, fontWeight: 700, fill: "#3a3a3a" } },
        },
        },
    ],
    };

  const yCats = dataRows.map((r) => r.year);
  const greenData = dataRows.map((r) => r.green);
  const blueData = dataRows.map((r) => r.total - r.green);

  const barsOption = {
    grid: { left: 52, right: 18, top: 18, bottom: 36 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: {
      type: "value",
      max: 400_000_000,
      splitNumber: 4,
      axisLabel: { formatter: (v: number) => numberFmt(v) },
      axisLine: { lineStyle: { color: palette.axis } },
      splitLine: { lineStyle: { color: palette.split } },
    },
    yAxis: {
      type: "category",
      data: yCats,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#2b2b2b" },
    },
    series: [
      {
        name: "Parcela inicial",
        type: "bar",
        stack: "t",
        data: greenData,
        barWidth: 18,
        itemStyle: { color: palette.barGreen, borderRadius: [2, 0, 0, 2] },
      },
      {
        name: "Exposição",
        type: "bar",
        stack: "t",
        data: blueData,
        barWidth: 18,
        itemStyle: { color: palette.barBlue, borderRadius: [0, 2, 2, 0] },
      },
    ],
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, width: 500 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={3}>
            <Stack spacing={4}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  CNPJ:
                </Typography>
                <Typography variant="subtitle1">09149503000106</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Categoria:
                </Typography>
                <Typography variant="subtitle1">Comercializadora</Typography>
              </Box>
            </Stack>

            <Box sx={{ width: 320, height: 180 }}>
            <ReactECharts option={gaugeOption} style={{ width: "100%", height: "100%" }} notMerge />
            </Box>

          </Stack>

          <Box sx={{ width: "100%", height: 200 }}>
            <ReactECharts option={barsOption} style={{ width: "100%", height: "100%" }} notMerge />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
