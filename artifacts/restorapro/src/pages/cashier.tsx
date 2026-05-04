import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOrders,
  useGetOrderBill,
  useCreatePayment,
  PaymentMethod,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";

export default function Cashier() {
  const { data: orders, isLoading } = useListOrders(
    { status: "bill_requested" },
    { query: { queryKey: ["/api/orders", { status: "bill_requested" }], refetchInterval: 4000 } },
  );
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  if (isLoading) return <div className="p-6 sm:p-8">Loading bills...</div>;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cashier</h1>
        <p className="text-muted-foreground">Process bill requests and issue receipts.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {orders?.map((order) => (
          <Card key={order.id} className="border-destructive/30 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between gap-3">
                <CardTitle>Table {order.tableNumber}</CardTitle>
                <Badge variant="destructive">Bill Requested</Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2 space-y-2">
              <div className="text-2xl font-bold">${order.total.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Waiter: {order.waiterName}</p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => setSelectedOrderId(order.id)}>
                View and Pay
              </Button>
            </CardFooter>
          </Card>
        ))}
        {orders?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No bills requested right now.
          </div>
        ) : null}
      </div>

      {selectedOrderId ? (
        <PaymentModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      ) : null}
    </div>
  );
}

function PaymentModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: bill, isLoading } = useGetOrderBill(orderId, {
    query: {
      queryKey: [`/api/orders/${orderId}/bill`],
      enabled: !!orderId,
    },
  });
  const createPaymentMutation = useCreatePayment();
  const [method, setMethod] = useState<PaymentMethod>("cash");

  const processPayment = () => {
    if (!bill || !user?.staffId) return;

    createPaymentMutation.mutate(
      {
        data: {
          orderId,
          method,
          cashAmount: method === "cash" ? bill.total : undefined,
          cardAmount: method === "card" ? bill.total : undefined,
          processedBy: user.staffId,
        },
      },
      {
        onSuccess: async (payment) => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] }),
            queryClient.invalidateQueries({ queryKey: ["/api/tables"] }),
            queryClient.invalidateQueries({ queryKey: ["/api/payments"] }),
          ]);
          onClose();
          setLocation(`/receipt/${payment.id}`);
        },
      },
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment - Table {bill?.tableNumber}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div>Loading...</div>
        ) : bill ? (
          <div className="space-y-6">
            <div className="border rounded-md p-4 space-y-2 text-sm bg-muted/10">
              {bill.items?.map((item) => (
                <div key={item.id} className="flex justify-between gap-3">
                  <span>{item.quantity}x {item.menuItemName}</span>
                  <span>${(item.quantity * item.unitPrice).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-4 space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${bill.subtotal.toFixed(2)}</span>
                </div>
                {bill.tax ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax</span>
                    <span>${bill.tax.toFixed(2)}</span>
                  </div>
                ) : null}
                {bill.serviceCharge ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Service</span>
                    <span>${bill.serviceCharge.toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                  <span>Total</span>
                  <span>${bill.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Payment Method</h4>
              <div className="flex gap-2">
                <Button
                  variant={method === "cash" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setMethod("cash")}
                >
                  Cash
                </Button>
                <Button
                  variant={method === "card" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setMethod("card")}
                >
                  Card
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={processPayment}
              disabled={createPaymentMutation.isPending || !user?.staffId}
            >
              Confirm Payment
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
