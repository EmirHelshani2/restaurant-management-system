import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  useListTables,
  useGetOrder,
  useCreateOrder,
  useAddOrderItems,
  useUpdateOrder,
  useUpdateOrderItemStatus,
  useListMenuItems,
  useListMenuCategories,
  TableStatus,
} from "@workspace/api-client-react";
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
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  const currentStaffId = user?.staffId ?? null;
  const myTables = tables?.filter(
    (table) =>
      table.waiterId === currentStaffId ||
      table.waiterId === null ||
      table.status === "available" ||
      table.status === "occupied" ||
      table.status === "waiting_payment",
  );

  if (tablesLoading) return <div className="p-6 sm:p-8">Loading...</div>;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tables</h1>
        <p className="text-muted-foreground">Open orders, send items, and track what is ready to serve.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {myTables?.map((table) => (
          <Card
            key={table.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setSelectedTable(table.id)}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <CardTitle className="text-xl">Table {table.number}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {table.name || `${table.capacity} seats`}
                  </p>
                </div>
                <Badge variant={statusColors[table.status]}>
                  {table.status.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
              <p className="text-sm text-muted-foreground">Capacity: {table.capacity}</p>
              <p className="text-sm text-muted-foreground">
                {table.waiterName ? `Assigned to ${table.waiterName}` : "Unassigned"}
              </p>
              <Button className="w-full mt-2" variant="outline">
                {table.activeOrderId ? "Manage Order" : "Open Table"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTable && (
        <TableOrderModal
          tableId={selectedTable}
          table={tables?.find((table) => table.id === selectedTable)}
          onClose={() => setSelectedTable(null)}
        />
      )}
    </div>
  );
}

function TableOrderModal({
  tableId,
  table,
  onClose,
}: {
  tableId: number;
  table: {
    id: number;
    number: number;
    name?: string;
    capacity: number;
    status: TableStatus;
    waiterId?: number | null;
    waiterName?: string | null;
    activeOrderId?: number | null;
  } | undefined;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: menuCategories } = useListMenuCategories();
  const { data: menuItems } = useListMenuItems(
    { available: true },
    { query: { queryKey: ["/api/menu/items", { available: true }] } },
  );
  const activeOrderId = table?.activeOrderId ?? 0;
  const { data: order } = useGetOrder(activeOrderId, {
    query: {
      queryKey: [`/api/orders/${activeOrderId}`],
      enabled: activeOrderId > 0,
      refetchInterval: 4000,
    },
  });

  const createOrderMutation = useCreateOrder();
  const addItemsMutation = useAddOrderItems();
  const updateOrderMutation = useUpdateOrder();
  const updateItemStatusMutation = useUpdateOrderItemStatus();

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<
    { menuItemId: number; quantity: number; name: string; price: number }[]
  >([]);

  const currentStaffId = user?.staffId ?? null;
  const readyItems = order?.items.filter((item) => item.status === "ready") ?? [];

  const invalidateOrderState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/bar/orders"] }),
      activeOrderId
        ? queryClient.invalidateQueries({ queryKey: [`/api/orders/${activeOrderId}`] })
        : Promise.resolve(),
    ]);
  };

  const handleCreateOrder = () => {
    if (!currentStaffId) return;

    createOrderMutation.mutate(
      { data: { tableId, waiterId: currentStaffId } },
      {
        onSuccess: async () => {
          await invalidateOrderState();
        },
      },
    );
  };

  const addToCart = (item: { id: number; name: string; price: number }) => {
    setCart((previous) => {
      const existing = previous.find((entry) => entry.menuItemId === item.id);
      if (existing) {
        return previous.map((entry) =>
          entry.menuItemId === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        );
      }

      return [
        ...previous,
        { menuItemId: item.id, quantity: 1, name: item.name, price: item.price },
      ];
    });
  };

  const sendOrder = () => {
    if (!order?.id || cart.length === 0) return;

    addItemsMutation.mutate(
      {
        id: order.id,
        data: {
          items: cart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
          })),
        },
      },
      {
        onSuccess: async () => {
          setCart([]);
          await invalidateOrderState();
        },
      },
    );
  };

  const markServed = (itemId: number) => {
    updateItemStatusMutation.mutate(
      { id: itemId, data: { status: "served" } },
      {
        onSuccess: async () => {
          await invalidateOrderState();
        },
      },
    );
  };

  const requestBill = () => {
    if (!order?.id) return;

    updateOrderMutation.mutate(
      { id: order.id, data: { status: "bill_requested" } },
      {
        onSuccess: async () => {
          await invalidateOrderState();
          onClose();
        },
      },
    );
  };

  const currentCategoryItems =
    menuItems?.filter((item) => (activeCategory ? item.categoryId === activeCategory : true)) ?? [];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Table {table?.number} Order</DialogTitle>
        </DialogHeader>

        {readyItems.length > 0 ? (
          <div className="border-b bg-success/10 px-6 py-3">
            <p className="text-sm font-medium text-success">
              {readyItems.length} item(s) are ready to serve at this table.
            </p>
          </div>
        ) : null}

        <div className="flex-1 grid lg:grid-cols-[2fr_1fr] overflow-hidden">
          <div className="flex flex-col border-r">
            <div className="flex gap-2 p-4 overflow-x-auto border-b bg-muted/20">
              <Button
                variant={activeCategory === null ? "default" : "secondary"}
                onClick={() => setActiveCategory(null)}
                size="sm"
              >
                All
              </Button>
              {menuCategories?.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "secondary"}
                  onClick={() => setActiveCategory(category.id)}
                  size="sm"
                >
                  {category.name}
                </Button>
              ))}
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {currentCategoryItems.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:border-primary"
                    onClick={() => addToCart(item)}
                  >
                    <CardContent className="p-4 flex flex-col justify-between min-h-28">
                      <div>
                        <p className="font-medium line-clamp-2">{item.name}</p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.description || "No description"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <Badge variant="outline">{item.department}</Badge>
                        <p className="font-semibold">${item.price.toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col bg-muted/10 min-h-0">
            {!table?.activeOrderId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Open a fresh order before sending items to the kitchen or bar.
                </p>
                <Button
                  onClick={handleCreateOrder}
                  disabled={createOrderMutation.isPending || !currentStaffId}
                >
                  Open New Order
                </Button>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 p-4">
                  {order?.items?.length ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase">
                          Sent Items
                        </h4>
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3 text-sm"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">
                                {item.quantity}x {item.menuItemName}
                              </p>
                              {item.notes ? (
                                <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant={item.status === "ready" ? "default" : "outline"}>
                                {item.status}
                              </Badge>
                              {item.status === "ready" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2"
                                  onClick={() => markServed(item.id)}
                                  disabled={updateItemStatusMutation.isPending}
                                >
                                  Serve
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {cart.length > 0 ? (
                        <div className="space-y-2">
                          <h4 className="text-sm font-bold text-primary uppercase">New Items</h4>
                          {cart.map((item) => (
                            <div
                              key={item.menuItemId}
                              className="flex items-center justify-between text-sm rounded-lg border border-dashed p-3"
                            >
                              <div>
                                <p className="font-medium">
                                  {item.quantity}x {item.name}
                                </p>
                              </div>
                              <span className="font-semibold">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-12">
                      No items sent yet. Tap menu items to build the order.
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 border-t bg-background space-y-2">
                  <Button
                    className="w-full"
                    onClick={sendOrder}
                    disabled={cart.length === 0 || addItemsMutation.isPending}
                  >
                    Send to Kitchen and Bar
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={requestBill}
                    disabled={!order || order.items.length === 0}
                  >
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
