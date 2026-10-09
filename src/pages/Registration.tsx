import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/providers/auth";
import { bdt } from "@/lib/format";
import { exportToExcel, todayFileTag } from "@/lib/excel";
import RegistrationCardDialog, {
  cardToForm,
  type CardForm,
} from "@/components/RegistrationCardDialog";
import RegistrationCardView from "@/components/RegistrationCardView";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Printer, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Registration() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: cards, isLoading } = trpc.registrations.list.useQuery();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [prefill, setPrefill] = useState<Partial<CardForm>>({});
  const [viewCard, setViewCard] = useState<
    NonNullable<typeof cards>[number] | null
  >(null);

  const deleteMut = trpc.registrations.remove.useMutation({
    onSuccess: () => {
      toast.success("Card deleted");
      utils.registrations.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openNew = () => {
    setEditingId(null);
    setPrefill({});
    setOpen(true);
  };
  const openEdit = (c: NonNullable<typeof cards>[number]) => {
    setEditingId(c.id);
    setPrefill(cardToForm(c));
    setOpen(true);
  };

  const exportExcel = () => {
    if (!cards?.length) return toast.error("No registration cards to export");
    exportToExcel(
      cards.map((c) => ({
        "Reg Card #": c.regCardNo ?? "",
        "Room #": c.room?.number ?? "",
        "Guest Name": `${c.title ?? ""} ${c.guestName}`.trim(),
        Address: c.address ?? "",
        Nationality: c.nationality ?? "",
        "Date of Birth": c.dateOfBirth ?? "",
        "Purpose of Travel": c.purposeOfTravel ?? "",
        "Duration of Stay": c.durationOfStay ?? "",
        Profession: c.profession ?? "",
        "Local Agent / Company": c.localAgent ?? "",
        "Visa/Imm/Reg #": c.visaImmRegNo ?? "",
        "Place & Date of Issue": c.placeDateOfIssue ?? "",
        "Passport #": c.passportNo ?? "",
        "NID #": c.nidNo ?? "",
        "Date of Entry in BD": c.dateOfEntryBd ?? "",
        "Visa Issue Date": c.visaIssueDate ?? "",
        "Visa Expiry Date": c.visaExpiryDate ?? "",
        Mobile: c.mobile ?? "",
        Tel: c.tel ?? "",
        "Tariff (BDT)": c.tariff ?? "",
        "Mode of Payment": c.modeOfPayment ?? "",
        "Check-in": `${c.checkInDate ?? ""} ${c.checkInTime ?? ""}`.trim(),
        "Check-out": `${c.checkOutDate ?? ""} ${c.checkOutTime ?? ""}`.trim(),
      })),
      "Registration Cards",
      `registration-cards-${todayFileTag()}`,
    );
    toast.success("Excel file downloaded");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Registration Cards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Guest registration with Passport &amp; NID — matches the printed card
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> New Registration
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reg #</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Nationality</TableHead>
              <TableHead>Passport #</TableHead>
              <TableHead>NID #</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead className="text-right">Tariff</TableHead>
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
            {cards?.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground">
                  No registration cards yet.
                </TableCell>
              </TableRow>
            )}
            {cards?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.regCardNo ?? c.id}</TableCell>
                <TableCell>
                  <div className="font-medium">
                    {c.title} {c.guestName}
                  </div>
                  <div className="text-xs text-muted-foreground">{c.mobile}</div>
                </TableCell>
                <TableCell>{c.room?.number ?? "—"}</TableCell>
                <TableCell>{c.nationality ?? "—"}</TableCell>
                <TableCell>{c.passportNo || "—"}</TableCell>
                <TableCell>{c.nidNo || "—"}</TableCell>
                <TableCell>{c.checkInDate ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {c.tariff != null ? bdt(c.tariff) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewCard(c)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {user?.role === "admin" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("Delete this registration card?"))
                            deleteMut.mutate({ id: c.id });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RegistrationCardDialog
        open={open}
        onOpenChange={setOpen}
        editingId={editingId}
        prefill={prefill}
      />
      <RegistrationCardView card={viewCard} onClose={() => setViewCard(null)} />
    </div>
  );
}
