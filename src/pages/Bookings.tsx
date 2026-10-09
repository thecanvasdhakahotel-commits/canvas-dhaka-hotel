import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { ROOM_TYPE_LABELS } from "@contracts/types";
import { bdt } from "@/lib/format";
import RegistrationCardDialog from "@/components/RegistrationCardDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel, todayFileTag } from "@/lib/excel";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  confirmed: "secondary",
  checked_in: "default",
  checked_out: "outline",
  cancelled: "destructive",
};

export default function Bookings() {
  const { data, isLoading } = trpc.bookings.list.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const invalidate = () => {
    utils.bookings.list.invalidate();
    utils.rooms.dashboard.invalidate();
  };
  const checkIn = trpc.bookings.checkIn.useMutation({
    onSuccess: () => {
      toast.success("Checked in");
      invalidate();
    },
  });
  const checkOut = trpc.bookings.checkOut.useMutation({
    onSuccess: () => {
      toast.success("Checked out");
      invalidate();
    },
  });
  const cancel = trpc.bookings.cancel.useMutation({
    onSuccess: () => {
      toast.success("Booking cancelled");
      invalidate();
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reservations, check-in & check-out
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!data?.length) return toast.error("No bookings to export");
              exportToExcel(
                data.map((b) => ({
                  "Booking #": b.id,
                  Guest: b.guestName,
                  Phone: b.guestPhone,
                  Email: b.guestEmail ?? "",
                  "Room #": b.room.number,
                  "Room Type": ROOM_TYPE_LABELS[b.room.type],
                  "Check-in": String(b.checkIn).slice(0, 10),
                  "Check-out": String(b.checkOut).slice(0, 10),
                  Nights: b.nights,
                  Adults: b.adults,
                  Children: b.children,
                  "Room Total (BDT)": b.roomTotal,
                  "VAT (BDT)": b.vatAmount,
                  "Grand Total (BDT)": b.grandTotal,
                  Status: b.status,
                })),
                "Bookings",
                `bookings-${todayFileTag()}`,
              );
              toast.success("Excel file downloaded");
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Booking
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead className="text-right">Nights</TableHead>
              <TableHead className="text-right">Total (incl. VAT)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">
                  No bookings yet. Create the first one.
                </TableCell>
              </TableRow>
            )}
            {data?.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.id}</TableCell>
                <TableCell>
                  <div className="font-medium">{b.guestName}</div>
                  <div className="text-xs text-muted-foreground">{b.guestPhone}</div>
                </TableCell>
                <TableCell>
                  {b.room.number}
                  <span className="text-xs text-muted-foreground ml-1">
                    {ROOM_TYPE_LABELS[b.room.type]}
                  </span>
                </TableCell>
                <TableCell>{String(b.checkIn).slice(0, 10)}</TableCell>
                <TableCell>{String(b.checkOut).slice(0, 10)}</TableCell>
                <TableCell className="text-right">{b.nights}</TableCell>
                <TableCell className="text-right font-medium">
                  {bdt(b.grandTotal)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[b.status]}>
                    {b.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {b.status === "confirmed" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => checkIn.mutate({ id: b.id })}>
                          Check in
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => cancel.mutate({ id: b.id })}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {b.status === "checked_in" && (
                      <Button size="sm" variant="outline" onClick={() => checkOut.mutate({ id: b.id })}>
                        Check out
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* New Booking opens the Guest Registration Card — booking is confirmed on save */}
      <RegistrationCardDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
