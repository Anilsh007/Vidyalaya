import { BedDouble, Building2, UsersRound, WalletCards } from "lucide-react";
import type { ReactNode } from "react";

import { archiveHostelAction, archiveHostelRoomAction } from "@/app/(dashboard)/dashboard/hostel/actions";
import { EmptyState } from "@/components/school/empty-state";
import { HostelAllocationForm, HostelForm, HostelRoomForm } from "@/components/hostel/hostel-forms";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";

export default async function HostelPage() {
  const session = await requirePermission(PERMISSIONS.viewHostel);
  const canManageHostel = session.permissions.includes(PERMISSIONS.manageHostel);

  const [hostels, rooms, allocations, students] = await Promise.all([
    db.hostel.findMany({
      where: { schoolId: session.schoolId, isArchived: false },
      include: { rooms: true, allocations: { where: { status: "ACTIVE" } } },
      orderBy: [{ code: "asc" }]
    }),
    db.hostelRoom.findMany({
      where: { schoolId: session.schoolId, isArchived: false },
      include: { hostel: true, allocations: { where: { status: "ACTIVE" } } },
      orderBy: [{ hostel: { code: "asc" } }, { roomNumber: "asc" }]
    }),
    db.hostelAllocation.findMany({
      where: { schoolId: session.schoolId },
      include: { student: { include: { class: true, section: true } }, hostel: true, room: true },
      orderBy: [{ createdAt: "desc" }],
      take: 20
    }),
    db.student.findMany({
      where: { schoolId: session.schoolId, status: { not: "ARCHIVED" } },
      include: { class: true, section: true },
      orderBy: [{ fullName: "asc" }]
    })
  ]);

  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const activeAllocations = allocations.filter((allocation) => allocation.status === "ACTIVE");
  const monthlyHostelValue = activeAllocations.reduce(
    (sum, allocation) => sum + Number(allocation.monthlyFee ?? allocation.room.monthlyFee ?? 0),
    0
  );
  const consentPending = activeAllocations.filter((allocation) => !allocation.guardianConsent).length;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 17"
        title="Hostel management"
        description="Maintain hostels, rooms, bed capacity, student allocations, guardian consent, occupancy, and hostel fee visibility from one residential operations workspace."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Hostels" value={hostels.length.toString()} icon={<Building2 className="h-5 w-5" />} />
        <SummaryCard title="Rooms" value={rooms.length.toString()} icon={<BedDouble className="h-5 w-5" />} />
        <SummaryCard title="Occupancy" value={`${activeAllocations.length}/${totalCapacity}`} icon={<UsersRound className="h-5 w-5" />} />
        <SummaryCard title="Monthly value" value={formatCurrency(monthlyHostelValue)} icon={<WalletCards className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>{canManageHostel ? "Add hostel" : "Hostel controls"}</CardTitle><p className="text-sm leading-6 text-slate-600">{canManageHostel ? "Create hostel buildings with warden and contact details." : "Your account can review hostel records but cannot update them."}</p></CardHeader>
          <CardContent>{canManageHostel ? <HostelForm /> : <EmptyState title="View-only access" description="Ask an administrator for hostel management permission to update records." />}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Hostel register</CardTitle><p className="text-sm leading-6 text-slate-600">Review hostel rooms, active residents, warden details, and status.</p></CardHeader>
          <CardContent>
            {hostels.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200"><Table><THead><tr><TH>Hostel</TH><TH>Warden</TH><TH>Rooms</TH><TH>Residents</TH><TH className="text-right">Action</TH></tr></THead><TBody>{hostels.map((hostel) => (<tr key={hostel.id}><TD><div className="grid gap-1"><span className="font-medium text-slate-950">{hostel.code} - {hostel.name}</span><span className="text-xs text-slate-500">{hostel.address ?? "No address"}</span></div></TD><TD>{hostel.wardenName ?? "Not assigned"}{hostel.wardenPhone ? ` (${hostel.wardenPhone})` : ""}</TD><TD>{hostel.rooms.length}</TD><TD>{hostel.allocations.length}</TD><TD className="text-right">{canManageHostel ? <div className="flex justify-end gap-2"><Dialog title={`Edit ${hostel.name}`} description="Update hostel and warden details." triggerLabel="Edit"><HostelForm defaultValues={hostel} /></Dialog><form action={archiveHostelAction}><input type="hidden" name="hostelId" value={hostel.id} /><Button variant="secondary" size="sm" type="submit">Archive</Button></form></div> : <span className="text-sm text-slate-500">View only</span>}</TD></tr>))}</TBody></Table></div>
            ) : <EmptyState title="No hostels" description="Create the first hostel to begin room planning." />}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader><CardTitle>Rooms and allocations</CardTitle><p className="text-sm leading-6 text-slate-600">Create rooms, capacity, fee, then assign students.</p></CardHeader>
          <CardContent className="grid gap-5">
            {canManageHostel ? (<><HostelRoomForm hostels={hostels.map((h) => ({ id: h.id, code: h.code, name: h.name }))} /><div className="border-t border-slate-200 pt-5"><HostelAllocationForm students={students.map((s) => ({ id: s.id, name: s.fullName, meta: [s.class?.name, s.section?.name].filter(Boolean).join(" ") }))} hostels={hostels.map((h) => ({ id: h.id, code: h.code, name: h.name }))} rooms={rooms.map((r) => ({ id: r.id, hostelId: r.hostelId, roomNumber: `${r.hostel.code} - ${r.roomNumber}`, capacity: r.capacity, occupied: r.allocations.length, monthlyFee: r.monthlyFee?.toString() ?? null }))} /></div></>) : <EmptyState title="View-only access" description="You can review rooms and allocations but cannot create them." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Room occupancy</CardTitle><p className="text-sm leading-6 text-slate-600">See room capacity, active residents, floor, type, and monthly fee.</p></CardHeader>
          <CardContent>
            {rooms.length ? (<div className="overflow-hidden rounded-2xl border border-slate-200"><Table><THead><tr><TH>Room</TH><TH>Type</TH><TH>Occupancy</TH><TH>Fee</TH><TH className="text-right">Action</TH></tr></THead><TBody>{rooms.map((room) => (<tr key={room.id}><TD><div className="grid gap-1"><span className="font-medium text-slate-950">{room.hostel.code} - {room.roomNumber}</span><span className="text-xs text-slate-500">Floor {room.floor ?? "-"}</span></div></TD><TD>{room.roomType ?? "Room"}</TD><TD>{room.allocations.length}/{room.capacity}</TD><TD>{room.monthlyFee ? formatCurrency(Number(room.monthlyFee)) : "Not set"}</TD><TD className="text-right">{canManageHostel ? <form action={archiveHostelRoomAction}><input type="hidden" name="roomId" value={room.id} /><Button variant="secondary" size="sm" type="submit">Archive</Button></form> : <span className="text-sm text-slate-500">View only</span>}</TD></tr>))}</TBody></Table></div>) : <EmptyState title="No rooms" description="Create rooms before assigning students to hostel." />}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader><CardTitle>Recent allocations</CardTitle><p className="text-sm leading-6 text-slate-600">Latest hostel allocations with room, fee, consent, and status.</p></CardHeader>
        <CardContent>{allocations.length ? (<div className="overflow-hidden rounded-2xl border border-slate-200"><Table><THead><tr><TH>Student</TH><TH>Hostel</TH><TH>Room</TH><TH>Fee</TH><TH>Consent</TH><TH>Status</TH></tr></THead><TBody>{allocations.map((allocation) => (<tr key={allocation.id}><TD>{allocation.student.fullName}</TD><TD>{allocation.hostel.code} - {allocation.hostel.name}</TD><TD>{allocation.room.roomNumber}{allocation.bedNumber ? ` / Bed ${allocation.bedNumber}` : ""}</TD><TD>{formatCurrency(Number(allocation.monthlyFee ?? allocation.room.monthlyFee ?? 0))}</TD><TD>{allocation.guardianConsent ? "Yes" : "Pending"}</TD><TD>{allocation.status}</TD></tr>))}</TBody></Table></div>) : <EmptyState title="No allocations" description="Allocated hostel students will appear here." />}</CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <PlanningPanel title="Occupancy control" description="Capacity and active allocation counts show where beds are available before assigning students." />
        <PlanningPanel title="Consent tracking" description={`${consentPending} active resident(s) currently have guardian consent pending.`} />
        <PlanningPanel title="Residential billing" description="Room and allocation monthly fees provide the base for future hostel fee billing workflows." />
      </section>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return <div className="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-panel"><div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-brand-700">{icon}</div><p className="text-sm text-slate-500">{title}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p></div>;
}

function PlanningPanel({ title, description }: { title: string; description: string }) {
  return <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-panel"><p className="font-medium text-slate-950">{title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>;
}
