import { useParams } from "wouter";
import { useGetPayment } from "@workspace/api-client-react";
import { format } from "date-fns";

export default function Receipt() {
  const { id } = useParams<{ id: string }>();
  const paymentId = Number(id);
  const { data: payment, isLoading } = useGetPayment(paymentId, {
    query: {
      queryKey: [`/api/payments/${paymentId}`],
      enabled: !!id,
    },
  });

  if (isLoading) return <div className="p-8 text-center">Loading receipt...</div>;
  if (!payment) return <div className="p-8 text-center text-destructive">Receipt not found</div>;

  return (
    <div className="max-w-md mx-auto bg-white text-black p-8 my-8 shadow-lg print:shadow-none print:m-0">
      <div className="text-center space-y-2 border-b-2 border-dashed border-gray-300 pb-6 mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-widest">RestoraPro</h1>
        <p className="text-sm text-gray-500">123 Culinary Ave, Food City</p>
        <p className="text-sm text-gray-500">Tel: (555) 123-4567</p>
      </div>

      <div className="flex justify-between text-sm mb-6 font-mono">
        <div>
          <p>Order #{payment.orderId}</p>
          <p>Table {payment.tableNumber || "N/A"}</p>
        </div>
        <div className="text-right">
          <p>{format(new Date(payment.createdAt), "dd/MM/yyyy HH:mm")}</p>
          <p>Cashier: {payment.processedByName}</p>
        </div>
      </div>

      <div className="space-y-4 mb-6 font-mono text-sm border-b-2 border-dashed border-gray-300 pb-6">
        {payment.order?.items.map(item => (
          <div key={item.id} className="flex justify-between">
            <span className="flex-1 pr-4">{item.quantity}x {item.menuItemName}</span>
            <span>${(item.quantity * item.unitPrice).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2 mb-8 font-mono text-sm border-b-2 border-dashed border-gray-300 pb-6">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${payment.order?.subtotal.toFixed(2)}</span>
        </div>
        {payment.order?.tax ? (
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${payment.order.tax.toFixed(2)}</span>
          </div>
        ) : null}
        {payment.order?.serviceCharge ? (
          <div className="flex justify-between">
            <span>Service</span>
            <span>${payment.order.serviceCharge.toFixed(2)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-lg font-bold mt-2">
          <span>Total</span>
          <span>${payment.order?.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-1 mb-8 font-mono text-sm">
        <div className="flex justify-between">
          <span>Paid via {payment.method}</span>
          <span>${payment.amount.toFixed(2)}</span>
        </div>
        {payment.changeGiven ? (
          <div className="flex justify-between">
            <span>Change</span>
            <span>${payment.changeGiven.toFixed(2)}</span>
          </div>
        ) : null}
      </div>

      <div className="text-center font-mono text-sm text-gray-500">
        <p>Thank you for dining with us!</p>
        <p>Please come again.</p>
      </div>

      <div className="mt-8 text-center print:hidden">
        <button onClick={() => window.print()} className="bg-black text-white px-4 py-2 rounded">
          Print Receipt
        </button>
      </div>
    </div>
  );
}
