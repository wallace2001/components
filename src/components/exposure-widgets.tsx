/* eslint-disable @typescript-eslint/no-explicit-any */
// ExposureWidgets.tsx
import React from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, Typography, Stack, Box } from "@mui/material";
import millify from "millify";

const fmtMWh = (v: number) => {
  const raw = millify(Math.max(v || 0, 0), {
    precision: 2,
    units: ["MWh", "GWh"],
    space: true,
  });

  return raw.replace(".", ",");
};

type Slice = { name: string; value: number; color: string };

const COLORS = {
  blue:   "#3B73E3",
  green:  "#52B788",
  yellow: "#F3C64E",
  red:    "#EF5350",
};

function DonutCard({
  title,
  data,
}: { title: string; data: Slice[] }) {
  const option = {
    tooltip: {
      trigger: "item",
      formatter: (params: any) =>
        `${params.name}<br/>${fmtMWh(params.value)} (${params.percent}%)`,
    },
    legend: {
      orient: "vertical",
      left: "55%",
      top: "center",
      itemWidth: 18,
      itemHeight: 12,
      textStyle: {
        fontSize: 12,
      },
    },
    series: [
      {
        name: "",
        type: "pie",
        radius: ["35%", "60%"],   // 👈 aumenta os raios → menos espaço sobrando
        center: ["15%", "50%"],   // 👈 centraliza melhor (ajuste fino)
        padAngle: 1,
        itemStyle: { borderRadius: 5 },
        label: {
          show: false,
        },
        z: 10,
        data: data.map((s) => ({
          name: s.name,
          value: s.value,
          itemStyle: { color: s.color },
        })),
      },
    ],
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {title}
        </Typography>

    <Box sx={{ width: 400, height: 140, mx: "auto" }}>
      <ReactECharts
        option={option}
        style={{ width: "100%", height: "100%" }}
        notMerge
      />
      </Box>
      </CardContent>
    </Card>
  );
}

const counterpartInfo = {
    "agent_name": "ITAU",
    "agent_cnpj": "31781135000165",
    "agent_category": "Comercializadora",
    "group_name": null,
    "controller_cnpj": null,
    "risk_analysis": {
        "analysis_date": "03/04/2023",
        "score_percent": 0.9371944654708173,
        "rating": "A / Risco Mínimo",
        "reason_zero_limit": null,
        "contract_duration": "Sem limita�ão",
        "balance": {
            "2024": {
                "lim_crdt_conced": 394462526.77751696,
                "lim_crdt_consum": 82742067.40967612,
                "lim_crdt_saldo": 342986905.0913195
            },
            "2025": {
                "lim_crdt_conced": 255830707.22896922,
                "lim_crdt_consum": 63767086.13940565,
                "lim_crdt_saldo": 502881278.1261343
            },
            "2026": {
                "lim_crdt_conced": 289530187.4490186,
                "lim_crdt_consum": 0,
                "lim_crdt_saldo": 507137718.83452207
            },
            "2027": {
                "lim_crdt_conced": 405605626.6696797,
                "lim_crdt_consum": 0,
                "lim_crdt_saldo": 308014114.7743563
            }
        }
    }
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
      {/* <RiskArcAndBalanceCard data={counterpartInfo}/> */}
    </Stack>
  );
}
