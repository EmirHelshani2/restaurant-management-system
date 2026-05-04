import { useListOrders, useGetOrderBill, useCreatePayment, PaymentMethod } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function Cashier() {
  const { data: orders, isLoading } = useListOrders({ query: { status: "bill_requested" } });
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  if (isLoading) return <div className="p-8">Loading bills...</div>;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cashier</h1>
        <p className="text-muted-foreground">Process payments for requested bills</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {orders?.map(order => (
          <Card key={order.id} className="border-destructive shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <CardTitle>Table {order.tableNumber}</CardTitle>
                <Badge variant="destructive">Bill Requested</Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-2xl font-bold">${order.total.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Waiter: {order.waiterName}</p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => setSelectedOrderId(order.id)}>
                View & Pay
              </Button>
            </CardFooter>
          </Card>
        ))}
        {orders?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No bills requested right now.
          </div>
        )}
      </div>

      {selectedOrderId && (
        <PaymentModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      )}
    </div>
  );
}

function PaymentModal({ orderId, onClose }: { orderId: number, onClose: () => void }) {
  const { user } = useAuth();
  const { data: bill, isLoading } = useGetOrderBill(orderId, { query: { enabled: !!orderId } });
  const createPaymentMutation = useCreatePayment();
  const [method, setMethod] = useState<PaymentMethod>("cash");

  const processPayment = () => {
    if (!bill) return;
    createPaymentMutation.mutate({
      data: {
        orderId,
        method,
        cashAmount: method === "cash" ? bill.total : undefined,
        cardAmount: method === "card" ? bill.total : undefined,
        processedBy: user!.id
      }
    }, {
      onSuccess: () => onClose()
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Payment - Table {bill?.tableNumber}</DialogTitle>
        </DialogHeader>

        {isLoading ? <div>Loading...</div> : bill && (
          <div className="space-y-6">
            <div className="border rounded-md p-4 space-y-2 text-sm bg-muted/10">
              {bill.items?.map(it => (
                <div key={it.id} className="flex justify-between">
                  <span>{it.quantity}x {it.menuItemName}</span>
                  <span>${(it.quantity * it.unitPrice).toFixed(2)}</span>
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
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                  <span>Total</span>
                  <span>${bill.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Payment Method</h4>
              <div className="flex gap-2">
                <Button variant={method === "cash" ? "default" : "outline"} className="flex-1" onClick={() => setMethod("cash")}>Cash</Button>
                <Button variant={method === "card" ? "default" : "outline"} className="flex-1" onClick={() => setMethod("card")}>Card</Button>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={processPayment} disabled={createPaymentMutation.isPending}>
              Confirm Payment
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
