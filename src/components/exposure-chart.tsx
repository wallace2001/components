/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";

type Sub = "SE" | "SU" | "NO" | "NE";
type Monthly = any;

const Y_LABEL_W = 72;
const LEFT_PAD = 50;

const TOOLBOX_ICON   = 18;
const SLIDER_HEIGHT  = 30;
const FOOTER_GAP     = 12;
const TOOLBOX_BOTTOM = 8;
const SLIDER_BOTTOM  = TOOLBOX_BOTTOM + TOOLBOX_ICON + 10;
const GRID4_BOTTOM   = SLIDER_BOTTOM + SLIDER_HEIGHT + FOOTER_GAP;

const SUBS: Sub[] = ["SE", "SU", "NO", "NE"];
const TIPO_ALLOWED: string[] | null = null;

// ---------- utils ----------
const toNum = (v: any) => (v == null || v === "" || isNaN(Number(v)) ? 0 : Number(v));
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const normalizeMonthKey = (raw: string): string | null => {
  const s = String(raw).trim();

  // 1) datas que o JS entende (YYYY-MM-DD, YYYY/MM/DD, etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return normMonth(d);

  // 2) YYYY-MM ou YYYY/MM
  let m = s.match(/^(\d{4})[-\/](\d{1,2})$/);
  if (m) {
    const y = +m[1], mon = +m[2];
    if (mon >= 1 && mon <= 12) return `${y}-${("0"+mon).slice(-2)}-01`;
  }

  // 3) YYYYMM
  m = s.match(/^(\d{4})(\d{2})$/);
  if (m) {
    const y = +m[1], mon = +m[2];
    if (mon >= 1 && mon <= 12) return `${y}-${("0"+mon).slice(-2)}-01`;
  }

  // 4) MM/YYYY
  m = s.match(/^(\d{1,2})[-\/](\d{4})$/);
  if (m) {
    const mon = +m[1], y = +m[2];
    if (mon >= 1 && mon <= 12) return `${y}-${("0"+mon).slice(-2)}-01`;
  }

  return null;
};

const catBase = (k: string) => String(k).split(/[_\-. ]/)[0];

const getKeyCI = (obj: any, key: string) => {
  if (!obj || typeof obj !== "object") return undefined;
  const hit = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return hit ? obj[hit] : undefined;
};

const getCatVariantCI = (obj: any, base: string, variants: string[]) => {
  if (!obj || typeof obj !== "object") return undefined;
  const keys = Object.keys(obj);
  const want = variants.map(v => `${base}_${v}`.toLowerCase());
  const hit = keys.find(k => want.includes(k.toLowerCase()));
  return hit ? obj[hit] : undefined;
};

const normMonth = (d: string | Date) => {
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  return `${y}-${pad2(m)}-01`;
};

const isDateKey = (k: string) => !isNaN(new Date(k).getTime());

/** Tenta extrair um mapa { ISOstring: number } de dentro de obj.
 * Suporta: direto (k=ISO → v=number) ou aninhado em price/prices/value/data/etc.
 */
function pickSeries(obj: any): Record<string, number> | null {
  if (!obj || typeof obj !== "object") return null;

  // tenta direto: { "YYYY-MM" | "YYYYMM" | "YYYY-MM-DD" | "MM/YYYY" : number|string }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    const iso = normalizeMonthKey(k);
    if (!iso) continue;
    const num = toNum(v as any);
    if (!isNaN(num)) out[iso] = num;
  }
  if (Object.keys(out).length) return out;

  // tenta dentro de campos comuns (price, prices, value, data, series…)
  const CANDIDATES = ["price", "prices", "valor", "value", "val", "serie", "series", "data"];
  for (const c of CANDIDATES) {
    const sub = (obj as any)[c];
    if (sub && typeof sub === "object") {
      const inner = pickSeries(sub);
      if (inner && Object.keys(inner).length) return inner;
    }
  }
  return null;
}

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
  if (a >= 1e12) return `${sign}${(a / 1e12).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} tri`;
  if (a >= 1e9)  return `${sign}${(a / 1e9 ).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
  if (a >= 1e6)  return `${sign}${(a / 1e6 ).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  return `${sign}${fmtBRLFull(a)}`;
};
const fmtPrice = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtVol   = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} MWm`;

const COLORS = {
  total: "#1f4e6b",
  SE: "#e76f51",
  SU: "#FF6666",
  NO: "#00bb60",
  NE: "#1d4d39ff",
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

export default function ExposureChart({ monthly, height = 780 }: { monthly: Monthly; height?: number }) {
  const chartRef = useRef<any>(null);

  const forward    = monthly?.forward ?? {};
  const totalsRaw  = (monthly?.totals as any[]) ?? [];
  const detailsRaw = (monthly?.details as any[]) ?? [];

  // -------- categorias (meses) --------
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
      const fsub = getSub(forward, sub) ?? {};
      Object.keys(fsub || {}).forEach((cat) => {
        const entry  = fsub[cat];
        const main   = pickSeries(entry);
        const buyObj = fsub[`${cat}_buy_avg`]  ?? entry?.price_buy_avg ?? entry?.buy_avg;
        const sellObj= fsub[`${cat}_sell_avg`] ?? entry?.price_sell_avg ?? entry?.sell_avg;

        if (main)   Object.keys(main).forEach((k) => dateSet.add(normMonth(k)));
        const buy   = pickSeries(buyObj);
        const sell  = pickSeries(sellObj);
        if (buy)  Object.keys(buy ).forEach((k) => dateSet.add(normMonth(k)));
        if (sell) Object.keys(sell).forEach((k) => dateSet.add(normMonth(k)));
      });
    });

    const ISO = Array.from(dateSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const LAB = ISO.map(fmtMes);
    const IDX = new Map(ISO.map((d, i) => [d, i]));
    return { categoriesISO: ISO, categories: LAB, idxByDate: IDX };
  }, [forward, totalsRaw, detailsRaw]);

  const len = categoriesISO.length;

  // ---- agregados principais (Totals) ----
  const revenueTOTAL = arr(len, 0);
  const mtmTOTAL     = arr(len, 0);
  const volumeTOTAL  = arr(len, 0);

  // ---- Revenue (+Receita / -Custo) ----
  const revReceita = arr(len, 0);
  const revCusto   = arr(len, 0);  // NEGATIVO
  const revNet     = arr(len, 0);

  // ---- Volume (Vendido / Comprado negativo) ----
  const volVendido = arr(len, 0);
  const volComprado = arr(len, 0); // NEGATIVO
  const volNetTOTAL = arr(len, 0);

  // Agregados por SUB
  const revBySub: Record<Sub, number[]> = { SE: arr(len,0), SU: arr(len,0), NO: arr(len,0), NE: arr(len,0) };
  const mtmBySub: Record<Sub, number[]> = { SE: arr(len,0), SU: arr(len,0), NO: arr(len,0), NE: arr(len,0) };
  const volBySub: Record<Sub, number[]> = { SE: arr(len,0), SU: arr(len,0), NO: arr(len,0), NE: arr(len,0) };

  // -------- tipos / categorias ----------
  const tiposFromDetails: string[] = useMemo(() => {
    const s = new Set<string>();
    detailsRaw.forEach((d) => {
      const t = (get<string>(d, "tp_tipo_energia", "tipo", "energy_type") || "").toUpperCase().trim();
      if (t) s.add(t);
    });
    return Array.from(s.values());
  }, [detailsRaw]);

  const catsFromForward: string[] = useMemo(() => {
    const s = new Set<string>();
    SUBS.forEach((sub) => {
      const fsub = getSub(forward, sub) ?? {};
      Object.keys(fsub).forEach((k) => {
        const base = String(k).split(/[_\-. ]/)[0].toUpperCase();
        if (base) s.add(base);
      });
    });
    return Array.from(s.values());
  }, [forward]);

  const tiposAll: string[] = useMemo(() => {
    const u = new Set<string>([...tiposFromDetails, ...catsFromForward]);
    const all = Array.from(u.values());
    return TIPO_ALLOWED ? all.filter(t => TIPO_ALLOWED.includes(t)) : all;
  }, [tiposFromDetails, catsFromForward]);

  type ComboKey = `${Sub}|${string}`;
  const combos: ComboKey[] = useMemo(
    () => SUBS.flatMap((sub) => tiposAll.map((tp) => `${sub}|${tp}` as ComboKey)),
    [tiposAll]
  );

  const revByCombo: Record<ComboKey, number[]> = Object.fromEntries(combos.map(k => [k, arr(len, 0)])) as any;
  const mtmByCombo: Record<ComboKey, number[]> = Object.fromEntries(combos.map(k => [k, arr(len, 0)])) as any;
  const volByCombo: Record<ComboKey, number[]> = Object.fromEntries(combos.map(k => [k, arr(len, 0)])) as any;

    // --- AGREGA DOS TOTAIS (totalsRaw) ---
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

      // Volume agregado
      volVendido[i]   += sell;
      volComprado[i]  += -Math.abs(buy);
      volumeTOTAL[i]  += sell + (-Math.abs(buy));
  }

  // Totais + combos
  for (const d of detailsRaw) {
    const i = idxByDate.get(normMonth(get<string>(d, "supply_period", "month", "period", "date") ?? ""));
    if (i == null) continue;

    const tipoEnergia = (get<string>(d, "tp_tipo_energia", "tipo", "energy_type") || "").toUpperCase().trim();
    const r  = toNum(get<number>(d, "revenue", "total_revenue", "rev"));
    const m  = toNum(get<number>(d, "mtm", "mtm_value", "marktomarket"));
    const s  = toNum(get<number>(d, "volume_sell_mwm", "volume_sell", "vol_sell", "sell_mwm"));
    const b  = toNum(get<number>(d, "volume_buy_mwm",  "volume_buy",  "vol_buy",  "buy_mwm"));
    const c  = toNum(get<number>(d, "cost"));
    const sub = normSub(get<string>(d, "tp_submercado","submercado","sub_mercado","submarket","sub"));

    if (r >= 0) revReceita[i] += r; else revCusto[i] += r;
    if (c !== 0) revCusto[i]  += -Math.abs(c);

    const vb = s + (-Math.abs(b));
    if (sub) {
      revBySub[sub][i] += r;
      mtmBySub[sub][i] += m;
      volBySub[sub][i] += vb;

      if (tipoEnergia) {
        const key = `${sub}|${tipoEnergia}` as ComboKey;
        if (revByCombo[key]) {
          revByCombo[key][i] += r;
          mtmByCombo[key][i] += m;
          volByCombo[key][i] += vb;
        }
      }
    }
  }

  for (let i = 0; i < len; i++) {
    revNet[i] = revReceita[i] + revCusto[i];
    volNetTOTAL[i] = volVendido[i] + volComprado[i];
  }

  // -------- PRICE (forward) --------
  type PriceKey = `${Sub} ${string}`;

  // mantém bases "raw" por sub (sem upper)
  const priceCatsBySubRaw: Record<Sub, string[]> = useMemo(() => {
    const out: Record<Sub, string[]> = { SE:[], SU:[], NO:[], NE:[] };
    SUBS.forEach((sub) => {
      const fsub = getSub(forward, sub) ?? {};
      const cats = new Set<string>();
      Object.keys(fsub).forEach((k) => {
        const base = catBase(k);
        if (base) cats.add(base);
      });
      out[sub] = Array.from(cats.values());
    });
    return out;
  }, [forward]);

  // labels da legenda + mapa label→baseRaw (para lookup)
  const { priceKeys, labelToRaw } = useMemo(() => {
    const labels: PriceKey[] = [];
    const map: Record<string, string> = {};
    SUBS.forEach((sub) => {
      priceCatsBySubRaw[sub].forEach((raw) => {
        const label = `${sub} ${raw.toUpperCase()}` as PriceKey; // legenda bonita
        labels.push(label);
        map[label] = raw; // para buscar no objeto com o case correto
      });
    });
    return { priceKeys: labels, labelToRaw: map };
  }, [priceCatsBySubRaw]);

  // === MÉDIA PONDERADA DOS PREÇOS MÉDIOS A PARTIR DE details ===
  type MonthAgg = Record<string, { sum: number; vol: number }>;

  const buyAgg: Record<ComboKey, MonthAgg> = {};
  const sellAgg: Record<ComboKey, MonthAgg> = {};

  for (const d of detailsRaw) {
    const sub = normSub(get<string>(d, "tp_submercado","submercado","sub_mercado","submarket","sub"));
    const tipo = (get<string>(d, "tp_tipo_energia","tipo","energy_type") || "").toUpperCase().trim();
    const iso = normMonth(get<string>(d, "supply_period","month","period","date") || "");
    if (!sub || !tipo || !iso) continue;
    const key = `${sub}|${tipo}` as ComboKey;

    const vb = Math.max(0, toNum(get<number>(d, "volume_buy_mwm","volume_buy","vol_buy","buy_mwm")));
    const vs = Math.max(0, toNum(get<number>(d, "volume_sell_mwm","volume_sell","vol_sell","sell_mwm")));

    const pb = get<number>(d, "price_buy_avg","buy_avg");
    const ps = get<number>(d, "price_sell_avg","sell_avg");

    if (pb != null && !isNaN(+pb) && vb > 0) {
      (buyAgg[key] ||= {})[iso] = {
        sum: ((buyAgg[key]?.[iso]?.sum) ?? 0) + Number(pb) * vb,
        vol: ((buyAgg[key]?.[iso]?.vol) ?? 0) + vb,
      };
    }
    if (ps != null && !isNaN(+ps) && vs > 0) {
      (sellAgg[key] ||= {})[iso] = {
        sum: ((sellAgg[key]?.[iso]?.sum) ?? 0) + Number(ps) * vs,
        vol: ((sellAgg[key]?.[iso]?.vol) ?? 0) + vs,
      };
    }
  }

  const buyAvgByMonth: Record<ComboKey, Record<string, number>> = {};
  const sellAvgByMonth: Record<ComboKey, Record<string, number>> = {};
  (Object.keys(buyAgg) as ComboKey[]).forEach((k) => {
    const m: Record<string, number> = {};
    Object.entries(buyAgg[k]).forEach(([iso, { sum, vol }]) => { if (vol > 0) m[iso] = sum / vol; });
    buyAvgByMonth[k] = m;
  });
  (Object.keys(sellAgg) as ComboKey[]).forEach((k) => {
    const m: Record<string, number> = {};
    Object.entries(sellAgg[k]).forEach(([iso, { sum, vol }]) => { if (vol > 0) m[iso] = sum / vol; });
    sellAvgByMonth[k] = m;
  });


  const priceMain: Record<PriceKey, (number|null)[]> =
    Object.fromEntries(priceKeys.map(k => [k, arr(len, null)])) as any;
  const priceBuyAvg: Record<PriceKey, (number|null)[]> =
    Object.fromEntries(priceKeys.map(k => [k, arr(len, null)])) as any;
  const priceSellAvg: Record<PriceKey, (number|null)[]> =
    Object.fromEntries(priceKeys.map(k => [k, arr(len, null)])) as any;

  const isNumLike = (x: any) =>
    x != null && (typeof x === "number" || (typeof x === "string" && x.trim() !== "" && !isNaN(Number(x))));

  function fillFrom(obj: any, arrRef: (number | null)[], mask?: (number | null)[]) {
    // Se vier um único número, pinta onde houver mask (priceMain) ou tudo
    if (isNumLike(obj)) {
      const val = Number(obj);
      for (let i = 0; i < arrRef.length; i++) {
        if (!mask || mask[i] != null) arrRef[i] = val;
      }
      return;
    }
    const series = pickSeries(obj);
    if (!series) return;
    for (const [k, v] of Object.entries(series)) {
      const i = idxByDate.get(normMonth(k));
      if (i != null) arrRef[i] = toNum(v);
    }
  }

  // === FALLBACK: usa os avg agregados de details quando não existem no forward ===
  function fillFromAgg(
    agg: Record<ComboKey, Record<string, number>>,
    target: Record<`${Sub} ${string}`, (number|null)[]>
  ) {
    SUBS.forEach((sub) => {
      tiposAll.forEach((tipo) => {
        const key = `${sub}|${tipo}` as ComboKey;
        const label = `${sub} ${tipo}` as `${Sub} ${string}`;
        const m = agg[key];
        if (!m) return;
        categoriesISO.forEach((iso, i) => {
          if (m[iso] != null) target[label][i] = m[iso];
        });
      });
    });
  }

  fillFromAgg(buyAvgByMonth,  priceBuyAvg);
  fillFromAgg(sellAvgByMonth, priceSellAvg);

  // preencher usando busca case-insensível + variantes
  SUBS.forEach((sub) => {
    const fsub = getSub(forward, sub) ?? {};
    priceKeys.forEach((label) => {
      if (!label.startsWith(sub + " ")) return;
      const raw = labelToRaw[label];

      const entry   = getKeyCI(fsub, raw) ?? {};
      const buyObj  = getCatVariantCI(fsub, raw, ["buy_avg", "avg_buy"])
                  ?? entry?.price_buy_avg ?? entry?.buy_avg;
      const sellObj = getCatVariantCI(fsub, raw, ["sell_avg", "avg_sell"])
                  ?? entry?.price_sell_avg ?? entry?.sell_avg;

      fillFrom(entry,   priceMain[label]);          // série principal (igual antes)
      fillFrom(buyObj,  priceBuyAvg[label]);        // SEM máscara
      fillFrom(sellObj, priceSellAvg[label]);       // SEM máscara

    });
  });
  // === CONTROLE DE LEGEND (todos selecionados por padrão) ===
  const [legendSel, setLegendSel] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    priceKeys.forEach((label) => {
      next[label] = legendSel.hasOwnProperty(label) ? !!legendSel[label] : true;
    });
    const same = JSON.stringify(next) === JSON.stringify(legendSel);
    if (!same) setLegendSel(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(priceKeys)]);

  const selectedPairs = useMemo(() => {
    const out: Array<{ sub: Sub; tipo: string }> = [];
    Object.entries(legendSel).forEach(([label, on]) => {
      if (!on) return;
      const [subStr, ...rest] = label.split(" ");
      const sub = subStr as Sub;
      const tipo = (rest.join(" ") || "").toUpperCase().trim();
      if (SUBS.includes(sub) && tipo) out.push({ sub, tipo });
    });
    return out;
  }, [legendSel]);

  const option = useMemo(() => {
    const S = (a?: (number | null)[]) => (a ?? arr(len, 0));
    const colorFor = (sub: Sub, tipo: string) => tint(COLORS[sub], Math.max(0, tiposAll.indexOf(tipo)));
    const anyPairSelected = selectedPairs.length > 0;

    // ==== SERIES PRICE (grid 0) ====
    const seriesPrice: any[] = [];

    const mkLine = (
      id: string,
      name: string,
      data: (number|null)[],
      color: string,
      dashed = false,
      withSymbols = false,
      connect = true
    ) => ({
      id,
      name,
      type: "line",
      xAxisIndex: 0,
      yAxisIndex: 0,
      data,
      // símbolos ON para séries esparsas (buy/sell) para aparecer ponto isolado
      showSymbol: withSymbols ? "auto" : false,
      symbol: "circle",
      symbolSize: 4,
      // usar lineStyle para cor/traço
      lineStyle: { width: dashed ? 1.6 : 2.2, type: dashed ? "dashed" : "solid", color },
      itemStyle: { color }, // deixa aqui só para o símbolo
      connectNulls: connect, // para médias: false (não ligar buracos)
      z: dashed ? 3 : 4,
      emphasis: { lineStyle: { width: dashed ? 2 : 3 } },
    });

    priceKeys.forEach((name) => {
      const [subStr, ...rest] = name.split(" ");
      const sub = subStr as Sub;
      const tipo = rest.join(" ");
      const color = colorFor(sub, tipo);

      // principal (contínua)
      if (priceMain[name]?.some(v => v != null)) {
        seriesPrice.push(mkLine(`price|${name}|main`, name, priceMain[name], color, false, false, true));
      }
      // média compra (tracejada + símbolos + NÃO conectar nulos)
      if (priceBuyAvg[name]?.some(v => v != null)) {
        seriesPrice.push(mkLine(`price|${name}|buy`, name, priceBuyAvg[name], color, true, true, false));
      }
      // média venda (tracejada + símbolos + NÃO conectar nulos)
      if (priceSellAvg[name]?.some(v => v != null)) {
        seriesPrice.push(mkLine(`price|${name}|sell`, name, priceSellAvg[name], color, true, true, false));
      }
    });

    // ===== SERIES MTM / VOL / REV =====
    const BAR_WIDE = { barMaxWidth: 26, barMinHeight: 3, barCategoryGap: "12%", barGap: "-10%" };
    const BAR_WIDE_AGG = { barMaxWidth: 22, barMinHeight: 3, barCategoryGap: "16%", barGap: "20%" };

    const seriesMtm: any[] = [];
    const seriesVol: any[] = [];
    const seriesRev: any[] = [];

    if (anyPairSelected) {
      selectedPairs.forEach(({ sub, tipo }) => {
        const key = `${sub}|${tipo}` as `${Sub}|${string}`;
        const color = colorFor(sub, tipo);

        seriesMtm.push({
          name: `MtM ${sub}·${tipo}`,
          type: "bar", xAxisIndex: 1, yAxisIndex: 1,
          stack: `mtm-${sub}`, data: S(mtmByCombo[key]),
          itemStyle: { color }, ...BAR_WIDE,
        });

        seriesVol.push({
          name: `Vol ${sub}·${tipo}`,
          type: "bar", xAxisIndex: 2, yAxisIndex: 2,
          stack: `vol-${sub}`, data: S(volByCombo[key]),
          itemStyle: { color }, ...BAR_WIDE,
        });

        seriesRev.push({
          name: `Rev ${sub}·${tipo}`,
          type: "bar", xAxisIndex: 3, yAxisIndex: 3,
          stack: `rev-${sub}`, data: S(revByCombo[key]),
          itemStyle: { color }, ...BAR_WIDE,
        });
      });
    } else {
      SUBS.forEach((s) => {
        seriesMtm.push({
          name: `MtM · Sub ${s}`,
          type: "bar", xAxisIndex: 1, yAxisIndex: 1,
          stack: "mtm-sub", data: S(mtmBySub[s]),
          itemStyle: { color: COLORS[s] as string }, ...BAR_WIDE,
        });
        seriesVol.push({
          name: `Vol · Sub ${s}`,
          type: "bar", xAxisIndex: 2, yAxisIndex: 2,
          stack: "vol-sub", data: S(volBySub[s]),
          itemStyle: { color: COLORS[s] as string }, ...BAR_WIDE,
        });
        seriesRev.push({
          name: `Rev · Sub ${s}`,
          type: "bar", xAxisIndex: 3, yAxisIndex: 3,
          stack: "rev-sub", data: S(revBySub[s]),
          itemStyle: { color: COLORS[s] as string }, ...BAR_WIDE,
        });
      });
    }

    // Séries agregadas (sempre visíveis)
    const seriesAgg = [
      { name: "Total", type: "bar", xAxisIndex: 1, yAxisIndex: 1,
        data: mtmTOTAL, itemStyle: { color: COLORS.total }, ...BAR_WIDE_AGG },
      { name: "Total", type: "bar", xAxisIndex: 2, yAxisIndex: 2,
        data: volumeTOTAL, itemStyle: { color: COLORS.total }, ...BAR_WIDE_AGG },
      { name: "Vendido",  type: "bar", xAxisIndex: 2, yAxisIndex: 2,
        stack: "vol-vs", data: volVendido, ...BAR_WIDE_AGG },
      { name: "Comprado", type: "bar", xAxisIndex: 2, yAxisIndex: 2,
        stack: "vol-vs", data: volComprado, ...BAR_WIDE_AGG },
      { name: "Net",      type: "line",xAxisIndex: 2, yAxisIndex: 2, data: volNetTOTAL, smooth:false, showSymbol:false, z:4 },
      { name: "Total", type: "bar", xAxisIndex: 3, yAxisIndex: 3,
        data: revenueTOTAL, itemStyle: { color: COLORS.total }, ...BAR_WIDE_AGG },
      { name: "Faturamento", type: "bar", xAxisIndex: 3, yAxisIndex: 3, stack: "rev-fc", data: revReceita, ...BAR_WIDE_AGG },
      { name: "Custo",       type: "bar", xAxisIndex: 3, yAxisIndex: 3, stack: "rev-fc", data: revCusto, ...BAR_WIDE_AGG },
      { name: "Net", type: "line", xAxisIndex: 3, yAxisIndex: 3, data: revNet, smooth: false, showSymbol: false, z: 4 },
    ];

    // legenda do topo
    const legendPriceData = priceKeys;

    return {
      color: [COLORS.total, COLORS.SE, COLORS.SU, COLORS.NO, COLORS.NE],
      textStyle: { fontFamily: "Inter, Roboto, Arial, sans-serif" },

      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        extraCssText:
          "max-width: 640px; max-height: 560px; overflow:auto; padding:8px 10px; box-shadow:0 6px 24px rgba(0,0,0,.12);",
        formatter: (params: any[]) => {
          if (!params?.length) return "";

          const header =
            `<div style="margin-bottom:6px;font-weight:700">${params[0].axisValueLabel ?? ""}</div>`;

          const fmt = (ai:number, v:number) =>
            ai === 0 ? fmtPrice(+v)
            : ai === 2 ? fmtVol(+v)
            : fmtBRLFull(+v);

          const dot = (c: string) =>
            `<span style="display:inline-block;width:10px;height:10px;background:${Array.isArray(c)?c[0]:c};border-radius:50%;margin-right:6px;"></span>`;

          const row = (p: any, label: string) => {
            if (p?.data == null) return "";
            return `<div style="display:flex;justify-content:space-between;gap:12px;line-height:1.2;margin:2px 0;">
              <div>${dot(p.color)}${label}</div>
              <div style="text-align:right;min-width:92px">${fmt(p.axisIndex, +p.data)}</div>
            </div>`;
          };

          const sectionTitle = (txt: string) =>
            `<div style="margin:8px 0 4px;font-weight:600;opacity:.85">${txt}</div>`;

          // Agrupa itens por eixo
          const byAxis: Record<number, any[]> = { 0:[],1:[],2:[],3:[] };
          params.forEach((p:any)=>{ if(p?.data!=null) byAxis[p.axisIndex].push(p); });

          // ---- helpers p/ ordenar por SUB e tipo
          const orderSubs = (a:Sub,b:Sub) => SUBS.indexOf(a) - SUBS.indexOf(b);
          const orderTipos = (a:string,b:string) => {
            const ia = tiposAll.indexOf(a), ib = tiposAll.indexOf(b);
            if (ia === -1 && ib === -1) return a.localeCompare(b);
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
          };

          // === Painel 0: PRICE => SUB ▸ TIPO (preço / compra / venda)
          const priceHTML = (() => {
            const list = byAxis[0];
            if (!list.length) return "";

            // sub -> tipo -> {price?, buy?, sell?}
            const bucket: Record<Sub, Record<string, { p?: any; buy?: any; sell?: any }>> = {
              SE:{}, SU:{}, NO:{}, NE:{},
            } as any;

            list.forEach((p:any) => {
              const name = String(p.seriesName || ""); // "SE CON"
              const [subStr, ...tipoRest] = name.split(" ");
              const sub = subStr as Sub;
              const tipo = (tipoRest.join(" ") || "").toUpperCase().trim();
              if (!SUBS.includes(sub) || !tipo) return;
              const id = String(p.seriesId || "");
              const kind = id.endsWith("|buy") ? "buy" : id.endsWith("|sell") ? "sell" : "p";
              bucket[sub][tipo] = bucket[sub][tipo] || {};
              (bucket[sub][tipo] as any)[kind] = p;
            });

            const parts: string[] = [];
            (["Price"] as const).forEach(title => parts.push(sectionTitle(title)));

            SUBS.sort(orderSubs as any).forEach((sub) => {
              const tipos = Object.keys(bucket[sub] || {});
              if (!tipos.length) return;
              parts.push(`<div style="margin:6px 0 2px;font-weight:600">${sub}</div>`);
              tipos.sort(orderTipos).forEach((tp) => {
                const grp = bucket[sub][tp];
                if (!grp) return;
                if (grp.p)   parts.push(row(grp.p,   `${sub} ▸ ${tp} `));
                if (grp.buy) parts.push(row(grp.buy, `${sub} ▸ ${tp} · compra média`));
                if (grp.sell)parts.push(row(grp.sell,`${sub} ▸ ${tp} · venda média`));
              });
            });

            return parts.join("");
          })();

          const panelHTML = (ai:number, title:string) => {
            const list = byAxis[ai];
            if (!list.length) return "";

            // Separa agregados
            const aggs: any[] = [];
            const items: Array<{sub:Sub, tipo?:string, p:any}> = [];

            list.forEach((p:any) => {
              const name = String(p.seriesName || "");
              // "MtM SE·CON" / "Vol SU·I5" / "Rev NO·CON"  (modo por par)
              let m = name.match(/^(MtM|Vol|Rev)\s+([A-Z]{2})·(.+)$/);
              if (m) {
                const sub = m[2] as Sub;
                const tipo = (m[3] || "").toUpperCase().trim();
                if (SUBS.includes(sub) && tipo) items.push({ sub, tipo, p });
                return;
              }
              // "MtM · Sub SE" (fallback por SUB)
              m = name.match(/^(MtM|Vol|Rev)\s+·\s+Sub\s+([A-Z]{2})$/);
              if (m) {
                const sub = m[2] as Sub;
                if (SUBS.includes(sub)) items.push({ sub, p });
                return;
              }
              // Agregados (Total, Vendido, Comprado, Net)
              aggs.push(p);
            });

            // Monta SUB → [tipos] (ou sem tipo)
            const bucket: Record<Sub, Record<string, any> | { __sub__?: any[] }> = { SE:{}, SU:{}, NO:{}, NE:{} } as any;
            items.forEach(({sub, tipo, p}) => {
              if (!tipo) {
                (bucket[sub] as any).__sub__ = (bucket[sub] as any).__sub__ || [];
                (bucket[sub] as any).__sub__.push(p);
              } else {
                (bucket[sub] as any)[tipo] = p;
              }
            });

            const parts: string[] = [];
            parts.push(sectionTitle(title));

            SUBS.sort(orderSubs as any).forEach((sub) => {
              const b = bucket[sub];
              const tipos = Object.keys(b || {}).filter(k => k !== "__sub__");
              const hasSubOnly = (b as any).__sub__?.length;

              if (!tipos.length && !hasSubOnly) return;

              parts.push(`<div style="margin:6px 0 2px;font-weight:600">${sub}</div>`);

              if (tipos.length) {
                tipos.sort(orderTipos).forEach(tp => {
                  const p = (b as any)[tp];
                  if (p) parts.push(row(p, `${sub} ▸ ${tp}`));
                });
              } else if (hasSubOnly) {
                (b as any).__sub__.forEach((p:any) => parts.push(row(p, `Sub ${sub}`)));
              }
            });

            if (aggs.length) {
              parts.push(sectionTitle("Agregados"));
              aggs.forEach((p:any) => parts.push(row(p, p.seriesName)));
            }

            return parts.join("");
          };

          const out =
            header +
            priceHTML +
            panelHTML(1, "MtM") +
            panelHTML(2, "Volume") +
            panelHTML(3, "Revenue");

          return out;
        }
      },

      grid: [
        { top:136, left:LEFT_PAD, right:20, height:112, containLabel:false }, // price
        { top:296, left:LEFT_PAD, right:20, height:128, containLabel:false }, // mtm
        { top:456, left:LEFT_PAD, right:20, height:128, containLabel:false }, // volume
        { top:616, left:LEFT_PAD, right:20, height: 96, bottom: GRID4_BOTTOM, containLabel:false }, // revenue
      ],

      legend: [
        { id: "legend-price", top: 8, left: "center", orient: "horizontal",
          itemGap: 12, itemWidth: 22, itemHeight: 12, icon: "roundRect",
          data: legendPriceData, selected: legendSel, textStyle: { fontSize: 12 } },
      ],

      xAxis: [0,1,2,3].map((i) => ({
        type: "category",
        gridIndex: i,
        data: categories,
        boundaryGap: i !== 0,
        axisTick: { show: i === 3 },
        axisLabel: i === 3 ? { margin: 10 } : { show: false },
      })),

      yAxis: [
        { type: "value", gridIndex: 0, name: "Price (BRL/MWh)",
          axisLabel: { formatter: (v:number) => v.toLocaleString("pt-BR"), width: Y_LABEL_W, align: "right", overflow: "truncate", margin: 6 } },
        { type: "value", gridIndex: 1, name: "MtM (BRL)", scale: true, splitNumber: 5,
          axisLabel: { formatter: (v:number) => fmtBRLShort(v), width: Y_LABEL_W, align: "right", overflow: "truncate", margin: 6 } },
        { type: "value", gridIndex: 2, name: "Volume (MWm)", scale: true, splitNumber: 5,
          axisLabel: { formatter: (v:number) => v.toLocaleString("pt-BR"), width: Y_LABEL_W, align: "right", overflow: "truncate", margin: 6 } },
        { type: "value", gridIndex: 3, name: "Revenue (BRL)", scale: true, splitNumber: 5,
          axisLabel: { formatter: (v:number) => fmtBRLShort(v), width: Y_LABEL_W, align: "right", overflow: "truncate", margin: 6 } },
      ],

      dataZoom: [
        { type:"slider", xAxisIndex:[0,1,2,3], left:LEFT_PAD, right:20, bottom: 5, height: SLIDER_HEIGHT,
          filterMode:"filter", handleSize:18, brushSelect:false, z:15 },
        { type:"inside", xAxisIndex:[0,1,2,3], filterMode:"filter" },
      ],

      toolbox: {
        show:true, left: 5, bottom: -8, itemSize: TOOLBOX_ICON, z:20,
        iconStyle:{ borderColor:"#6b7280" }, emphasis:{ iconStyle:{ borderColor:"#111827" } },
        feature:{ restore:{ title:"Redefinir zoom" } },
      },

      series: [
        // PRICE
        ...seriesPrice,

        // MTM
        ...seriesMtm,

        // VOLUME (selecionados) + agregados
        ...seriesVol,
        ...seriesAgg.slice(1, 5), // Total, Vendido, Comprado, Net

        // REVENUE (selecionados) + agregados
        ...seriesRev,
        ...seriesAgg.slice(5),

        // MTM Total (primeiro do bloco)
        seriesAgg[0],
      ],
      animationDuration: 220,
    };
  }, [
    len, categories,
    priceKeys, priceMain, priceBuyAvg, priceSellAvg,
    revenueTOTAL, mtmTOTAL, volumeTOTAL,
    revReceita, revCusto, revNet,
    volVendido, volComprado, volNetTOTAL,
    revBySub, mtmBySub, volBySub,
    tiposAll, combos, revByCombo, mtmByCombo, volByCombo,
    legendSel, selectedPairs,
  ]);

  const onChartReady = (chart: any) => { chartRef.current = chart; };

  const onEvents = {
    legendselectchanged: (ev: any) => {
      if (ev && ev.selected) setLegendSel(ev.selected as Record<string, boolean>);
    },
  };

  return (
    <div style={{
      width: "100%",
      height: '100vh',
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
        style={{ width: "100%", height }}
        onChartReady={onChartReady}
        onEvents={onEvents}
        notMerge={true}
        lazyUpdate={false}
      />
    </div>
  );
}
