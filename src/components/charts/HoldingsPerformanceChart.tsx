import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface PerformanceData {
  symbol: string;
  gainLossPercent: number;
  currentValue: number;
}

interface HoldingsPerformanceChartProps {
  data: PerformanceData[];
}

const HoldingsPerformanceChart = ({ data }: HoldingsPerformanceChartProps) => {
  // Sort by performance for better visualization
  const sortedData = [...data].sort((a, b) => b.gainLossPercent - a.gainLossPercent);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Holdings Performance</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="symbol" 
                stroke="hsl(var(--foreground))"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                fontSize={12}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
              />
              <Tooltip
                formatter={(value: number) => [
                  <span style={{ color: '#ffffff' }}>{`${value.toFixed(2)}%`}</span>, 
                  <span style={{ color: '#ffffff' }}>Performance</span>
                ]}
                labelFormatter={(label) => <span style={{ color: '#ffffff' }}>{label}</span>}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: '#ffffff'
                }}
              />
              <Bar 
                dataKey="gainLossPercent" 
                radius={[4, 4, 0, 0]}
              >
                {sortedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.gainLossPercent >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default HoldingsPerformanceChart;