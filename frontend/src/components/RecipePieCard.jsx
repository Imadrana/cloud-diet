import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#7c8cf8","#9fe3b1","#ffd27a","#9bd5ff","#f5a3b7","#b4b2ff"];

export default function RecipePieCard({ recipes }) {
  const data = useMemo(() => {
    if(!recipes?.recipes?.length) return [];
    const counts = {};
    for(const r of recipes.recipes){
      const k = (r.diet_type||"unknown").toLowerCase();
      counts[k] = (counts[k]||0) + 1;
    }
    return Object.entries(counts).map(([name,value])=>({name,value}));
  }, [recipes]);

  if (!data.length) return <div className="legend">No data</div>;

  return (
    <PieChart width={330} height={230}>
      <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
        {data.map((_,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} />))}
      </Pie>
      <Tooltip /><Legend />
    </PieChart>
  );
}
