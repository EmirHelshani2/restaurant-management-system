import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Reservation,
  ReservationStatus,
  useCreateReservation,
  useListReservations,
  useListTables,
  useUpdateReservation,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Clock, Users, Phone, Mail, Plus } from "lucide-react";

type ReservationFormState = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  guestCount: number;
  date: string;
  time: string;
  notes: string;
  tableId: string;
};

const emptyForm = (date: string): ReservationFormState => ({
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  guestCount: 2,
  date,
  time: "19:00",
  notes: "",
  tableId: "",
});

export default function Reservations() {
  const queryClient = useQueryClient();
  const [dateStr, setDateStr] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [createOpen, setCreateOpen] = useState(false);
  const [seatTarget, setSeatTarget] = useState<Reservation | null>(null);
  const [assignTarget, setAssignTarget] = useState<Reservation | null>(null);
  const [form, setForm] = useState<ReservationFormState>(() => emptyForm(dateStr));
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  const { data: reservations, isLoading } = useListReservations(
    { date: dateStr },
    { query: { queryKey: ["/api/reservations", { date: dateStr }] } },
  );
  const { data: tables } = useListTables();
  const createReservationMutation = useCreateReservation();
  const updateReservationMutation = useUpdateReservation();

  const availableTables = useMemo(
    () =>
      (tables ?? []).filter(
        (table) =>
          table.status === "available" ||
          table.id === seatTarget?.tableId ||
          table.id === assignTarget?.tableId,
      ),
    [assignTarget?.tableId, seatTarget?.tableId, tables],
  );

  const invalidateReservationState = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] }),
    ]);
  };

  const handleCreateReservation = () => {
    createReservationMutation.mutate(
      {
        data: {
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail || undefined,
          guestCount: Number(form.guestCount),
          date: form.date,
          time: form.time,
          notes: form.notes || undefined,
          tableId: form.tableId ? Number(form.tableId) : undefined,
        },
      },
      {
        onSuccess: async () => {
          await invalidateReservationState();
          setCreateOpen(false);
          setForm(emptyForm(dateStr));
        },
      },
    );
  };

  const handleAssignTable = (reservation: Reservation, tableId: number) => {
    updateReservationMutation.mutate(
      {
        id: reservation.id,
        data: {
          tableId,
          status: reservation.status === "pending" ? "confirmed" : reservation.status,
        },
      },
      {
        onSuccess: async () => {
          await invalidateReservationState();
          setAssignTarget(null);
          setSelectedTableId("");
        },
      },
    );
  };

  const handleSeatReservation = (reservation: Reservation, tableId: number) => {
    updateReservationMutation.mutate(
      {
        id: reservation.id,
        data: {
          tableId,
          status: "seated",
        },
      },
      {
        onSuccess: async () => {
          await invalidateReservationState();
          setSeatTarget(null);
          setSelectedTableId("");
        },
      },
    );
  };

  const handleStatusChange = (id: number, status: ReservationStatus) => {
    updateReservationMutation.mutate(
      { id, data: { status } },
      { onSuccess: invalidateReservationState },
    );
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reservations</h1>
          <p className="text-muted-foreground">Create bookings, assign tables, and seat guests.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Input
            type="date"
            value={dateStr}
            onChange={(event) => {
              const nextDate = event.target.value;
              setDateStr(nextDate);
              setForm((current) => ({ ...current, date: nextDate }));
            }}
            className="w-full sm:w-auto"
          />
          <Button
            onClick={() => {
              setForm(emptyForm(dateStr));
              setCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Reservation
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
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
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : reservations?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No reservations for this date
                  </TableCell>
                </TableRow>
              ) : (
                reservations?.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {reservation.time}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{reservation.customerName}</TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {reservation.customerPhone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {reservation.customerPhone}
                          </div>
                        ) : null}
                        {reservation.customerEmail ? (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {reservation.customerEmail}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {reservation.guestCount}
                      </div>
                    </TableCell>
                    <TableCell>{reservation.tableNumber ? `T${reservation.tableNumber}` : "Unassigned"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          reservation.status === "confirmed"
                            ? "default"
                            : reservation.status === "seated"
                              ? "secondary"
                              : reservation.status === "cancelled" || reservation.status === "no_show"
                                ? "destructive"
                                : "outline"
                        }
                      >
                        {reservation.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end flex-wrap gap-2">
                        {(reservation.status === "pending" || reservation.status === "confirmed") ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAssignTarget(reservation);
                                setSelectedTableId(
                                  reservation.tableId ? String(reservation.tableId) : "",
                                );
                              }}
                            >
                              {reservation.tableId ? "Reassign" : "Assign Table"}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSeatTarget(reservation);
                                setSelectedTableId(
                                  reservation.tableId ? String(reservation.tableId) : "",
                                );
                              }}
                            >
                              Seat
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleStatusChange(reservation.id, "cancelled")}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Completed</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Reservation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <Input
              placeholder="Customer name"
              value={form.customerName}
              onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                placeholder="Phone number"
                value={form.customerPhone}
                onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))}
              />
              <Input
                placeholder="Email address"
                value={form.customerEmail}
                onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))}
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <Input
                type="number"
                min={1}
                value={form.guestCount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, guestCount: Number(event.target.value) }))
                }
              />
              <Input
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
              <Input
                type="time"
                value={form.time}
                onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
              />
            </div>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={form.tableId}
              onChange={(event) => setForm((current) => ({ ...current, tableId: event.target.value }))}
            >
              <option value="">Assign later</option>
              {availableTables.map((table) => (
                <option key={table.id} value={table.id}>
                  Table {table.number} - {table.capacity} seats
                </option>
              ))}
            </select>
            <Textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
            <Button
              onClick={handleCreateReservation}
              disabled={
                createReservationMutation.isPending ||
                !form.customerName ||
                !form.customerPhone ||
                !form.date ||
                !form.time
              }
            >
              Save Reservation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReservationTableDialog
        open={!!assignTarget}
        title="Assign Table"
        reservation={assignTarget}
        selectedTableId={selectedTableId}
        setSelectedTableId={setSelectedTableId}
        tables={availableTables}
        confirmLabel="Reserve Table"
        onConfirm={(tableId) => assignTarget && handleAssignTable(assignTarget, tableId)}
        onClose={() => {
          setAssignTarget(null);
          setSelectedTableId("");
        }}
      />

      <ReservationTableDialog
        open={!!seatTarget}
        title="Seat Reservation"
        reservation={seatTarget}
        selectedTableId={selectedTableId}
        setSelectedTableId={setSelectedTableId}
        tables={availableTables}
        confirmLabel="Seat Guests"
        onConfirm={(tableId) => seatTarget && handleSeatReservation(seatTarget, tableId)}
        onClose={() => {
          setSeatTarget(null);
          setSelectedTableId("");
        }}
      />
    </div>
  );
}

function ReservationTableDialog({
  open,
  title,
  reservation,
  selectedTableId,
  setSelectedTableId,
  tables,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  reservation: Reservation | null;
  selectedTableId: string;
  setSelectedTableId: (value: string) => void;
  tables: Array<{ id: number; number: number; capacity: number }>;
  confirmLabel: string;
  onConfirm: (tableId: number) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {reservation?.customerName} for {reservation?.guestCount} guests at {reservation?.time}
          </p>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={selectedTableId}
            onChange={(event) => setSelectedTableId(event.target.value)}
          >
            <option value="">Choose a table</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                Table {table.number} - {table.capacity} seats
              </option>
            ))}
          </select>
          <Button
            className="w-full"
            disabled={!selectedTableId}
            onClick={() => onConfirm(Number(selectedTableId))}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
