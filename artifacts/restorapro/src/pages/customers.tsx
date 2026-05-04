import { useListCustomers } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useListCustomers({ query: { search: search || undefined } });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Client database and history</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search customers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Visits</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
            ) : customers?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No customers found</TableCell></TableRow>
            ) : (
              customers?.map(customer => (
                <TableRow key={customer.id}>
                  <TableCell className="font-semibold">{customer.name}</TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      <div>{customer.email || '-'}</div>
                      <div>{customer.phone || '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell>{customer.visitCount}</TableCell>
                  <TableCell className="font-medium">${customer.totalSpent.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.createdAt ? formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true }) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost">View Details</Button>
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
