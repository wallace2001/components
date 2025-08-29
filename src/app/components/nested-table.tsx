"use client";

import React, { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Box, Typography, TableSortLabel
} from "@mui/material";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";

type DataItem = {
  year: number;
  month: string;
  product: string;
  mtm: number;
  net_v: number;
  net_f: number;
};

function groupData(data: DataItem[]) {
  return data.reduce((acc, item) => {
    (acc[item.year] ||= {});
    (acc[item.year][item.month] ||= []);
    acc[item.year][item.month].push(item);
    return acc;
  }, {} as Record<number, Record<string, DataItem[]>>);
}

type ColKey = "mtm" | "net_v" | "net_f";
type Dir = "asc" | "desc" | null;

const NestedTable: React.FC<{ data: DataItem[] }> = ({ data }) => {
  const [openYears, setOpenYears] = useState<Record<number, boolean>>({});
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const toggleYear = (y: number) => setOpenYears(p => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y: number, m: string) =>
    setOpenMonths(p => ({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));

  const [sortBy, setSortBy] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<Dir>(null);

  const handleSort = (col: ColKey) => {
    if (sortBy !== col) {
      setSortBy(col);
      setSortDir("asc");
    } else {
      setSortDir(prev =>
        prev === "asc" ? "desc" : prev === "desc" ? null : "asc"
      );
      if (sortDir === null) setSortBy(null);
    }
  };

  const sortedData = useMemo(() => {
    if (!sortBy || !sortDir) return [...data];
    return [...data].sort((a, b) => {
      const diff = a[sortBy] - b[sortBy];
      return sortDir === "asc" ? diff : -diff;
    });
  }, [data, sortBy, sortDir]);

  const grouped = useMemo(() => groupData(sortedData), [sortedData]);

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 520, overflow: "auto" }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Ano / Mês / Contraparte</TableCell>
            <TableCell align="right" sortDirection={sortBy === "mtm" ? sortDir || false : false}>
              <TableSortLabel
                active={sortBy === "mtm"}
                direction={sortBy === "mtm" ? sortDir ?? "asc" : "asc"}
                onClick={() => handleSort("mtm")}
              >
                mtm
              </TableSortLabel>
            </TableCell>
            <TableCell align="right" sortDirection={sortBy === "net_v" ? sortDir || false : false}>
              <TableSortLabel
                active={sortBy === "net_v"}
                direction={sortBy === "net_v" ? sortDir ?? "asc" : "asc"}
                onClick={() => handleSort("net_v")}
              >
                net_v
              </TableSortLabel>
            </TableCell>
            <TableCell align="right" sortDirection={sortBy === "net_f" ? sortDir || false : false}>
              <TableSortLabel
                active={sortBy === "net_f"}
                direction={sortBy === "net_f" ? sortDir ?? "asc" : "asc"}
                onClick={() => handleSort("net_f")}
              >
                net_f
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {Object.entries(grouped).map(([yearStr, months]) => {
            const year = Number(yearStr);
            const yearFlat = Object.values(months).flat();
            const yearTotals = yearFlat.reduce(
              (a, c) => ({
                mtm: a.mtm + c.mtm,
                net_v: a.net_v + c.net_v,
                net_f: a.net_f + c.net_f,
              }),
              { mtm: 0, net_v: 0, net_f: 0 }
            );

            return (
              <React.Fragment key={year}>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <IconButton size="small" onClick={() => toggleYear(year)}>
                        {openYears[year] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                      </IconButton>
                      <Typography sx={{ fontWeight: "bold", ml: 1 }}>{year}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{yearTotals.mtm.toFixed(2)}</TableCell>
                  <TableCell align="right">{yearTotals.net_v.toFixed(2)}</TableCell>
                  <TableCell align="right">{yearTotals.net_f.toFixed(2)}</TableCell>
                </TableRow>

                {openYears[year] &&
                  Object.entries(months).map(([month, items]) => {
                    const totals = items.reduce(
                      (a, c) => ({
                        mtm: a.mtm + c.mtm,
                        net_v: a.net_v + c.net_v,
                        net_f: a.net_f + c.net_f,
                      }),
                      { mtm: 0, net_v: 0, net_f: 0 }
                    );
                    return (
                      <React.Fragment key={month}>
                        <TableRow sx={{ backgroundColor: "#fcfcfc" }}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <IconButton size="small" onClick={() => toggleMonth(year, month)}>
                                {openMonths[`${year}-${month}`] ? (
                                  <KeyboardArrowUp />
                                ) : (
                                  <KeyboardArrowDown />
                                )}
                              </IconButton>
                              <Typography sx={{ ml: 1 }}>{month}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{totals.mtm.toFixed(2)}</TableCell>
                          <TableCell align="right">{totals.net_v.toFixed(2)}</TableCell>
                          <TableCell align="right">{totals.net_f.toFixed(2)}</TableCell>
                        </TableRow>

                        {openMonths[`${year}-${month}`] &&
                          items.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell sx={{ pl: 8, fontWeight: "bold" }}>
                                {item.product}
                              </TableCell>
                              <TableCell align="right">{item.mtm.toFixed(2)}</TableCell>
                              <TableCell align="right">{item.net_v.toFixed(2)}</TableCell>
                              <TableCell align="right">{item.net_f.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                      </React.Fragment>
                    );
                  })}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default NestedTable;
