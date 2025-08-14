import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';

interface AllocationData {
  name: string;
  value: number;
  color: string;
}

interface PortfolioAllocationChartProps {
  data: AllocationData[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(142 86% 35%)',
  'hsl(45 93% 55%)',
  'hsl(262 83% 58%)',
  'hsl(346 87% 43%)',
  'hsl(24 96% 53%)',
  'hsl(197 71% 52%)',
];

const PortfolioAllocationChart = ({ data }: PortfolioAllocationChartProps) => {
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
  }));

  const renderCustomLabel = ({ name, percent }: any) => {
    if (percent < 5) return null; // Hide labels for small slices
    return `${name} ${(percent * 100).toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PieChartIcon className="h-5 w-5" />
          <span>Portfolio Allocation</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithColors}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {dataWithColors.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  `€${value.toFixed(2)}`, 
                  props.payload.name
                ]}
                labelFormatter={(label: string, payload: any) => {
                  if (payload && payload[0] && payload[0].payload) {
                    return payload[0].payload.name;
                  }
                  return label;
                }}
                labelStyle={{ color: '#ffffff' }}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: '#ffffff'
                }}
              />
              <Legend
                wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value) => (
                  <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioAllocationChart;