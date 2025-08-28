"use client";

import React, { useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Collapse, Box, Typography
} from "@mui/material";
import {
  Menu, MenuItem, Checkbox, ListItemText
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";

type DataItem = {
  year: number;
  month: string;
  product: string;
  mtm: number;
  net_v: number;
  net_f: number;
};

type GroupedData = {
  [year: number]: {
    [month: string]: DataItem[];
  };
};

function groupData(data: DataItem[]): GroupedData {
  return data.reduce((acc, item) => {
    if (!acc[item.year]) acc[item.year] = {};
    if (!acc[item.year][item.month]) acc[item.year][item.month] = [];
    acc[item.year][item.month].push(item);
    return acc;
  }, {} as GroupedData);
}

const NestedTable: React.FC<{ data: DataItem[] }> = ({ data }) => {
  const grouped = groupData(data);
  const [openYears, setOpenYears] = useState<{ [key: number]: boolean }>({});
  const [openMonths, setOpenMonths] = useState<{ [key: string]: boolean }>({});

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [visibleColumns, setVisibleColumns] = useState({
    mtm: true,
    net_v: true,
    net_f: true,
  });

const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
  setAnchorEl(event.currentTarget);
};

const handleCloseMenu = () => {
  setAnchorEl(null);
};

const toggleColumn = (col: keyof typeof visibleColumns) => {
  setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }));
};


  const toggleYear = (year: number) => {
    setOpenYears((prev) => ({ ...prev, [year]: !prev[year] }));
  };

  const toggleMonth = (year: number, month: string) => {
    const key = `${year}-${month}`;
    setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <TableContainer
    component={Paper}
    sx={{
        maxHeight: 500,   // altura máxima
        maxWidth: "100%", // ocupa toda a largura disponível
        overflow: "auto", // scroll automático
    }}
    >
    <Box display="flex" justifyContent="flex-end" p={1}>
    <IconButton onClick={handleOpenMenu}>
        <SettingsIcon />
    </IconButton>
    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        {Object.keys(visibleColumns).map((col) => (
        <MenuItem key={col} onClick={() => toggleColumn(col as keyof typeof visibleColumns)}>
            <Checkbox checked={visibleColumns[col as keyof typeof visibleColumns]} />
            <ListItemText primary={col} />
        </MenuItem>
        ))}
    </Menu>
    </Box>
<Table stickyHeader sx={{
  borderCollapse: "collapse",
  "& th, & td": { border: "1px solid rgba(224,224,224,1)" },
  "& th:last-child, & td:last-child": { borderRight: "none" }
}}>
  <TableHead>
    <TableRow>
      <TableCell>Ano / Mês / Contraparte</TableCell>
      {visibleColumns.mtm && <TableCell align="right">mtm</TableCell>}
      {visibleColumns.net_v && <TableCell align="right">net_v</TableCell>}
      {visibleColumns.net_f && <TableCell align="right">net_f</TableCell>}
    </TableRow>
  </TableHead>
  <TableBody>
    {Object.entries(grouped).map(([year, months]) => {
      const yearTotals = Object.values(months).flat().reduce(
        (acc, cur) => {
          acc.mtm += cur.mtm;
          acc.net_v += cur.net_v;
          acc.net_f += cur.net_f;
          return acc;
        },
        { mtm: 0, net_v: 0, net_f: 0 }
      );

      return (
        <React.Fragment key={year}>
          {/* Linha do Ano */}
          <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
            <TableCell>
            <Box display="flex" alignItems="center">
                <IconButton size="small" onClick={() => toggleYear(Number(year))}>
                {openYears[Number(year)] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                </IconButton>
                <Typography sx={{ fontWeight: "bold", ml: 1 }}>{year}</Typography>
            </Box>
            </TableCell>
            {visibleColumns.mtm && <TableCell align="right">{yearTotals.mtm.toFixed(2)}</TableCell>}
            {visibleColumns.net_v && <TableCell align="right">{yearTotals.net_v.toFixed(2)}</TableCell>}
            {visibleColumns.net_f && <TableCell align="right">{yearTotals.net_f.toFixed(2)}</TableCell>}
          </TableRow>

          {/* Meses */}
          {openYears[Number(year)] &&
            Object.entries(months).map(([month, items]) => {
              const totals = items.reduce(
                (acc, cur) => {
                  acc.mtm += cur.mtm;
                  acc.net_v += cur.net_v;
                  acc.net_f += cur.net_f;
                  return acc;
                },
                { mtm: 0, net_v: 0, net_f: 0 }
              );

              return (
                <React.Fragment key={month}>
                  {/* Linha do Mês */}
                  <TableRow sx={{ backgroundColor: "#fcfcfc" }}>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleMonth(Number(year), month)}>
                        {openMonths[`${year}-${month}`] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                      </IconButton>
                      {month}
                    </TableCell>
                    {visibleColumns.mtm && <TableCell align="right">{totals.mtm.toFixed(2)}</TableCell>}
                    {visibleColumns.net_v && <TableCell align="right">{totals.net_v.toFixed(2)}</TableCell>}
                    {visibleColumns.net_f && <TableCell align="right">{totals.net_f.toFixed(2)}</TableCell>}
                  </TableRow>

                  {/* Contrapartes */}
                  {openMonths[`${year}-${month}`] &&
                    items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ pl: 8, fontWeight: "bold" }}>
                          {item.product}
                        </TableCell>
                        {visibleColumns.mtm && <TableCell align="right">{item.mtm.toFixed(2)}</TableCell>}
                        {visibleColumns.net_v && <TableCell align="right">{item.net_v.toFixed(2)}</TableCell>}
                        {visibleColumns.net_f && <TableCell align="right">{item.net_f.toFixed(2)}</TableCell>}
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
