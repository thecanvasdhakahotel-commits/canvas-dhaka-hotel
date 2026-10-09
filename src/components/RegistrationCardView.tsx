import { HOTEL_NAME, HOTEL_ADDRESS, HOTEL_PHONES } from "@contracts/types";
import { bdt } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Printer } from "lucide-react";

export type CardViewData = {
  id: number;
  regCardNo?: string | null;
  title?: string | null;
  guestName: string;
  address?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  purposeOfTravel?: string | null;
  durationOfStay?: string | null;
  profession?: string | null;
  localAgent?: string | null;
  visaImmRegNo?: string | null;
  placeDateOfIssue?: string | null;
  passportNo?: string | null;
  nidNo?: string | null;
  dateOfEntryBd?: string | null;
  visaIssueDate?: string | null;
  visaExpiryDate?: string | null;
  mobile?: string | null;
  tel?: string | null;
  tariff?: number | null;
  modeOfPayment?: string | null;
  checkInDate?: string | null;
  checkInTime?: string | null;
  checkOutDate?: string | null;
  checkOutTime?: string | null;
  room?: { number: string } | null;
};

/** Full registration-card view — shows everything saved for a guest, printable. */
export default function RegistrationCardView({
  card,
  onClose,
}: {
  card: CardViewData | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!card} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {card && (
          <div className="printable text-sm">
            <div className="text-center border-b pb-2 mb-3">
              <div className="font-display text-2xl font-bold">{HOTEL_NAME}</div>
              <div className="text-xs text-muted-foreground">
                {HOTEL_ADDRESS} · {HOTEL_PHONES}
              </div>
              <div className="text-xs font-semibold tracking-widest mt-1 uppercase">
                Guest Registration Card
              </div>
            </div>
            <table className="w-full border-collapse">
              <tbody>
                {(
                  [
                    ["Reg. Card #", card.regCardNo ?? card.id, "Room #", card.room?.number ?? ""],
                    ["Check-in", `${card.checkInDate ?? ""} ${card.checkInTime ?? ""}`.trim(), "Check-out", `${card.checkOutDate ?? ""} ${card.checkOutTime ?? ""}`.trim()],
                    ["Guest Name", `${card.title ?? ""} ${card.guestName}`.trim(), "Nationality", card.nationality ?? ""],
                    ["Address", card.address ?? "", "Date of Birth", card.dateOfBirth ?? ""],
                    ["Purpose of Travel", card.purposeOfTravel ?? "", "Duration of Stay", card.durationOfStay ?? ""],
                    ["Profession", card.profession ?? "", "Local Agent / Company", card.localAgent ?? ""],
                    ["Passport #", card.passportNo ?? "", "NID #", card.nidNo ?? ""],
                    ["Visa / Imm / Reg. #", card.visaImmRegNo ?? "", "Place & Date of Issue", card.placeDateOfIssue ?? ""],
                    ["Date of Entry in Bangladesh", card.dateOfEntryBd ?? "", "", ""],
                    ["Visa Issue Date", card.visaIssueDate ?? "", "Visa Expiry Date", card.visaExpiryDate ?? ""],
                    ["Mobile #", card.mobile ?? "", "Tel #", card.tel ?? ""],
                    ["Tariff", card.tariff != null ? bdt(card.tariff) : "", "Mode of Payment", card.modeOfPayment ?? ""],
                  ] as const
                ).map(([l1, v1, l2, v2], i) => (
                  <tr key={i} className="border-b">
                    <td className="py-1.5 pr-2 font-semibold text-muted-foreground w-44">{l1}</td>
                    <td className="py-1.5 pr-4">{v1}</td>
                    <td className="py-1.5 pr-2 font-semibold text-muted-foreground w-44">{l2}</td>
                    <td className="py-1.5">{v2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between mt-10 text-xs">
              <div className="border-t border-foreground pt-1 w-48 text-center">Guest Signature</div>
              <div className="border-t border-foreground pt-1 w-48 text-center">Authorized Signature</div>
            </div>
            <div className="flex justify-end mt-6 print:hidden">
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Print Card
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
