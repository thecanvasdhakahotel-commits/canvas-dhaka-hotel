import { useEffect, useState } from "react";
import { trpc } from "@/providers/trpc";
import { bdt, todayStr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export type CardForm = {
  regCardNo: string;
  bookingId: number | null;
  roomId: string;
  title: string;
  guestName: string;
  address: string;
  nationality: string;
  dateOfBirth: string;
  purposeOfTravel: string;
  durationOfStay: string;
  profession: string;
  localAgent: string;
  visaImmRegNo: string;
  placeDateOfIssue: string;
  passportNo: string;
  nidNo: string;
  dateOfEntryBd: string;
  visaIssueDate: string;
  visaExpiryDate: string;
  mobile: string;
  tel: string;
  tariff: string;
  modeOfPayment: "individual" | "company" | "others";
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
};

export const EMPTY_CARD: CardForm = {
  regCardNo: "",
  bookingId: null,
  roomId: "",
  title: "Mr",
  guestName: "",
  address: "",
  nationality: "Bangladeshi",
  dateOfBirth: "",
  purposeOfTravel: "",
  durationOfStay: "",
  profession: "",
  localAgent: "",
  visaImmRegNo: "",
  placeDateOfIssue: "",
  passportNo: "",
  nidNo: "",
  dateOfEntryBd: "",
  visaIssueDate: "",
  visaExpiryDate: "",
  mobile: "",
  tel: "",
  tariff: "",
  modeOfPayment: "individual",
  checkInDate: todayStr(),
  checkInTime: "12:00",
  checkOutDate: "",
  checkOutTime: "12:00",
};

export function cardToForm(c: Record<string, unknown>): CardForm {
  const s = (v: unknown) => (v == null ? "" : String(v));
  return {
    regCardNo: s(c.regCardNo),
    bookingId: (c.bookingId as number) ?? null,
    roomId: c.roomId ? String(c.roomId) : "",
    title: s(c.title) || "Mr",
    guestName: s(c.guestName),
    address: s(c.address),
    nationality: s(c.nationality),
    dateOfBirth: s(c.dateOfBirth),
    purposeOfTravel: s(c.purposeOfTravel),
    durationOfStay: s(c.durationOfStay),
    profession: s(c.profession),
    localAgent: s(c.localAgent),
    visaImmRegNo: s(c.visaImmRegNo),
    placeDateOfIssue: s(c.placeDateOfIssue),
    passportNo: s(c.passportNo),
    nidNo: s(c.nidNo),
    dateOfEntryBd: s(c.dateOfEntryBd),
    visaIssueDate: s(c.visaIssueDate),
    visaExpiryDate: s(c.visaExpiryDate),
    mobile: s(c.mobile),
    tel: s(c.tel),
    tariff: c.tariff != null ? String(c.tariff) : "",
    modeOfPayment:
      (c.modeOfPayment as CardForm["modeOfPayment"]) ?? "individual",
    checkInDate: s(c.checkInDate),
    checkInTime: s(c.checkInTime),
    checkOutDate: s(c.checkOutDate),
    checkOutTime: s(c.checkOutTime),
  };
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/**
 * Registration Card entry popup — used on the Registration page, and shown
 * automatically after a booking is created or a guest checks in.
 */
export default function RegistrationCardDialog({
  open,
  onOpenChange,
  editingId,
  prefill,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingId?: number | null;
  prefill?: Partial<CardForm>;
  onSaved?: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: rooms } = trpc.rooms.list.useQuery();
  const { data: cards } = trpc.registrations.list.useQuery();
  const [form, setForm] = useState<CardForm>({ ...EMPTY_CARD, ...prefill });

  // True when this dialog is used as the New Booking entry — saving will
  // confirm a booking for the selected room/dates and link the card to it.
  const isBookingEntry = !editingId && !form.bookingId;
  const nights = (() => {
    if (!form.checkInDate || !form.checkOutDate) return 0;
    const n = Math.round(
      (new Date(form.checkOutDate).getTime() -
        new Date(form.checkInDate).getTime()) /
        86400000,
    );
    return n > 0 ? n : 0;
  })();
  const selectedRoom = rooms?.find((r) => String(r.id) === form.roomId);

  // Reset the form each time the popup opens
  useEffect(() => {
    if (open) {
      const nextNo = String((cards?.length ?? 0) + 700);
      setForm({ ...EMPTY_CARD, regCardNo: nextNo, ...prefill });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set =
    (k: keyof CardForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const createMut = trpc.registrations.create.useMutation({
    onSuccess: () => {
      toast.success("Registration card saved");
      utils.registrations.list.invalidate();
      onOpenChange(false);
      onSaved?.();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.registrations.update.useMutation({
    onSuccess: () => {
      toast.success("Registration card updated");
      utils.registrations.list.invalidate();
      onOpenChange(false);
      onSaved?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const createBookingMut = trpc.bookings.create.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const submit = async () => {
    if (!form.guestName.trim()) return toast.error("Guest name is required");

    let bookingId = form.bookingId;

    // New Booking entry: confirm the booking first, then save the card linked to it
    if (!editingId && !bookingId && form.roomId && form.checkInDate && form.checkOutDate) {
      if (nights < 1)
        return toast.error("Check-out date must be after check-in date");
      try {
        const r = await createBookingMut.mutateAsync({
          roomId: Number(form.roomId),
          guestName: form.guestName.trim(),
          guestPhone: form.mobile.trim() || form.tel.trim() || "N/A",
          checkIn: form.checkInDate,
          checkOut: form.checkOutDate,
        });
        bookingId = r.id;
        toast.success(
          `Booking #${r.id} confirmed — ${r.nights} night(s), total ${bdt(r.grandTotal)} (incl. VAT)`,
        );
        utils.bookings.list.invalidate();
        utils.rooms.dashboard.invalidate();
        utils.bookings.availability.invalidate();
      } catch {
        return; // error toast already shown by the mutation
      }
    }

    const payload = {
      regCardNo: form.regCardNo,
      bookingId,
      roomId: form.roomId ? Number(form.roomId) : null,
      title: form.title,
      guestName: form.guestName,
      address: form.address,
      nationality: form.nationality,
      dateOfBirth: form.dateOfBirth,
      purposeOfTravel: form.purposeOfTravel,
      durationOfStay:
        form.durationOfStay ||
        (nights > 0 ? `${nights} night${nights > 1 ? "s" : ""}` : ""),
      profession: form.profession,
      localAgent: form.localAgent,
      visaImmRegNo: form.visaImmRegNo,
      placeDateOfIssue: form.placeDateOfIssue,
      passportNo: form.passportNo,
      nidNo: form.nidNo,
      dateOfEntryBd: form.dateOfEntryBd,
      visaIssueDate: form.visaIssueDate,
      visaExpiryDate: form.visaExpiryDate,
      mobile: form.mobile,
      tel: form.tel,
      tariff: form.tariff ? Number(form.tariff) : null,
      modeOfPayment: form.modeOfPayment,
      checkInDate: form.checkInDate,
      checkInTime: form.checkInTime,
      checkOutDate: form.checkOutDate,
      checkOutTime: form.checkOutTime,
    };
    if (editingId) updateMut.mutate({ id: editingId, ...payload });
    else createMut.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editingId
              ? "Edit Registration Card"
              : isBookingEntry
                ? "New Booking — Guest Registration Card"
                : "Guest Registration Card"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Reg. Card #">
            <Input value={form.regCardNo} onChange={set("regCardNo")} />
          </Field>
          <Field label="Room #">
            <Select
              value={form.roomId}
              onValueChange={(v) => {
                const room = rooms?.find((r) => String(r.id) === v);
                setForm((f) => ({
                  ...f,
                  roomId: v,
                  tariff: f.tariff || (room ? String(room.ratePerNight) : ""),
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {rooms?.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.number} — {bdt(r.ratePerNight)}/night
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Check-in Date">
            <Input type="date" value={form.checkInDate} onChange={set("checkInDate")} />
          </Field>
          <Field label="Time">
            <Input type="time" value={form.checkInTime} onChange={set("checkInTime")} />
          </Field>
          <Field label="Check Out Date">
            <Input type="date" value={form.checkOutDate} onChange={set("checkOutDate")} />
          </Field>
          <Field label="Time">
            <Input type="time" value={form.checkOutTime} onChange={set("checkOutTime")} />
          </Field>
          <Field label="Title">
            <Select
              value={form.title}
              onValueChange={(v) => setForm((f) => ({ ...f, title: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mr">Mr</SelectItem>
                <SelectItem value="Mrs">Mrs</SelectItem>
                <SelectItem value="Miss">Miss</SelectItem>
                <SelectItem value="Dr">Dr</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Guest Name *">
            <Input value={form.guestName} onChange={set("guestName")} />
          </Field>
          <Field label="Address" className="col-span-full">
            <Textarea rows={2} value={form.address} onChange={set("address")} />
          </Field>
          <Field label="Nationality" className="sm:col-span-2">
            <Input value={form.nationality} onChange={set("nationality")} />
          </Field>
          <Field label="Date of Birth" className="sm:col-span-2">
            <Input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
          </Field>
          <Field label="Purpose of Travel" className="sm:col-span-2">
            <Input value={form.purposeOfTravel} onChange={set("purposeOfTravel")} />
          </Field>
          <Field label="Duration of Stay" className="sm:col-span-2">
            <Input
              placeholder="e.g. 3 nights"
              value={form.durationOfStay}
              onChange={set("durationOfStay")}
            />
          </Field>
          <Field label="Profession" className="sm:col-span-2">
            <Input value={form.profession} onChange={set("profession")} />
          </Field>
          <Field label="Local Agent / Company" className="sm:col-span-2">
            <Input value={form.localAgent} onChange={set("localAgent")} />
          </Field>
          <Field label="Visa / Imm / Reg. #" className="sm:col-span-2">
            <Input value={form.visaImmRegNo} onChange={set("visaImmRegNo")} />
          </Field>
          <Field label="Place and Date of Issue" className="sm:col-span-2">
            <Input value={form.placeDateOfIssue} onChange={set("placeDateOfIssue")} />
          </Field>

          {/* Passport & NID — highlighted section */}
          <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border-2 border-accent/60 bg-accent/5 p-3">
            <Field label="Passport #">
              <Input value={form.passportNo} onChange={set("passportNo")} />
            </Field>
            <Field label="NID #">
              <Input value={form.nidNo} onChange={set("nidNo")} />
            </Field>
          </div>

          <Field label="Date of Entry in Bangladesh" className="sm:col-span-2">
            <Input type="date" value={form.dateOfEntryBd} onChange={set("dateOfEntryBd")} />
          </Field>
          <Field label="Visa Issue Date">
            <Input type="date" value={form.visaIssueDate} onChange={set("visaIssueDate")} />
          </Field>
          <Field label="Visa Expiry Date">
            <Input type="date" value={form.visaExpiryDate} onChange={set("visaExpiryDate")} />
          </Field>
          <Field label="Mobile #">
            <Input value={form.mobile} onChange={set("mobile")} />
          </Field>
          <Field label="Tel #">
            <Input value={form.tel} onChange={set("tel")} />
          </Field>
          <Field label="Tariff (BDT)">
            <Input type="number" value={form.tariff} onChange={set("tariff")} />
          </Field>
          <Field label="Mode of Payment">
            <Select
              value={form.modeOfPayment}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  modeOfPayment: v as CardForm["modeOfPayment"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="others">Others</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        {isBookingEntry && selectedRoom && nights > 0 && (
          <div className="rounded-md bg-secondary px-4 py-3 text-sm space-y-1 mt-4">
            <div className="flex justify-between">
              <span>
                {nights} night{nights > 1 ? "s" : ""} × {bdt(selectedRoom.ratePerNight)}
              </span>
              <span>{bdt(nights * selectedRoom.ratePerNight)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>VAT (15%)</span>
              <span>{bdt(Math.round(nights * selectedRoom.ratePerNight * 0.15))}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-border pt-1">
              <span>Total</span>
              <span>
                {bdt(nights * selectedRoom.ratePerNight + Math.round(nights * selectedRoom.ratePerNight * 0.15))}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {editingId ? "Cancel" : isBookingEntry ? "Cancel" : "Skip for Now"}
          </Button>
          <Button
            onClick={submit}
            disabled={
              createMut.isPending || updateMut.isPending || createBookingMut.isPending
            }
          >
            {createMut.isPending || updateMut.isPending || createBookingMut.isPending
              ? "Saving…"
              : editingId
                ? "Save Changes"
                : isBookingEntry
                  ? "Confirm Booking"
                  : "Save Registration"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
