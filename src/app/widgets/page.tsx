"use client";

import { Typography } from "@mui/material";
import ExposureWidgets from "../../components/exposure-widgets";

export default function ExposureWidgetsPage() {
  return (
    <main style={{ padding: "20px" }}>
      <Typography variant="h4" gutterBottom>
        Exposure Widgets
      </Typography>
      <ExposureWidgets />
    </main>
  );
}
