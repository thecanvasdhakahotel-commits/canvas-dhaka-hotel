import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { bdt, todayStr, addDays } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/excel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Reports() {
  const [from, setFrom] = useState(addDays(todayStr(), -29));
  const [to, setTo] = useState(todayStr());
  const { data, isLoading } = trpc.reports.summary.useQuery({ from, to });

  const cards = data
    ? [
        ["Room Revenue", bdt(data.roomRevenue)],
        ["Restaurant Revenue", bdt(data.posRevenue)],
        ["Total Revenue", bdt(data.totalRevenue)],
        ["VAT Collected", bdt(data.totalVat)],
        ["Service Charge", bdt(data.posService)],
        ["Bookings", String(data.bookingCount)],
        ["Room Nights", String(data.roomNights)],
        ["POS Orders", String(data.posOrderCount)],
      ]
    : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Billing & Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Income, VAT (15%) and service charge (10%) summary
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (!data) return;
              exportToExcel(
                [
                  { Metric: "Room Revenue (BDT)", Value: data.roomRevenue },
                  { Metric: "Restaurant Revenue (BDT)", Value: data.posRevenue },
                  { Metric: "Total Revenue (BDT)", Value: data.totalRevenue },
                  { Metric: "VAT Collected (BDT)", Value: data.totalVat },
                  { Metric: "Service Charge (BDT)", Value: data.posService },
                  { Metric: "Bookings", Value: data.bookingCount },
                  { Metric: "Room Nights", Value: data.roomNights },
                  { Metric: "POS Orders", Value: data.posOrderCount },
                ],
                "Summary",
                `report-summary-${from}-to-${to}`,
              );
              exportToExcel(
                data.daily.map((d) => ({
                  Date: d.date,
                  "Room Revenue (BDT)": d.room,
                  "Restaurant Revenue (BDT)": d.pos,
                  "VAT (BDT)": d.vat,
                  "Total (BDT)": d.room + d.pos,
                })),
                "Daily Income",
                `report-daily-${from}-to-${to}`,
              );
              toast.success("Excel reports downloaded");
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {cards.map(([label, v]) => (
              <div key={label} className="bg-card rounded-lg border px-4 py-3">
                <div className="font-display text-xl font-semibold">{v}</div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <h2 className="font-display text-xl font-semibold mb-3">Daily Income</h2>
          <div className="bg-card rounded-lg border mb-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Room Revenue</TableHead>
                  <TableHead className="text-right">Restaurant Revenue</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.daily.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No income recorded in this period.
                    </TableCell>
                  </TableRow>
                )}
                {data.daily.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell className="font-medium">{d.date}</TableCell>
                    <TableCell className="text-right">{bdt(d.room)}</TableCell>
                    <TableCell className="text-right">{bdt(d.pos)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {bdt(d.vat)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {bdt(d.room + d.pos)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <h2 className="font-display text-xl font-semibold mb-3">Monthly Income</h2>
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Room Revenue</TableHead>
                  <TableHead className="text-right">Restaurant Revenue</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthly.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No income recorded in this period.
                    </TableCell>
                  </TableRow>
                )}
                {data.monthly.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{m.month}</TableCell>
                    <TableCell className="text-right">{bdt(m.room)}</TableCell>
                    <TableCell className="text-right">{bdt(m.pos)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {bdt(m.vat)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {bdt(m.room + m.pos)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
