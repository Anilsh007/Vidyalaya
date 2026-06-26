import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { ReceiptTemplate } from "@/components/shared/receipt-template";
import { PrintButton } from "@/components/ui/print-button";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { fromMoney } from "@/lib/fees";
import { PERMISSIONS } from "@/lib/permissions";

type Params = Promise<{ paymentId: string }>;

export default async function FeeReceiptPage({ params }: { params: Params }) {
  const session = await requirePermission(PERMISSIONS.manageFees);
  const { paymentId } = await params;

  const payment = await db.feePayment.findFirst({
    where: {
      id: paymentId,
      schoolId: session.schoolId
    },
    include: {
      feeInvoice: {
        include: {
          student: {
            include: {
              class: true,
              section: true
            }
          },
          items: true
        }
      },
      school: true
    }
  });

  if (!payment) {
    notFound();
  }

  const school = payment.school;
  const student = payment.feeInvoice.student;
  const schoolAddress = [
    school.addressLine1,
    school.addressLine2,
    school.city,
    school.state,
    school.postalCode,
    school.country
  ]
    .filter(Boolean)
    .join(", ");
  const schoolContact = [school.phone, school.email].filter(Boolean).join(" • ");
  const totalAmount = fromMoney(payment.feeInvoice.totalAmount);
  const paidAmount = fromMoney(payment.feeInvoice.paidAmount);
  const currentPayment = fromMoney(payment.amount);
  const balanceDue = Math.max(0, totalAmount - paidAmount);
  const feeDetails = [
    ...payment.feeInvoice.items.map((item) => ({
      label: item.label,
      amount: fromMoney(item.amount)
    })),
    ...(fromMoney(payment.feeInvoice.fineAmount) > 0
      ? [
          {
            label: "Late fee",
            amount: fromMoney(payment.feeInvoice.fineAmount)
          }
        ]
      : []),
    ...(fromMoney(payment.feeInvoice.discountAmount) > 0
      ? [
          {
            label: "Discount / concession",
            amount: -fromMoney(payment.feeInvoice.discountAmount)
          }
        ]
      : [])
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Finance"
        title={`Receipt ${payment.receiptNumber}`}
        description="Printable fee receipt generated from the recorded payment. No online gateway is connected at this stage."
        actions={<PrintButton />}
      />
      <ReceiptTemplate
        schoolName={school.name}
        schoolAddress={schoolAddress || "Address not configured"}
        schoolContact={schoolContact || "Contact not configured"}
        receiptNumber={payment.receiptNumber}
        receiptDate={payment.paymentDate}
        studentName={student.fullName}
        classSection={[student.class?.name, student.section?.name].filter(Boolean).join(" - ") || "Class not assigned"}
        feeDetails={feeDetails}
        amountPaid={currentPayment}
        balanceDue={balanceDue}
        paymentMode={payment.paymentMode.replaceAll("_", " ")}
      />
    </div>
  );
}
