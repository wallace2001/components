"use client";

import data from "../../data/data 2.json";
import NestedTable from "../components/nested-table";
import { Typography } from "@mui/material";

export default function NestedTablePage() {
  return (
    <main style={{ padding: "20px" }}>
      <Typography variant="h4" gutterBottom>
        Nested Table
      </Typography>
      <NestedTable data={data} />
    </main>
  );
}
