import { useQueryClient } from "@tanstack/react-query";
import { useListKitchenOrders, useUpdateOrderItemStatus, OrderItemStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChefHat, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Kitchen() {
  const queryClient = useQueryClient();
  const { data: tickets, isLoading } = useListKitchenOrders({
    query: { queryKey: ["/api/kitchen/orders"], refetchInterval: 5000 }
  });
  const updateStatusMutation = useUpdateOrderItemStatus();

  const handleStatusChange = (orderId: number, itemId: number, status: OrderItemStatus) => {
    updateStatusMutation.mutate(
      { id: itemId, data: { status } },
      {
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] }),
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] }),
            queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] }),
          ]);
        },
      },
    );
  };

  if (isLoading) return <div className="p-8">Loading kitchen tickets...</div>;

  return (
    <div className="p-8 space-y-8 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Kitchen Display</h1>
        <p className="text-muted-foreground">Auto-refreshing order queue</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
        {tickets?.map((ticket) => (
          <Card key={ticket.orderId} className="w-80 shrink-0 snap-start flex flex-col">
            <CardHeader className="p-4 bg-sidebar text-sidebar-foreground rounded-t-lg">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Table {ticket.tableNumber}</CardTitle>
                <div className="flex items-center text-sm gap-1">
                  <Clock className="w-4 h-4" />
                  {ticket.createdAt ? formatDistanceToNow(new Date(ticket.createdAt)) : "Just now"}
                </div>
              </div>
              <p className="text-sm opacity-80">{ticket.waiterName}</p>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="divide-y divide-border">
                {ticket.items.map((item) => (
                  <div key={item.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-lg">{item.quantity}x {item.menuItemName}</span>
                    </div>
                    {item.notes && <p className="text-sm text-destructive font-medium italic">{item.notes}</p>}
                    
                    <div className="flex gap-2 mt-2">
                      {item.status === "pending" && (
                        <Button size="sm" className="w-full" onClick={() => handleStatusChange(ticket.orderId, item.id, "preparing")}>Start</Button>
                      )}
                      {item.status === "preparing" && (
                        <Button size="sm" variant="secondary" className="w-full bg-success text-success-foreground hover:bg-success/90" onClick={() => handleStatusChange(ticket.orderId, item.id, "ready")}>Ready</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {(!tickets || tickets.length === 0) && (
          <div className="w-full py-12 text-center text-muted-foreground flex flex-col items-center">
            <ChefHat className="w-12 h-12 mb-4 opacity-20" />
            <p>No active kitchen orders</p>
          </div>
        )}
      </div>
    </div>
  );
}
