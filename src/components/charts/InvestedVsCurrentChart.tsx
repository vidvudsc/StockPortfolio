import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface InvestedVsCurrentData {
  totalInvested: number;
  totalValue: number;
}

interface InvestedVsCurrentChartProps {
  data: InvestedVsCurrentData;
}

const InvestedVsCurrentChart = ({ data }: InvestedVsCurrentChartProps) => {
  const chartData = [
    {
      name: 'Portfolio',
      invested: data.totalInvested,
      current: data.totalValue,
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Invested vs Current Value</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                fontSize={12}
                tickFormatter={(value) => `€${value.toFixed(0)}`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `€${value.toFixed(2)}`,
                  name === 'invested' ? 'Total Invested' : 'Current Value'
                ]}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend
                wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value) => (
                  <span style={{ color: 'hsl(var(--foreground))' }}>
                    {value === 'invested' ? 'Total Invested' : 'Current Value'}
                  </span>
                )}
              />
              <Bar 
                dataKey="invested" 
                fill="hsl(var(--muted-foreground))" 
                name="invested"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="current" 
                fill="hsl(var(--primary))" 
                name="current"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestedVsCurrentChart;