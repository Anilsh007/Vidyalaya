import { formatDate } from "@/lib/utils";

type ReportCardTemplateProps = {
  schoolName: string;
  schoolAddress: string;
  reportTitle: string;
  studentName: string;
  classSection: string;
  admissionNumber: string;
  examName: string;
  examTerm: string;
  examType: string;
  generatedOn: Date;
  rows: Array<{
    subject: string;
    maxMarks: number;
    passMarks: number;
    obtainedMarks: number;
    remarks?: string | null;
  }>;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  resultStatus: string;
  teacherRemarks?: string | null;
  principalRemarks?: string | null;
  principalSignatureLabel?: string;
};

export function ReportCardTemplate({
  schoolName,
  schoolAddress,
  reportTitle,
  studentName,
  classSection,
  admissionNumber,
  examName,
  examTerm,
  examType,
  generatedOn,
  rows,
  totalMarks,
  obtainedMarks,
  percentage,
  grade,
  resultStatus,
  teacherRemarks,
  principalRemarks,
  principalSignatureLabel = "Principal"
}: ReportCardTemplateProps) {
  return (
    <section className="grid gap-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold text-slate-950">{schoolName}</h1>
            <p className="max-w-xl text-sm leading-6 text-slate-600">{schoolAddress}</p>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">{reportTitle}</p>
          </div>
          <div className="grid gap-2 text-right text-sm text-slate-600">
            <p>{formatDate(generatedOn)}</p>
            <p>{examTerm}</p>
            <p>{examType}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard label="Student name" value={studentName} />
        <InfoCard label="Class / section" value={classSection} />
        <InfoCard label="Admission number" value={admissionNumber} />
        <InfoCard label="Exam" value={examName} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 text-right font-medium">Max</th>
              <th className="px-4 py-3 text-right font-medium">Pass</th>
              <th className="px-4 py-3 text-right font-medium">Obtained</th>
              <th className="px-4 py-3 font-medium">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr key={row.subject}>
                <td className="px-4 py-3 text-slate-700">{row.subject}</td>
                <td className="px-4 py-3 text-right text-slate-700">{row.maxMarks}</td>
                <td className="px-4 py-3 text-right text-slate-700">{row.passMarks}</td>
                <td className="px-4 py-3 text-right text-slate-700">{row.obtainedMarks}</td>
                <td className="px-4 py-3 text-slate-700">{row.remarks || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <SummaryCard label="Total marks" value={String(totalMarks)} />
        <SummaryCard label="Obtained" value={String(obtainedMarks)} />
        <SummaryCard label="Percentage" value={`${percentage}%`} />
        <SummaryCard label="Grade" value={grade} />
        <SummaryCard label="Result" value={resultStatus} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RemarksCard label="Teacher remarks" value={teacherRemarks || "No remarks"} />
        <RemarksCard label="Principal remarks" value={principalRemarks || "No remarks"} />
      </div>

      <div className="flex justify-end pt-4">
        <div className="min-w-[220px] text-right">
          <div className="mb-3 h-12 border-b border-dashed border-slate-300" />
          <p className="text-sm font-medium text-slate-700">{principalSignatureLabel}</p>
        </div>
      </div>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-950">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function RemarksCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}
