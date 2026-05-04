import { useListTables, useUpdateTable, TableStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusColors: Record<TableStatus, "default" | "secondary" | "destructive" | "outline"> = {
  available: "outline",
  reserved: "secondary",
  occupied: "default",
  waiting_payment: "destructive",
  cleaning: "secondary",
};

export default function Tables() {
  const queryClient = useQueryClient();
  const { data: tables, isLoading } = useListTables();
  const updateTableMutation = useUpdateTable();

  const handleStatusChange = (id: number, status: TableStatus) => {
    updateTableMutation.mutate(
      { id, data: { status } },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
        },
      },
    );
  };

  if (isLoading) return <div className="p-6 sm:p-8">Loading tables...</div>;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Tables</h1>
        <p className="text-muted-foreground">Manage restaurant floor and table status</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {tables?.map((table) => (
          <Card key={table.id} className="cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">T{table.number}</CardTitle>
                <Badge variant={statusColors[table.status]}>{table.status.replace("_", " ")}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="text-sm text-muted-foreground">Capacity: {table.capacity}</p>
              {table.waiterName && (
                <p className="text-sm text-muted-foreground mt-1">Waiter: {table.waiterName}</p>
              )}
              
              <div className="mt-4 flex flex-col gap-2">
                {table.status === "available" && (
                  <Button size="sm" onClick={() => handleStatusChange(table.id, "occupied")}>
                    Seat Guests
                  </Button>
                )}
                {table.status === "occupied" && (
                  <Button size="sm" variant="destructive" onClick={() => handleStatusChange(table.id, "waiting_payment")}>
                    Request Bill
                  </Button>
                )}
                {table.status === "waiting_payment" && (
                  <Button size="sm" variant="secondary" onClick={() => handleStatusChange(table.id, "cleaning")}>
                    Mark Cleaning
                  </Button>
                )}
                {table.status === "cleaning" && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(table.id, "available")}>
                    Mark Available
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
