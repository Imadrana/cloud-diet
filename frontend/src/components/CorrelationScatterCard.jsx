import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function CorrelationScatterCard({ clusters }) {
  const points = (clusters?.clusters||[]).map(r=>({protein:r.protein, carbs:r.carbs}));
  if (!points.length) return <div className="legend">No data</div>;

  return (
    <ScatterChart width={330} height={230}>
      <CartesianGrid />
      <XAxis dataKey="protein" type="number" />
      <YAxis dataKey="carbs" type="number" />
      <Tooltip />
      <Scatter data={points} />
    </ScatterChart>
  );
}
