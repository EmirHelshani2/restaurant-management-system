import { useListStaff, useUpdateShift } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, UserCheck, UserMinus } from "lucide-react";
import { format } from "date-fns";

export default function Staff() {
  const queryClient = useQueryClient();
  const { data: staff, isLoading } = useListStaff();
  const updateShiftMutation = useUpdateShift();

  const handleShift = (id: number, action: "start" | "end") => {
    updateShiftMutation.mutate(
      { id, data: { action } },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
        },
      },
    );
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground">Manage employees and shifts</p>
        </div>
        <div className="flex items-center gap-4">
          <Button><Plus className="w-4 h-4 mr-2" /> Add Staff Member</Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Shift Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
            ) : staff?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No staff members found</TableCell></TableRow>
            ) : (
              staff?.map(member => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{member.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      <div>{member.email}</div>
                      {member.phone && <div>{member.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.onShift ? (
                      <div className="flex items-center gap-2 text-success text-sm font-medium">
                        <UserCheck className="w-4 h-4" /> On Shift
                        {member.shiftStart && <span className="text-muted-foreground font-normal text-xs ml-2">since {format(new Date(member.shiftStart), "HH:mm")}</span>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <UserMinus className="w-4 h-4" /> Off Shift
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShift(member.id, member.onShift ? "end" : "start")}
                      >
                        {member.onShift ? "End Shift" : "Start Shift"}
                      </Button>
                      <Button size="sm" variant="ghost">Edit</Button>
                    </div>
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
