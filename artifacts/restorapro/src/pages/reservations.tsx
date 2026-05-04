import { useState } from "react";
import { useListReservations, useUpdateReservation, ReservationStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, Users, Phone, Mail } from "lucide-react";

export default function Reservations() {
  const [dateStr, setDateStr] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const { data: reservations, isLoading } = useListReservations({ query: { date: dateStr } });
  const updateReservationMutation = useUpdateReservation();

  const handleStatusChange = (id: number, status: ReservationStatus) => {
    updateReservationMutation.mutate({ id, data: { status } });
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reservations</h1>
          <p className="text-muted-foreground">Manage bookings and seating</p>
        </div>
        <div className="flex items-center gap-4">
          <Input 
            type="date" 
            value={dateStr} 
            onChange={(e) => setDateStr(e.target.value)} 
            className="w-auto"
          />
          <Button>New Reservation</Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
            ) : reservations?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No reservations for this date</TableCell></TableRow>
            ) : (
              reservations?.map(res => (
                <TableRow key={res.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {res.time}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">{res.customerName}</TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {res.customerPhone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {res.customerPhone}</div>}
                      {res.customerEmail && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {res.customerEmail}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {res.guestCount}
                    </div>
                  </TableCell>
                  <TableCell>{res.tableNumber ? `T${res.tableNumber}` : "Unassigned"}</TableCell>
                  <TableCell>
                    <Badge variant={
                      res.status === "confirmed" ? "default" :
                      res.status === "seated" ? "secondary" :
                      res.status === "cancelled" || res.status === "no_show" ? "destructive" :
                      "outline"
                    }>
                      {res.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {res.status === "confirmed" || res.status === "pending" ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(res.id, "seated")}>Seat</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleStatusChange(res.id, "cancelled")}>Cancel</Button>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Completed</span>
                    )}
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
