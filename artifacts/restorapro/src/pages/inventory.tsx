import { useListInventory } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Plus, ArrowRightLeft } from "lucide-react";

export default function Inventory() {
  const { data: inventory, isLoading } = useListInventory();

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Track stock levels and ingredients</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline"><ArrowRightLeft className="w-4 h-4 mr-2" /> Record Movement</Button>
          <Button><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Stock Level</TableHead>
              <TableHead>Min. Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
            ) : inventory?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No inventory items found</TableCell></TableRow>
            ) : (
              inventory?.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <span className={`font-semibold ${item.isLowStock ? 'text-destructive' : ''}`}>
                      {item.currentStock} {item.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.minimumStock} {item.unit}</TableCell>
                  <TableCell>
                    {item.isLowStock ? (
                      <Badge variant="destructive" className="flex w-fit items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-success border-success">Good</Badge>
                    )}
                  </TableCell>
                  <TableCell>{item.costPrice ? `$${item.costPrice.toFixed(2)}` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost">Edit</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
