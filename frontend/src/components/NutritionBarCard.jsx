import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

export default function NutritionBarCard({ insights }) {
  if (!insights?.barChart?.length) return <div className="legend">No data</div>;

  const data = [
    { name: "Protein", value: avg(insights.barChart, "protein") },
    { name: "Carbs",   value: avg(insights.barChart, "carbs") },
    { name: "Fat",     value: avg(insights.barChart, "fat") }
  ];

  return (
    <BarChart width={330} height={230} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip /><Legend />
      <Bar dataKey="value" />
    </BarChart>
  );
}

function avg(rows,key){
  if(!rows?.length) return 0;
  let s=0,n=0; rows.forEach(r=>{ if(typeof r[key]==="number"){s+=r[key]; n++;}});
  return n? Number((s/n).toFixed(1)) : 0;
}
