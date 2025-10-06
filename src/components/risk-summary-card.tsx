/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, Stack, Typography, Box } from "@mui/material";

type BalanceYear = {
  lim_crdt_conced: number;
  lim_crdt_consum: number;
  lim_crdt_saldo: number;
};
type RiskAnalysis = {
  analysis_date: string;
  score_percent: number; // 0..1 (pode vir >1; tratamos)
  rating: string;        // "A / Risco Mínimo"
  reason_zero_limit: string | null;
  contract_duration: string;
  balance: Record<string, BalanceYear>; // "2024" -> valores
};
export type AgentRiskPayload = {
  agent_name: string;
  agent_cnpj: string;
  agent_category: string;
  group_name: string | null;
  controller_cnpj: string | null;
  risk_analysis: RiskAnalysis;
};

const fmtUS = (v: number) => v.toLocaleString("en-US");

export default function RiskArcAndBalanceCard({
  data,
  // tamanhos menores (cabe em cards compactos)
  gaugeWidth = 220,
  gaugeHeight = 140,
  gaugeCenterY = '82%',
}: {
  data: AgentRiskPayload;
  gaugeWidth?: number;
  gaugeHeight?: number;
  gaugeCenterY?: string;
}) {
  const { balance } = data.risk_analysis;

const [letter, riskLabel] = data.risk_analysis["rating"]
  .split("/")
  .map((s: string) => s.trim());

const percentText = `${(Number(data.risk_analysis["score_percent"]) * 100).toFixed(2)}`;

  const PAD = 6;
  const RADIUS_PX = Math.floor(Math.min(gaugeWidth / 2 - PAD, gaugeHeight - PAD));

  const gaugeOption = {
    title: [
                 {
                     text: letter,
                     left: "center",
                     top: "30%",
                     textStyle: {
                         fontSize: 38,
                         fontWeight: "bold",
                     },
                 },
                 {
                     text: riskLabel,
                     left: "center",
                     top: "70%",
                     textStyle: {
                         fontSize: 16,
                         fontWeight: "normal",
                     },
                 },
             ],
    series: [{
      type: "gauge",
      radius: RADIUS_PX,
      center: ["50%", gaugeCenterY],
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      splitNumber: 1,
      axisLine: {
        lineStyle: {
          width: "24",
          color: [
            [data.risk_analysis["score_percent"], "#1f4e6b"],
            [1, "#e76f51"],
          ],
        },
      },
      pointer: { show: false },
      axisTick: { show: true },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        formatter: "{value}%",
        fontSize: 14,
        offsetCenter: [0, -22],
      },
      data: [{ value: percentText }],
    },
  ],
  };

  // ---------- Barras por ano (parte de baixo) ----------
  const { years, greenData, blueData, xMax } = useMemo(() => {
    const ys = Object.keys(balance || {}).sort(); // "2024", "2025", ...
    const green = ys.map(y => Math.max(balance[y].lim_crdt_consum, 0));
    const remaining = ys.map(y => {
      const rest = (balance[y].lim_crdt_conced || 0) - (balance[y].lim_crdt_consum || 0);
      return Math.max(rest, 0);
    });
    const totals = ys.map((_, i) => green[i] + remaining[i]);
    const max = totals.length ? Math.max(...totals) : 1;

    // arredonda o eixo p/ cima (de 50M em 50M)
    const step = 50_000_000;
    const niceMax = Math.ceil(max / step) * step;

    return { years: ys, greenData: green, blueData: remaining, xMax: niceMax };
  }, [balance]);

// Garante que sempre temos arrays
const yearsSafe = Array.isArray(years) ? years : [];
const greenSafe = Array.isArray(greenData) ? greenData : [];
const blueSafe  = Array.isArray(blueData) ? blueData : [];

// Total concedido = consumido + saldo
const granted = yearsSafe.map((_, i) => (greenSafe[i] ?? 0) + (blueSafe[i] ?? 0));
const consumed = yearsSafe.map((_, i) => greenSafe[i] ?? 0);
const balanced  = yearsSafe.map((_, i) => blueSafe[i] ?? 0);

const barsOption = {
  tooltip: {
    trigger: "axis",
    show: true,
    confine: true,
    textStyle: {
      overflow: "breakAll",
      width: 20,
    },
    formatter: (params: any[]) => {
      const name = params?.[0]?.axisValue ?? "";
      const gVal = params.find(p => p.seriesName === "Granted")?.value ?? 0;
      const cVal = params.find(p => p.seriesName === "Consumed")?.value ?? 0;
      const bVal = params.find(p => p.seriesName === "Balance")?.value ?? 0;
      return [
        `<b>${name}</b>`,
        `Granted: ${fmtUS(gVal)}`,
        `Consumed: ${fmtUS(cVal)}`,
        `Balance: ${fmtUS(bVal)}`,
      ].join("<br/>"); // ✅ fecha certo
    },
  },
  grid: {
    top: "0%",
    left: "0%",
    right: "5%",
    height: "100%",
    containLabel: true,
  },
  xAxis: {
    type: "value",
    ...(xMax ? { max: xMax } : {}),
  },
  yAxis: {
    type: "category",
    data: yearsSafe,
    splitNumber: 1,
    inverse: true,
  },
  series: [
    {
      name: "Granted",
      type: "bar",
      data: granted,        // array garantido
      barWidth: 16,
      itemStyle: { color: "#355acb" },
    },
    {
      name: "Consumed",
      type: "bar",
      data: consumed,       // array garantido
      barGap: "-100%",
      z: 2,
      barWidth: 16,
      itemStyle: { color: "#7bc67b" },
    },
    {
      name: "Balance",
      type: "bar",
      data: balanced,        // array garantido
      barGap: "-100%",
      z: -1,
      barWidth: 16,
      itemStyle: { color: "rgba(0, 0, 0, 0)" },
    },
  ],
};

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, width: "100%" }}>
      <CardContent>
        {/* topo: gauge menor */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={3}>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>CNPJ:</Typography>
              <Typography variant="subtitle1">{data.agent_cnpj}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>Categoria:</Typography>
              <Typography variant="subtitle1">{data.agent_category}</Typography>
            </Box>
          </Stack>

          <Box sx={{ width: gaugeWidth, height: gaugeHeight }}>
            <ReactECharts option={gaugeOption} style={{ width: "100%", height: "100%" }} notMerge />
          </Box>
        </Stack>

        {/* parte de baixo: barras por ano */}
        <Box sx={{ width: "100%", height: 170, mt: 1.5 }}>
          <ReactECharts option={barsOption} style={{ width: "100%", height: "100%" }} notMerge />
        </Box>
      </CardContent>
    </Card>
  );
}
