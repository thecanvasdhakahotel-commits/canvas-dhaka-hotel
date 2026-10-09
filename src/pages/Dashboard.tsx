import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { ROOM_TYPE_LABELS } from "@contracts/types";
import { bdt, todayStr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { LogIn, LogOut, Plus, Sparkles, Wrench, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import RegistrationCardDialog, { type CardForm } from "@/components/RegistrationCardDialog";
import RegistrationCardView from "@/components/RegistrationCardView";

type RoomCard = {
  id: number;
  number: string;
  floor: number;
  type: keyof typeof ROOM_TYPE_LABELS;
  ratePerNight: number;
  housekeeping: string;
  state: "available" | "reserved" | "occupied" | "cleaning" | "maintenance";
  booking: {
    id: number;
    guestName: string;
    status: string;
    checkIn: string | Date;
    checkOut: string | Date;
  } | null;
};

const STATE_STYLE: Record<RoomCard["state"], string> = {
  available: "bg-card border-emerald-700/40 hover:border-emerald-700",
  reserved: "bg-amber-50 border-amber-500/50 hover:border-amber-500",
  occupied: "bg-[#0e4330] text-[#f7f2e9] border-[#0e4330]",
  cleaning: "bg-sky-50 border-sky-400/50 hover:border-sky-500",
  maintenance: "bg-stone-200 border-stone-400/50 text-stone-500",
};

const STATE_LABEL: Record<RoomCard["state"], string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  cleaning: "Cleaning",
  maintenance: "Maintenance",
};

export default function Dashboard() {
  const { data, isLoading } = trpc.rooms.dashboard.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<RoomCard | null>(null);
  const { data: regCards } = trpc.registrations.list.useQuery();
  const [cardOpen, setCardOpen] = useState(false);
  const [cardPrefill, setCardPrefill] = useState<Partial<CardForm>>({});
  const [cardEditId, setCardEditId] = useState<number | null>(null);
  const [viewCard, setViewCard] = useState<
    NonNullable<typeof regCards>[number] | null
  >(null);

  // Registration card linked to the selected room's current booking
  const linkedCard = useMemo(() => {
    if (!selected || !regCards) return null;
    if (selected.booking) {
      const byBooking = regCards.find((c) => c.bookingId === selected.booking!.id);
      if (byBooking) return byBooking;
    }
    return regCards.find((c) => c.roomId === selected.id) ?? null;
  }, [selected, regCards]);

  const openCardForm = (editExisting: boolean) => {
    if (!selected) return;
    if (editExisting && linkedCard) {
      setCardEditId(linkedCard.id);
      setCardPrefill({}); // dialog loads existing values via cardToForm below
      setCardPrefill({
        regCardNo: linkedCard.regCardNo ?? "",
        bookingId: linkedCard.bookingId,
        roomId: linkedCard.roomId ? String(linkedCard.roomId) : String(selected.id),
        title: linkedCard.title ?? "Mr",
        guestName: linkedCard.guestName,
        address: linkedCard.address ?? "",
        nationality: linkedCard.nationality ?? "",
        dateOfBirth: linkedCard.dateOfBirth ?? "",
        purposeOfTravel: linkedCard.purposeOfTravel ?? "",
        durationOfStay: linkedCard.durationOfStay ?? "",
        profession: linkedCard.profession ?? "",
        localAgent: linkedCard.localAgent ?? "",
        visaImmRegNo: linkedCard.visaImmRegNo ?? "",
        placeDateOfIssue: linkedCard.placeDateOfIssue ?? "",
        passportNo: linkedCard.passportNo ?? "",
        nidNo: linkedCard.nidNo ?? "",
        dateOfEntryBd: linkedCard.dateOfEntryBd ?? "",
        visaIssueDate: linkedCard.visaIssueDate ?? "",
        visaExpiryDate: linkedCard.visaExpiryDate ?? "",
        mobile: linkedCard.mobile ?? "",
        tel: linkedCard.tel ?? "",
        tariff: linkedCard.tariff != null ? String(linkedCard.tariff) : "",
        modeOfPayment: linkedCard.modeOfPayment ?? "individual",
        checkInDate: linkedCard.checkInDate ?? "",
        checkInTime: linkedCard.checkInTime ?? "",
        checkOutDate: linkedCard.checkOutDate ?? "",
        checkOutTime: linkedCard.checkOutTime ?? "",
      });
    } else {
      setCardEditId(null);
      setCardPrefill({
        bookingId: selected.booking?.id ?? null,
        guestName: selected.booking?.guestName ?? "",
        roomId: String(selected.id),
        tariff: String(selected.ratePerNight),
        checkInDate: selected.booking ? String(selected.booking.checkIn).slice(0, 10) : "",
        checkOutDate: selected.booking ? String(selected.booking.checkOut).slice(0, 10) : "",
      });
    }
    setCardOpen(true);
  };

  const invalidate = () => {
    utils.rooms.dashboard.invalidate();
    utils.bookings.list.invalidate();
  };

  const checkIn = trpc.bookings.checkIn.useMutation({
    onSuccess: () => {
      toast.success("Guest checked in");
      invalidate();
      // Open the Registration Card popup on check-in if none exists yet
      if (!linkedCard) openCardForm(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const checkOut = trpc.bookings.checkOut.useMutation({
    onSuccess: () => {
      toast.success("Guest checked out — room sent to housekeeping");
      invalidate();
      setSelected(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const setHk = trpc.rooms.setHousekeeping.useMutation({
    onSuccess: () => {
      toast.success("Room status updated");
      invalidate();
      setSelected(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const floors = useMemo(() => {
    const map = new Map<number, RoomCard[]>();
    for (const r of (data?.rooms ?? []) as RoomCard[]) {
      const arr = map.get(r.floor) ?? [];
      arr.push(r);
      map.set(r.floor, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [data]);

  const s = data?.stats;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Front Desk</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live room status — {data?.today}
          </p>
        </div>
        <Button
          onClick={() => {
            setCardEditId(null);
            setCardPrefill({ checkInDate: todayStr() });
            setCardOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> New Booking
        </Button>
      </div>

      {s && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          {[
            ["Total Rooms", s.total],
            ["Occupied", s.occupied],
            ["Reserved", s.reserved],
            ["Available", s.available],
            ["Cleaning", s.cleaning],
            ["Maintenance", s.maintenance],
            ["Arrivals Today", s.arrivalsToday],
            ["Departures Today", s.departuresToday],
          ].map(([label, v]) => (
            <div key={label} className="bg-card rounded-lg border px-4 py-3">
              <div className="font-display text-2xl font-semibold">{v}</div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && <p className="text-muted-foreground">Loading rooms…</p>}

      <div className="space-y-6">
        {floors.map(([floor, rooms]) => (
          <div key={floor}>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Floor {floor}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`text-left rounded-lg border-2 p-3 transition-colors ${STATE_STYLE[r.state]}`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-xl font-semibold">
                      {r.number}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wide ${
                        r.state === "occupied" ? "text-[#af915f]" : "text-muted-foreground"
                      }`}
                    >
                      {STATE_LABEL[r.state]}
                    </span>
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      r.state === "occupied" ? "text-[#f7f2e9]/70" : "text-muted-foreground"
                    }`}
                  >
                    {ROOM_TYPE_LABELS[r.type]}
                  </div>
                  <div className="text-xs mt-2 font-medium truncate">
                    {r.booking ? r.booking.guestName : `${bdt(r.ratePerNight)}/night`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Room detail dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  Room {selected.number} · {ROOM_TYPE_LABELS[selected.type]}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{STATE_LABEL[selected.state]}</Badge>
                <span className="text-sm text-muted-foreground">
                  {bdt(selected.ratePerNight)} per night
                </span>
              </div>
              {selected.booking && (
                <div className="rounded-md bg-secondary px-4 py-3 text-sm space-y-1">
                  <div className="font-medium">{selected.booking.guestName}</div>
                  <div className="text-muted-foreground">
                    Booking #{selected.booking.id} ·{" "}
                    {String(selected.booking.checkIn).slice(0, 10)} →{" "}
                    {String(selected.booking.checkOut).slice(0, 10)}
                  </div>
                </div>
              )}

              {/* Guest registration details — everything from the Registration Card */}
              {selected.booking && linkedCard && (
                <div className="rounded-lg border">
                  <div className="flex items-center justify-between px-4 py-2 border-b bg-accent/5">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <ClipboardList className="h-4 w-4 text-accent" />
                      Registration Card #{linkedCard.regCardNo ?? linkedCard.id}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewCard(linkedCard)}>
                        View / Print
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openCardForm(true)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 px-4 py-3 text-sm">
                    {(
                      [
                        ["Guest", `${linkedCard.title ?? ""} ${linkedCard.guestName}`.trim()],
                        ["Nationality", linkedCard.nationality],
                        ["Passport #", linkedCard.passportNo],
                        ["NID #", linkedCard.nidNo],
                        ["Mobile", linkedCard.mobile],
                        ["Date of Birth", linkedCard.dateOfBirth],
                        ["Profession", linkedCard.profession],
                        ["Purpose of Travel", linkedCard.purposeOfTravel],
                        ["Duration of Stay", linkedCard.durationOfStay],
                        ["Local Agent / Company", linkedCard.localAgent],
                        ["Visa / Imm / Reg. #", linkedCard.visaImmRegNo],
                        ["Visa Expiry", linkedCard.visaExpiryDate],
                        ["Entry in Bangladesh", linkedCard.dateOfEntryBd],
                        ["Tariff", linkedCard.tariff != null ? bdt(linkedCard.tariff) : null],
                        ["Payment Mode", linkedCard.modeOfPayment],
                        ["Address", linkedCard.address],
                      ] as const
                    ).map(([label, value]) =>
                      value ? (
                        <div key={label}>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {label}
                          </div>
                          <div className="font-medium break-words">{value}</div>
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {selected.booking?.status === "confirmed" && (
                  <Button size="sm" onClick={() => checkIn.mutate({ id: selected.booking!.id })}>
                    <LogIn className="h-4 w-4 mr-1" /> Check In
                  </Button>
                )}
                {selected.booking?.status === "checked_in" && (
                  <Button size="sm" onClick={() => checkOut.mutate({ id: selected.booking!.id })}>
                    <LogOut className="h-4 w-4 mr-1" /> Check Out
                  </Button>
                )}
                {selected.booking && !linkedCard && (
                  <Button size="sm" variant="outline" onClick={() => openCardForm(false)}>
                    <ClipboardList className="h-4 w-4 mr-1" /> Fill Registration Card
                  </Button>
                )}
                {!selected.booking && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCardEditId(null);
                      setCardPrefill({
                        roomId: String(selected.id),
                        tariff: String(selected.ratePerNight),
                        checkInDate: todayStr(),
                      });
                      setCardOpen(true);
                      setSelected(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Book This Room
                  </Button>
                )}
              </div>
              <div className="pt-3 border-t">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Housekeeping status
                </div>
                <Select
                  value={selected.housekeeping}
                  onValueChange={(v) =>
                    setHk.mutate({
                      roomId: selected.id,
                      housekeeping: v as "ready" | "cleaning" | "maintenance",
                    })
                  }
                >
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ready">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5" /> Ready
                      </span>
                    </SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="maintenance">
                      <span className="flex items-center gap-2">
                        <Wrench className="h-3.5 w-3.5" /> Maintenance
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Registration Card form + full view — also serves as the New Booking entry */}
      <RegistrationCardDialog
        open={cardOpen}
        onOpenChange={setCardOpen}
        editingId={cardEditId}
        prefill={cardPrefill}
        onSaved={() => utils.registrations.list.invalidate()}
      />
      <RegistrationCardView card={viewCard} onClose={() => setViewCard(null)} />
    </div>
  );
}
