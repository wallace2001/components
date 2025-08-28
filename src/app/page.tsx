import data from "../data/data 2.json";
import NestedTable from "./components/nested-table";

export default function Home() {
  return (
    <main>
      <h1>Tabela Hierárquica</h1>
      <NestedTable data={data} />
    </main>
  );
}
