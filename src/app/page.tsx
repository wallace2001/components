"use client";

import Link from "next/link";
import {
  List,
  ListItem,
  ListItemText,
  Button,
  Paper,
  Typography,
} from "@mui/material";

export default function Home() {
  const components = [
    { name: "Tabela", path: "/nested-table" },
    { name: "Widgets", path: "/widgets" },
  ];

  return (
    <main style={{ padding: "20px" }}>
      <Typography variant="h4" gutterBottom>
        Lista de Componentes
      </Typography>
      <Paper>
        <List>
          {components.map((comp) => (
            <ListItem
              key={comp.path}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <ListItemText primary={comp.name} />
              <Link href={comp.path} passHref>
                <Button variant="contained">Ver</Button>
              </Link>
            </ListItem>
          ))}
        </List>
      </Paper>
    </main>
  );
}
