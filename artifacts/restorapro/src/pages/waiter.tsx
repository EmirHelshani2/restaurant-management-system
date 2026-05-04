import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useListTables, useGetOrder, useCreateOrder, useAddOrderItems, useUpdateOrder, useListMenuItems, useListMenuCategories, TableStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const statusColors: Record<TableStatus, "default" | "secondary" | "destructive" | "outline"> = {
  available: "outline",
  reserved: "secondary",
  occupied: "default",
  waiting_payment: "destructive",
  cleaning: "secondary",
};

export default function Waiter() {
  const { user } = useAuth();
  const { data: tables, isLoading: tablesLoading } = useListTables();
  const createOrderMutation = useCreateOrder();
  
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  const myTables = tables?.filter(t => t.waiterId === user?.id || t.status === "available" || t.status === "occupied");

  const openTable = (table: any) => {
    setSelectedTable(table.id);
  };

  if (tablesLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tables</h1>
        <p className="text-muted-foreground">Manage your assigned tables and orders</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {myTables?.map(table => (
          <Card key={table.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => openTable(table)}>
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">T{table.number}</CardTitle>
                <Badge variant={statusColors[table.status]}>{table.status.replace("_", " ")}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="text-sm text-muted-foreground">Capacity: {table.capacity}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTable && (
        <TableOrderModal 
          tableId={selectedTable} 
          onClose={() => setSelectedTable(null)} 
          table={tables?.find(t => t.id === selectedTable)}
        />
      )}
    </div>
  );
}

function TableOrderModal({ tableId, table, onClose }: { tableId: number, table: any, onClose: () => void }) {
  const { user } = useAuth();
  const { data: menuCategories } = useListMenuCategories();
  const { data: menuItems } = useListMenuItems({ query: { available: true } });
  const { data: order } = useGetOrder(table.activeOrderId || 0, { query: { enabled: !!table.activeOrderId } });
  
  const createOrderMutation = useCreateOrder();
  const addItemsMutation = useAddOrderItems();
  const updateOrderMutation = useUpdateOrder();

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<{menuItemId: number, quantity: number, name: string, price: number}[]>([]);

  const handleCreateOrder = () => {
    createOrderMutation.mutate({ data: { tableId, waiterId: user!.id } }, {
      onSuccess: () => {
        // close and let tables refresh
        onClose();
      }
    });
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const ex = prev.find(p => p.menuItemId === item.id);
      if (ex) return prev.map(p => p.menuItemId === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      return [...prev, { menuItemId: item.id, quantity: 1, name: item.name, price: item.price }];
    });
  };

  const sendOrder = () => {
    if (!order?.id || cart.length === 0) return;
    addItemsMutation.mutate({ 
      orderId: order.id, 
      data: { items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })) } 
    }, {
      onSuccess: () => setCart([])
    });
  };

  const requestBill = () => {
    if (!order?.id) return;
    updateOrderMutation.mutate({ id: order.id, data: { status: "bill_requested" } }, {
      onSuccess: () => onClose()
    });
  };

  const currentCategoryItems = menuItems?.filter(i => activeCategory ? i.categoryId === activeCategory : true) || [];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Table {table?.number} Order</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Menu Selection */}
          <div className="w-2/3 flex flex-col border-r">
            <div className="flex gap-2 p-4 overflow-x-auto border-b bg-muted/20">
              <Button 
                variant={activeCategory === null ? "default" : "secondary"} 
                onClick={() => setActiveCategory(null)}
                size="sm"
              >
                All
              </Button>
              {menuCategories?.map(cat => (
                <Button 
                  key={cat.id} 
                  variant={activeCategory === cat.id ? "default" : "secondary"} 
                  onClick={() => setActiveCategory(cat.id)}
                  size="sm"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-3 gap-4">
                {currentCategoryItems.map(item => (
                  <Card key={item.id} className="cursor-pointer hover:border-primary" onClick={() => addToCart(item)}>
                    <CardContent className="p-4 flex flex-col items-center text-center justify-center min-h-24">
                      <p className="font-medium text-sm line-clamp-2">{item.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">${item.price.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Order / Cart */}
          <div className="w-1/3 flex flex-col bg-muted/10">
            {!table.activeOrderId ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <Button onClick={handleCreateOrder} disabled={createOrderMutation.isPending}>
                  Open New Order
                </Button>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 p-4">
                  {/* Existing Items */}
                  {order?.items && order.items.length > 0 && (
                    <div className="mb-6 space-y-2">
                      <h4 className="text-sm font-bold text-muted-foreground uppercase">Sent Items</h4>
                      {order.items.map((it: any) => (
                        <div key={it.id} className="flex justify-between items-center text-sm border-b pb-2">
                          <div>
                            <span className="font-medium">{it.quantity}x</span> {it.menuItemName}
                          </div>
                          <Badge variant="outline">{it.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New Items */}
                  {cart.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-primary uppercase">New Items</h4>
                      {cart.map(c => (
                        <div key={c.menuItemId} className="flex justify-between items-center text-sm">
                          <div>
                            <span className="font-medium">{c.quantity}x</span> {c.name}
                          </div>
                          <span className="font-medium">${(c.price * c.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                
                <div className="p-4 border-t bg-background space-y-2">
                  <Button className="w-full" onClick={sendOrder} disabled={cart.length === 0 || addItemsMutation.isPending}>
                    Send to Kitchen/Bar
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={requestBill} disabled={!order || order.items.length === 0}>
                    Request Bill
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
