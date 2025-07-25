import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { Trade } from '@/types/portfolio';
import { useToast } from '@/hooks/use-toast';

interface AddTradeModalProps {
  onAddTrade: (trade: Omit<Trade, 'id'>) => void;
}

const AddTradeModal = ({ onAddTrade }: AddTradeModalProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    asset: '',
    action: 'Buy' as 'Buy' | 'Sell',
    quantity: '',
    price: '',
    total: '',
    trueTotal: '',
    buyer: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.symbol || !formData.asset || !formData.buyer || !formData.quantity || !formData.price) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseFloat(formData.quantity);
    const price = parseFloat(formData.price);
    const total = formData.total ? parseFloat(formData.total) : quantity * price;
    const trueTotal = formData.trueTotal ? parseFloat(formData.trueTotal) : total;

    const newTrade: Omit<Trade, 'id'> = {
      date: formData.date,
      symbol: formData.symbol.toUpperCase(),
      asset: formData.asset,
      action: formData.action,
      quantity,
      price,
      total,
      trueTotal,
      buyer: formData.buyer,
    };

    onAddTrade(newTrade);
    
    toast({
      title: "Trade Added",
      description: `Successfully added ${formData.action.toLowerCase()} order for ${formData.symbol}`,
    });

    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      symbol: '',
      asset: '',
      action: 'Buy',
      quantity: '',
      price: '',
      total: '',
      trueTotal: '',
      buyer: '',
    });
    
    setOpen(false);
  };

  const calculateTotal = () => {
    const quantity = parseFloat(formData.quantity || '0');
    const price = parseFloat(formData.price || '0');
    return quantity * price;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Trade</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Trade</DialogTitle>
        </DialogHeader>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="buyer">Buyer</Label>
                  <Select value={formData.buyer} onValueChange={(value) => setFormData(prev => ({ ...prev, buyer: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select buyer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Zile">Zile</SelectItem>
                      <SelectItem value="Liga">Liga</SelectItem>
                      <SelectItem value="Pauls">Pauls</SelectItem>
                      <SelectItem value="Vidvuds">Vidvuds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="symbol">Symbol *</Label>
                  <Input
                    id="symbol"
                    placeholder="e.g., AAPL"
                    value={formData.symbol}
                    onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="action">Action</Label>
                  <Select value={formData.action} onValueChange={(value: 'Buy' | 'Sell') => setFormData(prev => ({ ...prev, action: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Buy">Buy</SelectItem>
                      <SelectItem value="Sell">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="asset">Asset Name *</Label>
                <Input
                  id="asset"
                  placeholder="e.g., Apple Inc."
                  value={formData.asset}
                  onChange={(e) => setFormData(prev => ({ ...prev, asset: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price (€) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total">Total (€)</Label>
                  <Input
                    id="total"
                    type="number"
                    step="any"
                    placeholder={`${calculateTotal().toFixed(2)}`}
                    value={formData.total}
                    onChange={(e) => setFormData(prev => ({ ...prev, total: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-calculated: €{calculateTotal().toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label htmlFor="trueTotal">True Total (€)</Label>
                  <Input
                    id="trueTotal"
                    type="number"
                    step="any"
                    placeholder="Including fees"
                    value={formData.trueTotal}
                    onChange={(e) => setFormData(prev => ({ ...prev, trueTotal: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Trade</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default AddTradeModal;