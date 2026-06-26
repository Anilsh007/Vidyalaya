import { formatCurrency, formatDate } from "@/lib/utils";

type ReceiptTemplateProps = {
  schoolName: string;
  schoolAddress: string;
  schoolContact: string;
  receiptNumber: string;
  receiptDate: Date;
  studentName: string;
  classSection: string;
  feeDetails: Array<{
    label: string;
    amount: number;
  }>;
  amountPaid: number;
  balanceDue: number;
  paymentMode: string;
  authorizedSignatureLabel?: string;
};

export function ReceiptTemplate({
  schoolName,
  schoolAddress,
  schoolContact,
  receiptNumber,
  receiptDate,
  studentName,
  classSection,
  feeDetails,
  amountPaid,
  balanceDue,
  paymentMode,
  authorizedSignatureLabel = "Authorized Signature"
}: ReceiptTemplateProps) {
  const feeTotal = feeDetails.reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className="grid gap-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
        <div className="grid gap-1">
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Fee Receipt</p>
          <h1 className="text-2xl font-semibold text-slate-950">{schoolName}</h1>
          <p className="max-w-xl text-sm leading-6 text-slate-600">{schoolAddress}</p>
          <p className="text-sm text-slate-600">{schoolContact}</p>
        </div>
        <div className="grid gap-2 text-right text-sm text-slate-600">
          <p>
            <span className="font-medium text-slate-950">Receipt No:</span> {receiptNumber}
          </p>
          <p>
            <span className="font-medium text-slate-950">Date:</span> {formatDate(receiptDate)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Student name</p>
          <p className="font-medium text-slate-950">{studentName}</p>
        </div>
        <div className="grid gap-2 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Class / section</p>
          <p className="font-medium text-slate-950">{classSection}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Fee details</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {feeDetails.map((item) => (
              <tr key={item.label}>
                <td className="px-4 py-3 text-slate-700">{item.label}</td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-950">Invoice total</td>
              <td className="px-4 py-3 text-right font-medium text-slate-950">
                {formatCurrency(feeTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Paid amount</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {formatCurrency(amountPaid)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Balance due</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {formatCurrency(balanceDue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Payment mode</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{paymentMode}</p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-6 border-t border-slate-200 pt-6">
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          Payment recorded
        </div>
        <div className="min-w-[220px] text-right">
          <div className="mb-3 h-12 border-b border-dashed border-slate-300" />
          <p className="text-sm font-medium text-slate-700">{authorizedSignatureLabel}</p>
        </div>
      </div>
    </section>
  );
}
