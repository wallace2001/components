/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";

type Sub = "SE" | "SU" | "NO" | "NE";
type Monthly = any;

const SLIDER_BOTTOM = 38;
const SLIDER_HEIGHT = 30;
const TOOLBOX_ICON  = 18;
const DZ_GAP = 12;
const TOOLBOX_BOTTOM = 27;
const GRID4_BOTTOM =
  Math.max(SLIDER_BOTTOM + SLIDER_HEIGHT + DZ_GAP, TOOLBOX_BOTTOM + TOOLBOX_ICON + 8);

const SUBS: Sub[] = ["SE", "SU", "NO", "NE"];

const TIPO_ALLOWED: string[] | null = null;

// ---------- utils ----------
const toNum = (v: any) => (v == null || v === "" || isNaN(Number(v)) ? 0 : Number(v));
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const normMonth = (d: string | Date) => {
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  return `${y}-${pad2(m)}-01`;
};
const fmtMes = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).replace(".", "");
const get = <T,>(o: any, ...keys: string[]): T | undefined => {
  for (const k of keys) if (o && o[k] != null) return o[k];
  return undefined;
};
const getSub = (obj: any, sub: Sub) => obj?.[sub] ?? obj?.[sub.toLowerCase()] ?? obj?.[sub.toUpperCase()];
const arr = (n: number, v: any = 0) => Array.from({ length: n }, () => v);

const fmtBRLFull = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const fmtBRLShort = (v: number) => {
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1e12) return `${sign}R$ ${(a / 1e12).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} tri`;
  if (a >= 1e9)  return `${sign}R$ ${(a / 1e9 ).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
  if (a >= 1e6)  return `${sign}R$ ${(a / 1e6 ).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  return `${sign}${fmtBRLFull(a)}`;
};
const fmtPrice = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtVol   = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} MWm`;

const COLORS = {
  total: "#1f4e6b",
  SE: "#60a5fa",
  SU: "#a78bfa",
  NO: "#00bb60",
  NE: "#d6e326",
  fpcSE: "#f4b000",
  fpcSU: "#e76f51",
  fpcNO: "#6f6f6f",
  fpcNE: "#FF6666",
};

function tint(base: string, idx: number) {
  const n = base.replace("#", "");
  const num = parseInt(n, 16);
  const r0 = (num >> 16) & 0xff, g0 = (num >> 8) & 0xff, b0 = num & 0xff;
  const f = Math.min(0.65, 0.25 + idx * 0.18);
  const r = Math.min(255, Math.round(r0 + (255 - r0) * f));
  const g = Math.min(255, Math.round(g0 + (255 - g0) * f));
  const b = Math.min(255, Math.round(b0 + (255 - b0) * f));
  return `rgb(${r},${g},${b})`;
}

export default function ExposureChart({ monthly, height = 780 }: { monthly: Monthly; height?: number }) {
  const chartRef = useRef<any>(null);
  const selectedSubRef  = useRef<Record<Sub, boolean>>({ SE:false, SU:false, NO:false, NE:false });
  const selectedTipoRef = useRef<Record<string, boolean>>({}); // preenchido depois
  const selectedTipo2Ref   = useRef<Record<string, boolean>>({}); // tp_tipo
  const selectedSubtipoRef = useRef<Record<string, boolean>>({}); // tp_subtipo

  const forward    = monthly?.forward ?? {};
  const totalsRaw  = (monthly?.totals as any[]) ?? [];
  const detailsRaw = (monthly?.details as any[]) ?? [];

  // -------- categorias --------
  const { categoriesISO, categories, idxByDate } = useMemo(() => {
    const dateSet = new Set<string>();
    for (const t of totalsRaw) {
      const iso = get<string>(t, "supply_period", "month", "period", "date");
      if (iso) dateSet.add(normMonth(iso));
    }
    for (const d of detailsRaw) {
      const iso = get<string>(d, "supply_period", "month", "period", "date");
      if (iso) dateSet.add(normMonth(iso));
    }
    SUBS.forEach((sub) => {
      const con = getSub(forward, sub)?.CON ?? {};
      Object.keys(con || {}).forEach((k) => dateSet.add(normMonth(k)));
    });
    const ISO = Array.from(dateSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const LAB = ISO.map(fmtMes);
    const IDX = new Map(ISO.map((d, i) => [d, i]));
    return { categoriesISO: ISO, categories: LAB, idxByDate: IDX };
  }, [forward, totalsRaw, detailsRaw]);

  const len = categoriesISO.length;

  const tipos2: string[] = useMemo(() => {
    const s = new Set<string>();
    for (const d of detailsRaw) {
      const t = (get<string>(d, "tp_tipo", "tipo") || "").toUpperCase().trim();
      if (t) s.add(t);
    }
    return Array.from(s.values());
  }, [detailsRaw]);

  const subtipos: string[] = useMemo(() => {
    const s = new Set<string>();
    for (const d of detailsRaw) {
      const t = (get<string>(d, "tp_subtipo", "subtipo", "sub_type") || "").toUpperCase().trim();
      if (t) s.add(t);
    }
    return Array.from(s.values());
  }, [detailsRaw]);

  // inicializa intenção (desligados)
  tipos2.forEach(t => { if (selectedTipo2Ref.current[t] == null) selectedTipo2Ref.current[t] = false; });
  subtipos.forEach(t => { if (selectedSubtipoRef.current[t] == null) selectedSubtipoRef.current[t] = false; });

  // ---- agregados principais (Totals) ----
  const revenueTOTAL = arr(len, 0);
  const mtmTOTAL     = arr(len, 0);
  const volumeTOTAL  = arr(len, 0);

  // ---- agregados p/ Revenue (voltar) ----
  const revFaturamento = arr(len, 0);
  const revCusto       = arr(len, 0);
  const revNet         = arr(len, 0);

  // NOVOS para Volume:
  const volSellTOTAL = arr(len, 0); // volume de venda (MWm)
  const volBuyTOTAL  = arr(len, 0); // volume de compra (MWm)
  const volNetTOTAL  = arr(len, 0); // sell - buy (MWm)


  const revByTipo2:   Record<string, number[]> = Object.fromEntries(tipos2.map(t => [t, arr(len, 0)])) as any;
  const mtmByTipo2:   Record<string, number[]> = Object.fromEntries(tipos2.map(t => [t, arr(len, 0)])) as any;
  const volByTipo2:   Record<string, number[]> = Object.fromEntries(tipos2.map(t => [t, arr(len, 0)])) as any;

  const revBySubtipo: Record<string, number[]> = Object.fromEntries(subtipos.map(t => [t, arr(len, 0)])) as any;
  const mtmBySubtipo: Record<string, number[]> = Object.fromEntries(subtipos.map(t => [t, arr(len, 0)])) as any;
  const volBySubtipo: Record<string, number[]> = Object.fromEntries(subtipos.map(t => [t, arr(len, 0)])) as any;

  // --- agregados por SUB (quando apenas sub estiver selecionado)
  const revBySub: Record<Sub, number[]> = { SE: arr(len,0), SU: arr(len,0), NO: arr(len,0), NE: arr(len,0) };
  const mtmBySub: Record<Sub, number[]> = { SE: arr(len,0), SU: arr(len,0), NO: arr(len,0), NE: arr(len,0) };
  const volBySub: Record<Sub, number[]> = { SE: arr(len,0), SU: arr(len,0), NO: arr(len,0), NE: arr(len,0) };

  // --- Totais (revenueTOTAL, mtmTOTAL, volumeTOTAL) ---
  for (const t of totalsRaw) {
    const i = idxByDate.get(
      normMonth(get<string>(t, "supply_period", "month", "period", "date") ?? "")
    );
    if (i == null) continue;

    const revenue = toNum(get<number>(t, "revenue", "total_revenue", "rev"));
    const mtm     = toNum(get<number>(t, "mtm", "mtm_value", "marktomarket"));
    const sell    = toNum(get<number>(t, "volume_sell_mwm", "volume_sell", "vol_sell", "sell_mwm"));
    const buy     = toNum(get<number>(t, "volume_buy_mwm",  "volume_buy",  "vol_buy",  "buy_mwm"));

    revenueTOTAL[i] += revenue;
    mtmTOTAL[i]     += mtm;
    volumeTOTAL[i]  += (sell + buy);

    volSellTOTAL[i] += sell;
    volBuyTOTAL[i]  += buy;
  }

  for (let i = 0; i < len; i++) {
    revNet[i]     = revFaturamento[i] - revCusto[i];
    volNetTOTAL[i] = volSellTOTAL[i] - volBuyTOTAL[i]; // NOVO
  }

  // -------- Price FWD --------
  const priceBySub: Record<Sub, (number | null)[]> = {
    SE: arr(len, null), SU: arr(len, null), NO: arr(len, null), NE: arr(len, null),
  };
  (["SE","SU","NO","NE"] as Sub[]).forEach((sub) => {
    const con = getSub(forward, sub)?.CON ?? {};
    for (const k of Object.keys(con)) {
      const i = idxByDate.get(normMonth(k));
      if (i != null) priceBySub[sub][i] = toNum(con[k]);
    }
  });

  // --------- Tipos (tp_tipo_energia) ----------
  const tipos: string[] = useMemo(() => {
    const s = new Set<string>();
    for (const d of detailsRaw) {
      const t = (get<string>(d, "tp_tipo_energia", "tipo", "energy_type") || "").toUpperCase().trim();
      if (t) s.add(t);
    }
    const all = Array.from(s.values());
    return TIPO_ALLOWED ? all.filter(t => TIPO_ALLOWED.includes(t)) : all;
  }, [detailsRaw]);

  tipos.forEach(t => { if (selectedTipoRef.current[t] == null) selectedTipoRef.current[t] = false; });

  // --------- Combinações Sub × Tipo ----------
  type ComboKey = `${Sub}|${string}`;
  const combos: ComboKey[] = useMemo(
    () => SUBS.flatMap((sub) => tipos.map((tp) => `${sub}|${tp}` as ComboKey)),
    [tipos]
  );

  const revByCombo: Record<ComboKey, number[]> = Object.fromEntries(combos.map(k => [k, arr(len, 0)])) as any;
  const mtmByCombo: Record<ComboKey, number[]> = Object.fromEntries(combos.map(k => [k, arr(len, 0)])) as any;
  const volByCombo: Record<ComboKey, number[]> = Object.fromEntries(combos.map(k => [k, arr(len, 0)])) as any;

  const revByTipo: Record<string, number[]> = Object.fromEntries(tipos.map(t => [t, arr(len, 0)])) as any;
  const mtmByTipo: Record<string, number[]> = Object.fromEntries(tipos.map(t => [t, arr(len, 0)])) as any;
  const volByTipo: Record<string, number[]> = Object.fromEntries(tipos.map(t => [t, arr(len, 0)])) as any;

  for (const d of detailsRaw) {
    const tipo = (get<string>(d, "tp_tipo_energia", "tipo", "energy_type") || "").toUpperCase().trim();
    if (!tipos.includes(tipo)) continue;
    const i = idxByDate.get(normMonth(get<string>(d, "supply_period", "month", "period", "date") ?? "")); 
    if (i == null) continue;

    revByTipo[tipo][i] += toNum(get<number>(d, "revenue", "total_revenue", "rev"));
    mtmByTipo[tipo][i] += toNum(get<number>(d, "mtm", "mtm_value", "marktomarket"));
    const sell = toNum(get<number>(d, "volume_sell_mwm", "volume_sell", "vol_sell", "sell_mwm"));
    const buy  = toNum(get<number>(d, "volume_buy_mwm",  "volume_buy",  "vol_buy",  "buy_mwm"));
    volByTipo[tipo][i] += (sell + buy);
  }

  // helpers
  const comboName = (p:"Rev"|"MtM"|"Vol", sub:Sub, tipo:string) => `${p} ${sub}·${tipo}`;

  const normSub = (s: any): Sub | null => {
  const v = String(s ?? "").toUpperCase().trim();
  switch (v) {
      case "SE": case "SUDESTE": return "SE";
      case "SU": case "SUL":     return "SU";
      case "NE": case "NORDESTE":return "NE";
      case "NO": case "NORTE":   return "NO";
      default: return null;
    }
  };

  for (const d of detailsRaw) {
    const i = idxByDate.get(
      normMonth(get<string>(d, "supply_period", "month", "period", "date") ?? "")
    );
    if (i == null) continue;

    const tipoEnergia = (get<string>(d, "tp_tipo_energia", "tipo", "energy_type") || "").toUpperCase().trim();
    const tipo2       = (get<string>(d, "tp_tipo", "tipo") || "").toUpperCase().trim();
    const subtipo     = (get<string>(d, "tp_subtipo", "subtipo", "sub_type") || "").toUpperCase().trim();

    const r  = toNum(get<number>(d, "revenue", "total_revenue", "rev"));
    const m  = toNum(get<number>(d, "mtm", "mtm_value", "marktomarket"));
    const s  = toNum(get<number>(d, "volume_sell_mwm", "volume_sell", "vol_sell", "sell_mwm"));
    const b  = toNum(get<number>(d, "volume_buy_mwm",  "volume_buy",  "vol_buy",  "buy_mwm"));
    const vb = s + b;
    const c  = toNum(get<number>(d, "cost"));

    if (r >= 0) revFaturamento[i] += r; else revCusto[i] += Math.abs(r);
    if (c < 0)  revCusto[i]       += Math.abs(c);
    if (c > 0)  revFaturamento[i] += c;

    if (tipo2 && revByTipo2[tipo2]) {
      revByTipo2[tipo2][i] += r;
      mtmByTipo2[tipo2][i] += m;
      volByTipo2[tipo2][i] += vb;
    }

    if (subtipo && revBySubtipo[subtipo]) {
      revBySubtipo[subtipo][i] += r;
      mtmBySubtipo[subtipo][i] += m;
      volBySubtipo[subtipo][i] += vb;
    }

    if (tipoEnergia && revByTipo[tipoEnergia]) {
      revByTipo[tipoEnergia][i] += r;
      mtmByTipo[tipoEnergia][i] += m;
      volByTipo[tipoEnergia][i] += vb;

      const subRaw = get<string>(d, "tp_submercado","submercado","sub_mercado","submarket","sub");
      const sub = normSub(subRaw);
      if (sub) {
        revBySub[sub][i] += r;
        mtmBySub[sub][i] += m;
        volBySub[sub][i] += vb;

        // ⬇️ NOVO: alimentar as séries "Sub × Tipo"
        const key = `${sub}|${tipoEnergia}` as `${Sub}|${string}`;
        if (revByCombo[key]) {
          revByCombo[key][i] += r;
          mtmByCombo[key][i] += m;
          volByCombo[key][i] += vb; // usa sell+buy, como nas outras agregações
        }
      }
    }
  }

  for (let i = 0; i < len; i++) revNet[i] = revFaturamento[i] - revCusto[i];


  // -------- option --------
  const option = useMemo(() => {
    const S = (a?: (number | null)[]) => (a ?? arr(len, 0));

    const seriesRevCombo = combos.map((k) => {
      const [sub, tipo] = k.split("|") as [Sub, string];
      const color = tint(COLORS[sub], tipos.indexOf(tipo));
      return { name: comboName("Rev", sub, tipo), type:"bar", xAxisIndex:0, yAxisIndex:0,
               stack:`rev-${sub}`, barCategoryGap:"30%", barGap:"-100%", data:S(revByCombo[k]),
               itemStyle:{ color } };
    });
    const seriesMtmCombo = combos.map((k) => {
      const [sub, tipo] = k.split("|") as [Sub, string];
      const color = tint(COLORS[sub], tipos.indexOf(tipo));
      return { name: comboName("MtM", sub, tipo), type:"bar", xAxisIndex:1, yAxisIndex:1,
               stack:`mtm-${sub}`, barCategoryGap:"30%", barGap:"-100%", data:S(mtmByCombo[k]),
               itemStyle:{ color } };
    });
    const seriesVolCombo = combos.map((k) => {
      const [sub, tipo] = k.split("|") as [Sub, string];
      const color = tint(COLORS[sub], tipos.indexOf(tipo));
      return { name: comboName("Vol", sub, tipo), type:"bar", xAxisIndex:2, yAxisIndex:2,
               stack:`vol-${sub}`, barCategoryGap:"30%", barGap:"-100%", data:S(volByCombo[k]),
               itemStyle:{ color } };
    });

    const seriesRevTipo2Only = tipos2.map((t, i) => ({
      name: `Rev · Tipo ${t}`, type: "bar", xAxisIndex: 0, yAxisIndex: 0,
      stack: "rev-tipo2", barCategoryGap: "50%", barGap: "-100%",
      data: S(revByTipo2[t]), itemStyle: { color: tint(COLORS.total, i + 1) }
    }));
    const seriesMtmTipo2Only = tipos2.map((t, i) => ({
      name: `MtM · Tipo ${t}`, type: "bar", xAxisIndex: 1, yAxisIndex: 1,
      stack: "mtm-tipo2", barCategoryGap: "50%", barGap: "-100%",
      data: S(mtmByTipo2[t]), itemStyle: { color: tint(COLORS.total, i + 1) }
    }));
    const seriesVolTipo2Only = tipos2.map((t, i) => ({
      name: `Vol · Tipo ${t}`, type: "bar", xAxisIndex: 2, yAxisIndex: 2,
      stack: "vol-tipo2", barCategoryGap: "50%", barGap: "-100%",
      data: S(volByTipo2[t]), itemStyle: { color: tint(COLORS.total, i + 1) }
    }));

    const seriesRevSubtipoOnly = subtipos.map((t, i) => ({
      name: `Rev · Subtipo ${t}`, type: "bar", xAxisIndex: 0, yAxisIndex: 0,
      stack: "rev-subtipo", barCategoryGap: "50%", barGap: "-100%",
      data: S(revBySubtipo[t]), itemStyle: { color: tint(COLORS.total, i + 2) }
    }));
    const seriesMtmSubtipoOnly = subtipos.map((t, i) => ({
      name: `MtM · Subtipo ${t}`, type: "bar", xAxisIndex: 1, yAxisIndex: 1,
      stack: "mtm-subtipo", barCategoryGap: "50%", barGap: "-100%",
      data: S(mtmBySubtipo[t]), itemStyle: { color: tint(COLORS.total, i + 2) }
    }));
    const seriesVolSubtipoOnly = subtipos.map((t, i) => ({
      name: `Vol · Subtipo ${t}`, type: "bar", xAxisIndex: 2, yAxisIndex: 2,
      stack: "vol-subtipo", barCategoryGap: "50%", barGap: "-100%",
      data: S(volBySubtipo[t]), itemStyle: { color: tint(COLORS.total, i + 2) }
    }));

    const seriesRevSubOnly = (["SE","SU","NO","NE"] as Sub[]).map((s) => ({
      name: `Rev · Sub ${s}`,
      type: "bar", xAxisIndex: 0, yAxisIndex: 0,
      stack: "rev-sub-only", barCategoryGap: "50%", barGap: "-100%",
      data: S(revBySub[s]), itemStyle: { color: COLORS[s] as string },
    }));
    const seriesMtmSubOnly = (["SE","SU","NO","NE"] as Sub[]).map((s) => ({
      name: `MtM · Sub ${s}`,
      type: "bar", xAxisIndex: 1, yAxisIndex: 1,
      stack: "mtm-sub-only", barCategoryGap: "50%", barGap: "-100%",
      data: S(mtmBySub[s]), itemStyle: { color: COLORS[s] as string },
    }));
    const seriesVolSubOnly = (["SE","SU","NO","NE"] as Sub[]).map((s) => ({
      name: `Vol · Sub ${s}`,
      type: "bar", xAxisIndex: 2, yAxisIndex: 2,
      stack: "vol-sub-only", barCategoryGap: "50%", barGap: "-100%",
      data: S(volBySub[s]), itemStyle: { color: COLORS[s] as string },
    }));

    const ghostTipo2Series = tipos2.map((t, i) => ({
      name: t,
      type: "line",
      xAxisIndex: 0, yAxisIndex: 0,
      data: arr(len, null),
      silent: true, showSymbol: false, hoverAnimation: false,
      lineStyle: { width: 0, opacity: 0 },
      itemStyle: { color: tint(COLORS.total, i + 1) },
      tooltip: { show: false },
    }));

    const ghostSubtipoSeries = subtipos.map((t, i) => ({
      name: t,
      type: "line",
      xAxisIndex: 0, yAxisIndex: 0,
      data: arr(len, null),
      silent: true, showSymbol: false, hoverAnimation: false,
      lineStyle: { width: 0, opacity: 0 },
      itemStyle: { color: tint(COLORS.total, i + 2) },
      tooltip: { show: false },
    }));

    const ghostSubSeries = SUBS.map((s) => ({
      name: s,
      type: "line",
      xAxisIndex: 0, yAxisIndex: 0,
      data: arr(len, null),
      silent: true, showSymbol: false, hoverAnimation: false,
      lineStyle: { width: 0, opacity: 0 },
      itemStyle: { color: COLORS[s] as string },
      tooltip: { show: false },
    }));

    const ghostTipoSeries = tipos.map((t, i) => ({
      name: t,
      type: "line",
      xAxisIndex: 0, yAxisIndex: 0,
      data: arr(len, null),
      silent: true, showSymbol: false, hoverAnimation: false,
      lineStyle: { width: 0, opacity: 0 },
      itemStyle: { color: tint(COLORS.total, i) },
      tooltip: { show: false },
    }));

    const seriesRevTipoOnly = tipos.map((t, i) => ({
      name: `Rev · ${t}`, type: "bar", xAxisIndex: 0, yAxisIndex: 0,
      stack: "rev-tipo", barCategoryGap: "50%", barGap: "-100%",
      data: S(revByTipo[t]), itemStyle: { color: tint(COLORS.total, i) }
    }));
    const seriesMtmTipoOnly = tipos.map((t, i) => ({
      name: `MtM · ${t}`, type: "bar", xAxisIndex: 1, yAxisIndex: 1,
      stack: "mtm-tipo", barCategoryGap: "50%", barGap: "-100%",
      data: S(mtmByTipo[t]), itemStyle: { color: tint(COLORS.total, i) }
    }));
    const seriesVolTipoOnly = tipos.map((t, i) => ({
      name: `Vol · ${t}`, type: "bar", xAxisIndex: 2, yAxisIndex: 2,
      stack: "vol-tipo", barCategoryGap: "50%", barGap: "-100%",
      data: S(volByTipo[t]), itemStyle: { color: tint(COLORS.total, i) }
    }));

    const combosLegendData = [
      ...combos.map(k => {
        const [sub, tipo] = k.split("|") as [Sub, string];
        return `Rev ${sub}·${tipo}`;
      }),
      ...combos.map(k => {
        const [sub, tipo] = k.split("|") as [Sub, string];
        return `MtM ${sub}·${tipo}`;
      }),
      ...combos.map(k => {
        const [sub, tipo] = k.split("|") as [Sub, string];
        return `Vol ${sub}·${tipo}`;
      }),
    ];

    const comboSelectedInit = Object.fromEntries(
      combosLegendData.map((name) => [name, false])
    ) as Record<string, boolean>;

    return {
      color: [COLORS.total, COLORS.SE, COLORS.SU, COLORS.NO, COLORS.NE, COLORS.fpcSE, COLORS.fpcSU, COLORS.fpcNO, COLORS.fpcNE],
      textStyle: { fontFamily: "Inter, Roboto, Arial, sans-serif" },

      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        extraCssText:
          "max-width: 520px; max-height: 520px; overflow:auto; padding:8px 10px; box-shadow:0 6px 24px rgba(0,0,0,.12);",

        formatter: (params: any[]) => {
          if (!params?.length) return "";

          const header = `<div style="margin-bottom:6px;font-weight:700">${params[0].axisValueLabel ?? ""}</div>`;

          const fmt = (p: any) =>
            p.axisIndex === 2 ? fmtVol(+p.data)
            : p.axisIndex === 3 ? fmtPrice(+p.data)
            : fmtBRLFull(+p.data);

          const dot = (c: string) =>
            `<span style="display:inline-block;width:10px;height:10px;background:${Array.isArray(c)?c[0]:c};border-radius:50%;margin-right:6px;"></span>`;

          const row = (p: any, name?: string) => {
            const isZero = +p.data === 0;
            if (isZero) return "";
            return `<div style="display:flex;justify-content:space-between;gap:12px;line-height:1.2;margin:2px 0;${isZero ? "opacity:.55" : ""}">
              <div>${dot(p.color)}${name ?? p.seriesName}</div>
              <div style="text-align:right;min-width:92px">${fmt(p)}</div>
            </div>`;
          };

          const gTitle = (txt: string) =>
            `<div style="margin:8px 0 4px;font-weight:600;opacity:.85">${txt}</div>`;

          type Buckets = { agg:any[]; sub:any[]; tipoEnergia:any[]; tipo2:any[]; subtipo:any[]; combo:any[]; fpc:any[] };
          const mkBuckets = (): Buckets => ({ agg:[], sub:[], tipoEnergia:[], tipo2:[], subtipo:[], combo:[], fpc:[] });
          const panels: Record<number, Buckets> = { 0: mkBuckets(), 1: mkBuckets(), 2: mkBuckets(), 3: mkBuckets() };

          // classifica cada série
          params.forEach((p: any) => {
            if (p?.data == null) return;
            const ai = p.axisIndex;
            const s  = String(p.seriesName ?? "");

            if (ai === 3 && /^FPC /.test(s)) { panels[3].fpc.push(p); return; }
            if (/^(Total|Faturamento|Custo|Net)$/.test(s)) { panels[ai].agg.push(p); return; }
            if (/· Sub /.test(s))                           { panels[ai].sub.push(p); return; }
            if (/^((Rev|MtM|Vol) · )/.test(s)) {
              if (/· Subtipo /.test(s)) panels[ai].subtipo.push(p);
              else if (/· Tipo /.test(s)) panels[ai].tipo2.push(p);
              else panels[ai].tipoEnergia.push(p);
              return;
            }
            if (/^(Rev|MtM|Vol) (SE|SU|NO|NE)·/.test(s))    { panels[ai].combo.push(p); return; }
          });

          // helper para montar "Sub × Tipo" agrupado por SUB
          const buildComboBySub = (combo: any[]) => {
            if (!combo.length) return "";
            const groups: Record<Sub, Array<{ p:any; tipo:string }>> =
              { SE:[], SU:[], NO:[], NE:[] };

            combo.forEach((p) => {
              const m = String(p.seriesName).match(/^(Rev|MtM|Vol) (SE|SU|NO|NE)·(.+)$/);
              if (!m) return;
              const sub = m[2] as Sub;
              const tipo = m[3];
              groups[sub].push({ p, tipo });
            });

            const parts: string[] = [gTitle("Sub × Tipo")];
            SUBS.forEach((sub) => {
              const arr = groups[sub];
              if (!arr || !arr.length) return;
              arr.sort((a,b) => a.tipo.localeCompare(b.tipo));
              parts.push(`<div style="font-weight:600;opacity:.8;margin-top:4px">${sub}</div>`);
              arr.forEach(({p, tipo}) => parts.push(row(p, tipo))); // mostra só o tipo ("CON", "I5", ...)
            });
            return parts.join("");
          };

          const buildPanel = (b: Buckets) => {
            const parts: string[] = [];
            if (b.agg.length)         parts.push(gTitle("Agregados"), ...b.agg.map((p)=>row(p)));
            // mantém outras seções caso ativas:
            // if (b.sub.length)      parts.push(gTitle("Por Submercado"), ...b.sub.map((p)=>row(p)));
            // if (b.tipoEnergia.length) parts.push(gTitle("Por Tipo de Energia"), ...b.tipoEnergia.map((p)=>row(p)));
            // if (b.tipo2.length)    parts.push(gTitle("Por Tipo"), ...b.tipo2.map((p)=>row(p)));
            // if (b.subtipo.length)  parts.push(gTitle("Por Subtipo"), ...b.subtipo.map((p)=>row(p)));
            // substitui lista simples de combos por agrupado:
            parts.push(buildComboBySub(b.combo));
            return parts.length
              ? `<div style="margin-top:6px">${parts.join("")}</div>`
              : "";
          };

          const out = [
            header,
            buildPanel(panels[0]),
            buildPanel(panels[1]),
            buildPanel(panels[2]),
            (panels[3].fpc.length
              ? `<div style="margin-top:6px"><div style="font-weight:700;margin-bottom:2px">Fwd Price</div>${
                  panels[3].fpc.map((p:any)=>row(p, p.seriesName.replace(/^FPC /,""))).join("")
                }</div>`
              : "")
          ].join("");

          return out;
        }

      },

      grid: [
        { top: 132, left: 0, right: 0, height: 112, containLabel: true },
        { top: 292, left: 0, right: 0, height: 112, containLabel: true },
        { top: 452, left: 0, right: 0, height: 112, containLabel: true },
        { top: 632, left: 5, right: 0, bottom: GRID4_BOTTOM, containLabel: true }
      ],

      legend: [
        // (1) Tipo de ENERGIA (tp_tipo_energia) — subiu pra top: 8
        { id: "legend-tipo", top: 8, left: "center", orient: "horizontal",
          itemGap: 12, itemWidth: 22, itemHeight: 12, icon: "roundRect",
          data: tipos, selected: Object.fromEntries(tipos.map(t => [t, false])),
          textStyle: { fontSize: 12 } },

        // (2) SUBMERCADOS — subiu pra top: 32
        { id: "legend-sub", top: 32, left: "center", orient: "horizontal",
          itemGap: 12, itemWidth: 22, itemHeight: 12, icon: "roundRect",
          data: SUBS, selected: { SE:false, SU:false, NO:false, NE:false },
          textStyle: { fontSize: 12 } },

        // (3) TIPO (tp_tipo) — subiu pra top: 56
        { id: "legend-tipo2", top: 56, left: "center", orient: "horizontal",
          itemGap: 12, itemWidth: 22, itemHeight: 12, icon: "roundRect",
          data: tipos2, selected: Object.fromEntries(tipos2.map(t => [t, false])),
          textStyle: { fontSize: 12 } },

        // (4) SUBTIPO (tp_subtipo) — subiu pra top: 80
        { id: "legend-subtipo", top: 80, left: "center", orient: "horizontal",
          itemGap: 12, itemWidth: 22, itemHeight: 12, icon: "roundRect",
          data: subtipos, selected: Object.fromEntries(subtipos.map(t => [t, false])),
          textStyle: { fontSize: 12 } },

        // FPC (permanece)
        { id: "legend-fpc", top: 584, left: "center", itemGap: 18,
          data: ["FPC SE", "FPC SU", "FPC NO", "FPC NE"], textStyle: { fontSize: 12 } },

        // ocultas (inalteradas)
        { id: "legend-sub-only", show: false, data: [
            "Rev · Sub SE","Rev · Sub SU","Rev · Sub NO","Rev · Sub NE",
            "MtM · Sub SE","MtM · Sub SU","MtM · Sub NO","MtM · Sub NE",
            "Vol · Sub SE","Vol · Sub SU","Vol · Sub NO","Vol · Sub NE",
          ],
          selected: {
            "Rev · Sub SE":false, "Rev · Sub SU":false, "Rev · Sub NO":false, "Rev · Sub NE":false,
            "MtM · Sub SE":false, "MtM · Sub SU":false, "MtM · Sub NO":false, "MtM · Sub NE":false,
            "Vol · Sub SE":false, "Vol · Sub SU":false, "Vol · Sub NO":false, "Vol · Sub NE":false,
          }
        },
        { id: "legend-combos", show: false, data: combosLegendData, selected: comboSelectedInit },
        { id: "legend-type-only", show: false,
          data: [
            ...tipos.map(t => `Rev · ${t}`),
            ...tipos.map(t => `MtM · ${t}`),
            ...tipos.map(t => `Vol · ${t}`),
          ],
          selected: Object.fromEntries([
            ...tipos.map(t => [`Rev · ${t}`, false]),
            ...tipos.map(t => [`MtM · ${t}`, false]),
            ...tipos.map(t => [`Vol · ${t}`, false]),
          ])
        },
        { id: "legend-tipo2-only", show: false,
          data: [
            ...tipos2.map(t => `Rev · Tipo ${t}`),
            ...tipos2.map(t => `MtM · Tipo ${t}`),
            ...tipos2.map(t => `Vol · Tipo ${t}`),
          ],
          selected: Object.fromEntries([
            ...tipos2.map(t => [`Rev · Tipo ${t}`, false]),
            ...tipos2.map(t => [`MtM · Tipo ${t}`, false]),
            ...tipos2.map(t => [`Vol · Tipo ${t}`, false]),
          ])
        },
        { id: "legend-subtipo-only", show: false,
          data: [
            ...subtipos.map(t => `Rev · Subtipo ${t}`),
            ...subtipos.map(t => `MtM · Subtipo ${t}`),
            ...subtipos.map(t => `Vol · Subtipo ${t}`),
          ],
          selected: Object.fromEntries([
            ...subtipos.map(t => [`Rev · Subtipo ${t}`, false]),
            ...subtipos.map(t => [`MtM · Subtipo ${t}`, false]),
            ...subtipos.map(t => [`Vol · Subtipo ${t}`, false]),
          ])
        },
      ],

      xAxis: [0,1,2,3].map((i) => ({
        type: "category",
        gridIndex: i,
        data: categories,
        boundaryGap: i !== 3,
        axisTick: { show: i === 3 },
        axisLabel: i === 3 ? { margin: 10 } : { show: false },
      })),

      yAxis: [
        { type: "value", gridIndex: 0, name: "Revenue (BRL)",      axisLabel: { formatter: (v: number) => fmtBRLShort(v) } },
        { type: "value", gridIndex: 1, name: "MtM (BRL)",          axisLabel: { formatter: (v: number) => fmtBRLShort(v) } },
        { type: "value", gridIndex: 2, name: "Volume (MWm)",       axisLabel: { formatter: (v: number) => v.toLocaleString("pt-BR") } },
        { type: "value", gridIndex: 3, name: "Fwd Price (BRL/MWh)",axisLabel: { formatter: (v: number) => fmtPrice(v) } },
      ],
      toolbox: {
        show: true, left: 0, bottom: 27, itemSize: TOOLBOX_ICON, z: 20,
        iconStyle: { borderColor: "#6b7280" }, emphasis: { iconStyle: { borderColor: "#111827" } },
        feature: { restore: { title: "Redefinir zoom" } },
      },

      dataZoom: [
        { type: "slider", xAxisIndex: [0,1,2,3], left: 40, bottom: SLIDER_BOTTOM, height: SLIDER_HEIGHT,
          filterMode: "filter", handleSize: 18, brushSelect: false, z: 15 },
        { type: "inside", xAxisIndex: [0,1,2,3], filterMode: "filter" },
      ],
      series: [
        ...ghostSubSeries,
        ...ghostTipoSeries,
        ...ghostTipo2Series,
        ...ghostSubtipoSeries,

        { name: "Total", type: "bar", xAxisIndex: 0, yAxisIndex: 0,
          barCategoryGap: "50%", barGap: "50%", data: revenueTOTAL, itemStyle: { color: COLORS.total } },
        { name: "Faturamento", type: "bar", xAxisIndex: 0, yAxisIndex: 0, stack: "rev-fc",
          barCategoryGap: "50%", barGap: "50%", data: revFaturamento },
        { name: "Custo", type: "bar", xAxisIndex: 0, yAxisIndex: 0, stack: "rev-fc",
          barCategoryGap: "50%", barGap: "50%", data: revCusto },
        { name: "Net", type: "line", xAxisIndex: 0, yAxisIndex: 0, data: revNet,
          smooth: false, showSymbol: false, z: 4 },

        ...seriesRevSubOnly,
        ...seriesMtmSubOnly,
        ...seriesVolSubOnly,

        ...seriesRevCombo,
        ...seriesRevTipoOnly, 
        ...seriesRevTipo2Only,
        ...seriesRevSubtipoOnly,

        // MtM
        { name: "Total", type: "bar", xAxisIndex: 1, yAxisIndex: 1,
          barCategoryGap: "30%", barGap: "10%", data: mtmTOTAL, itemStyle: { color: COLORS.total } },
        ...seriesMtmCombo,
        ...seriesMtmTipoOnly,
        ...seriesMtmTipo2Only,
        ...seriesMtmSubtipoOnly,

        // Volume
        { name: "Total", type: "bar", xAxisIndex: 2, yAxisIndex: 2,
          barCategoryGap: "30%", barGap: "10%", data: volumeTOTAL, itemStyle: { color: COLORS.total } },
        // NOVAS séries agregadas do Volume:
        { name: "Faturamento", type: "bar", xAxisIndex: 2, yAxisIndex: 2, stack: "vol-fc", data: volSellTOTAL },
        { name: "Custo",       type: "bar", xAxisIndex: 2, yAxisIndex: 2, stack: "vol-fc", data: volBuyTOTAL },
        { name: "Net",         type: "line",xAxisIndex: 2, yAxisIndex: 2, data: volNetTOTAL, smooth:false, showSymbol:false, z:4 },
        ...seriesVolCombo,
        ...seriesVolTipoOnly,
        ...seriesVolTipo2Only,
        ...seriesVolSubtipoOnly,

        // FPC (inalterado)
        { name: "FPC SE", type: "line", xAxisIndex: 3, yAxisIndex: 3, data: S(priceBySub.SE), smooth:false, showSymbol:false, connectNulls:true, z:3 },
        { name: "FPC SU", type: "line", xAxisIndex: 3, yAxisIndex: 3, data: S(priceBySub.SU), smooth:false, showSymbol:false, connectNulls:true, z:3 },
        { name: "FPC NO", type: "line", xAxisIndex: 3, yAxisIndex: 3, data: S(priceBySub.NO), smooth:false, showSymbol:false, connectNulls:true, z:3 },
        { name: "FPC NE", type: "line", xAxisIndex: 3, yAxisIndex: 3, data: S(priceBySub.NE), smooth:false, showSymbol:false, connectNulls:true, z:3 },
      ],
      animationDuration: 220,
    };
  }, [
      len, categories, combos, tipos, tipos2, subtipos,
      revenueTOTAL, mtmTOTAL, volumeTOTAL,
      revFaturamento, revCusto, revNet,
      // ⬇️ importantes para Sub × Tipo
      revByCombo, mtmByCombo, volByCombo,
      // se quiser garantir tudo atualizando:
      revByTipo, mtmByTipo, volByTipo,
      revByTipo2, mtmByTipo2, volByTipo2,
      revBySubtipo, mtmBySubtipo, volBySubtipo,
      revBySub, mtmBySub, volBySub,
      volSellTOTAL, volBuyTOTAL, volNetTOTAL,
      priceBySub
  ]);

  const onChartReady = (chart: any) => { chartRef.current = chart; };

  const onEvents = {
    legendselectchanged: (ev: any) => {
      const chart = chartRef.current; if (!chart) return;

      if (ev?.legendId === "legend-fpc") return;

      const name = ev?.name as string;
      const byName = (arr: string[]) => arr.includes(name);
      const selected = (k: string) => ev?.selected?.[k];

      const applySel = (
        keys: string[],
        ref: React.MutableRefObject<Record<string, boolean>>,
        legendId?: string
      ) => {
        if (ev?.legendId === legendId) {
          keys.forEach(k => {
            if (ev?.selected?.hasOwnProperty(k)) ref.current[k] = !!ev.selected[k];
          });
        } else if (!ev?.legendId && byName(keys)) {
          ref.current[name] = selected(name) ?? !ref.current[name];
        }
      };

      applySel(SUBS as unknown as string[], selectedSubRef as any, "legend-sub");
      applySel(tipos,                       selectedTipoRef,     "legend-tipo");
      applySel(tipos2,                      selectedTipo2Ref,    "legend-tipo2");
      applySel(subtipos,                    selectedSubtipoRef,  "legend-subtipo");

      const subsOn    = SUBS.filter(s => selectedSubRef.current[s]);
      const energiaOn = tipos.filter(t => selectedTipoRef.current[t]);
      const tipo2On   = Object.keys(selectedTipo2Ref.current).filter(t => selectedTipo2Ref.current[t]);
      const subtipoOn = Object.keys(selectedSubtipoRef.current).filter(t => selectedSubtipoRef.current[t]);

      const showCombos = energiaOn.length > 0 && subsOn.length > 0 && tipo2On.length === 0 && subtipoOn.length === 0;
      SUBS.forEach((sub) => {
        tipos.forEach((tipo) => {
          const on = showCombos && subsOn.includes(sub) && energiaOn.includes(tipo);
          ["Rev","MtM","Vol"].forEach((pref) => {
            chart.dispatchAction({
              type: on ? "legendSelect" : "legendUnSelect",
              name: `${pref} ${sub}·${tipo}`,
              legendId: "legend-combos",
            } as any);
          });
        });
      });

      const showEnergiaOnly = energiaOn.length > 0 && subsOn.length === 0 && tipo2On.length === 0 && subtipoOn.length === 0;
      tipos.forEach((tipo) => {
        ["Rev","MtM","Vol"].forEach((pref) => {
          chart.dispatchAction({
            type: showEnergiaOnly && energiaOn.includes(tipo) ? "legendSelect" : "legendUnSelect",
            name: `${pref} · ${tipo}`,
            legendId: "legend-type-only",
          } as any);
        });
      });

      const showTipo2Only = tipo2On.length > 0 && subsOn.length === 0 && energiaOn.length === 0 && subtipoOn.length === 0;
      tipos2.forEach((t) => {
        ["Rev","MtM","Vol"].forEach((pref) => {
          chart.dispatchAction({
            type: showTipo2Only && tipo2On.includes(t) ? "legendSelect" : "legendUnSelect",
            name: `${pref} · Tipo ${t}`,
            legendId: "legend-tipo2-only",
          } as any);
        });
      });

      const showSubOnly = subsOn.length > 0 && energiaOn.length === 0 && tipo2On.length === 0 && subtipoOn.length === 0;
      (["SE","SU","NO","NE"] as Sub[]).forEach((s) => {
        ["Rev","MtM","Vol"].forEach((pref) => {
          chart.dispatchAction({
            type: showSubOnly && subsOn.includes(s) ? "legendSelect" : "legendUnSelect",
            name: `${pref} · Sub ${s}`,
            legendId: "legend-sub-only",
          } as any);
        });
      });

      const showSubtipoOnly = subtipoOn.length > 0 && subsOn.length === 0 && energiaOn.length === 0 && tipo2On.length === 0;
      subtipos.forEach((st) => {
        ["Rev","MtM","Vol"].forEach((pref) => {
          chart.dispatchAction({
            type: showSubtipoOnly && subtipoOn.includes(st) ? "legendSelect" : "legendUnSelect",
            name: `${pref} · Subtipo ${st}`,
            legendId: "legend-subtipo-only",
          } as any);
        });
      });
    },
  };

  return (
    <div style={{
      width: "100%",
      height: '90vh',
      padding: 20,
      boxSizing: "border-box",
      border: "1px solid var(--mui-palette-divider, #e5e7eb)",
      borderRadius: 1,
      background: "#fff",
      overflow: "hidden",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
    }}>
      <ReactECharts
        option={option}
        style={{ width: "100%", height: '90vh' }}
        onChartReady={onChartReady}
        onEvents={onEvents}
        notMerge={false}
        lazyUpdate
      />
    </div>
  );
}
