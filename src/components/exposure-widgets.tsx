// ExposureWidgets.tsx
import React from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, Typography, Stack, Box } from "@mui/material";
import RiskSummaryCard from "./risk-summary-card";

type Slice = { name: string; value: number; color: string };

const COLORS = {
  blue:   "#3B73E3",
  green:  "#52B788",
  yellow: "#F3C64E",
  red:    "#EF5350",
};

function DonutCard({ title, data }: { title: string; data: Slice[] }) {
  const option = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    series: [
      {
        type: "pie",
        radius: ["48%", "86%"],
        startAngle: 90,
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scale: false },
        itemStyle: {
          borderColor: "#fff",
          borderWidth: 10,
          borderJoin: "round",
          borderRadius: 14,
        },
        data: data.map((s) => ({
          value: s.value,
          name: s.name,
          itemStyle: { color: s.color },
        })),
      },
    ],
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ pb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {title}
        </Typography>

        <Stack alignItems="center" spacing={1.5}>
          <Box sx={{ width: 240, height: 210 }}>
            <ReactECharts
              option={option}
              style={{ width: "100%", height: "100%" }}
              notMerge
            />
          </Box>

          <Stack spacing={1} sx={{ width: "100%", maxWidth: 280 }}>
            {data.map((s) => (
              <Stack key={s.name} direction="row" alignItems="center" spacing={1.2}>
                <Box sx={{ width: 32, height: 14, borderRadius: 1, bgcolor: s.color,  }} />
                <Typography variant="body2">{s.name}</Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ExposureWidgets() {
  const categoria: Slice[] = [
    { name: "Consumidor - Varejo",      value: 46, color: COLORS.blue },
    { name: "Comercializador",          value: 26, color: COLORS.green },
    { name: "Gerador",                  value: 20, color: COLORS.yellow },
    { name: "Produtor Independente",    value:  8, color: COLORS.red },
  ];

  const subsidiaria: Slice[] = [
    { name: "FURNAS",       value: 38, color: COLORS.blue },
    { name: "CGTESUL",      value: 30, color: COLORS.green },
    { name: "CHESF",        value: 22, color: COLORS.yellow },
    { name: "ELETRONORTE",  value: 10, color: COLORS.red },
  ];

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      <DonutCard title="Exposição por Categoria" data={categoria} />
      <DonutCard title="Exposição por Subsidiária" data={subsidiaria} />
      <RiskSummaryCard />
    </Stack>
  );
}
