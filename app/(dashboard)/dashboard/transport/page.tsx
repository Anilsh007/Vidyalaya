import { BusFront, MapPinned, Route, ShieldAlert, UsersRound } from "lucide-react";

import { archiveTransportRouteAction, archiveTransportVehicleAction } from "@/app/(dashboard)/dashboard/transport/actions";
import { EmptyState } from "@/components/school/empty-state";
import { InfoPanel as PlanningPanel, SummaryCard, TableFrame } from "@/components/shared/dashboard-primitives";
import { PageHeader } from "@/components/shared/page-header";
import {
  TransportAssignmentForm,
  TransportRouteForm,
  TransportStopForm,
  TransportVehicleForm
} from "@/components/transport/transport-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { PERMISSIONS } from "@/lib/permissions";
import { getTransportPageData } from "@/lib/services/transport.service";
import { formatCurrency } from "@/lib/utils";
import { getWorkspaceAccessCopy, resolveExperienceRole } from "@/lib/dashboard-experience";

export default async function TransportPage() {
  const session = await requirePermission(PERMISSIONS.viewTransport);
  const canManageTransport = session.permissions.includes(PERMISSIONS.manageTransport);
  const accessCopy = getWorkspaceAccessCopy(resolveExperienceRole(session.roles), "transport");
  const {
    vehicles,
    routes,
    stops,
    assignments,
    students,
    activeAssignments,
    totalCapacity,
    expiringCompliance,
    monthlyTransportValue
  } = await getTransportPageData({ schoolId: session.schoolId });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 16"
        title="Transport management"
        description="Maintain vehicles, routes, stops, student transport assignments, occupancy, compliance dates, and transport fee visibility from one operations workspace."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Vehicles" value={vehicles.length.toString()} icon={<BusFront className="h-5 w-5" />} />
        <SummaryCard title="Routes" value={routes.length.toString()} icon={<Route className="h-5 w-5" />} />
        <SummaryCard title="Assigned students" value={`${activeAssignments.length}/${totalCapacity}`} icon={<UsersRound className="h-5 w-5" />} />
        <SummaryCard title="Monthly value" value={formatCurrency(monthlyTransportValue)} icon={<MapPinned className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>{canManageTransport ? "Add vehicle" : "Transport controls"}</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              {canManageTransport ? "Register vehicles with driver, helper, capacity, insurance, and fitness dates." : accessCopy.summary}
            </p>
          </CardHeader>
          <CardContent>
            {canManageTransport ? <TransportVehicleForm /> : <EmptyState title={accessCopy.title} description={accessCopy.description} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle register</CardTitle>
            <p className="text-sm leading-6 text-slate-600">Review vehicle capacity, crew, assigned route count, and document validity.</p>
          </CardHeader>
          <CardContent>
            {vehicles.length ? (
              <TableFrame>
                <Table>
                  <THead>
                    <tr>
                      <TH>Vehicle</TH>
                      <TH>Crew</TH>
                      <TH>Capacity</TH>
                      <TH>Validity</TH>
                      <TH className="text-right">Action</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {vehicles.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <TD>
                          <div className="grid gap-1">
                            <span className="font-medium text-slate-950">{vehicle.vehicleNumber}</span>
                            <span className="text-xs text-slate-500">{vehicle.vehicleType} - {vehicle.routes.length} route(s)</span>
                          </div>
                        </TD>
                        <TD>{vehicle.driverName ?? "No driver"}{vehicle.driverPhone ? ` (${vehicle.driverPhone})` : ""}</TD>
                        <TD>{vehicle.capacity}</TD>
                        <TD>
                          <div className="grid gap-1 text-sm">
                            <span>Insurance: {vehicle.insuranceValidUntil?.toLocaleDateString("en-IN") ?? "Not set"}</span>
                            <span>Fitness: {vehicle.fitnessValidUntil?.toLocaleDateString("en-IN") ?? "Not set"}</span>
                          </div>
                        </TD>
                        <TD className="text-right">
                          {canManageTransport ? (
                            <div className="flex justify-end gap-2">
                              <Dialog title={`Edit ${vehicle.vehicleNumber}`} description="Update vehicle capacity, crew, and compliance dates." triggerLabel="Edit">
                                <TransportVehicleForm
                                  defaultValues={{
                                    id: vehicle.id,
                                    vehicleNumber: vehicle.vehicleNumber,
                                    vehicleType: vehicle.vehicleType,
                                    capacity: vehicle.capacity,
                                    driverName: vehicle.driverName,
                                    driverPhone: vehicle.driverPhone,
                                    helperName: vehicle.helperName,
                                    insuranceValidUntil: vehicle.insuranceValidUntil?.toISOString().slice(0, 10),
                                    fitnessValidUntil: vehicle.fitnessValidUntil?.toISOString().slice(0, 10),
                                    isActive: vehicle.isActive
                                  }}
                                />
                              </Dialog>
                              <form action={archiveTransportVehicleAction}>
                                <input type="hidden" name="vehicleId" value={vehicle.id} />
                                <Button variant="secondary" size="sm" type="submit">Archive</Button>
                              </form>
                            </div>
                          ) : <span className="text-sm text-slate-500">View only</span>}
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </TableFrame>
            ) : <EmptyState title="No vehicles" description="Create the first transport vehicle to begin route planning." />}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Routes and stops</CardTitle>
            <p className="text-sm leading-6 text-slate-600">Create routes, assign vehicles, and add pickup/drop stops.</p>
          </CardHeader>
          <CardContent className="grid gap-5">
            {canManageTransport ? (
              <>
                <TransportRouteForm vehicles={vehicles.map((vehicle) => ({ id: vehicle.id, vehicleNumber: vehicle.vehicleNumber, vehicleType: vehicle.vehicleType, capacity: vehicle.capacity }))} />
                <div className="border-t border-slate-200 pt-5">
                  <TransportStopForm routes={routes.map((route) => ({ id: route.id, code: route.code, name: route.name, monthlyFee: route.monthlyFee?.toString() ?? null }))} />
                </div>
              </>
            ) : <EmptyState title={accessCopy.title} description={accessCopy.description} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Route occupancy</CardTitle>
            <p className="text-sm leading-6 text-slate-600">See assigned students, stop count, vehicle capacity, and route fee.</p>
          </CardHeader>
          <CardContent>
            {routes.length ? (
              <TableFrame>
                <Table>
                  <THead>
                    <tr>
                      <TH>Route</TH>
                      <TH>Vehicle</TH>
                      <TH>Stops</TH>
                      <TH>Occupancy</TH>
                      <TH>Fee</TH>
                      <TH className="text-right">Action</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {routes.map((route) => (
                      <tr key={route.id}>
                        <TD>
                          <div className="grid gap-1">
                            <span className="font-medium text-slate-950">{route.code} - {route.name}</span>
                            <span className="text-xs text-slate-500">{route.startPoint ?? "Start"} to {route.endPoint ?? "End"}</span>
                          </div>
                        </TD>
                        <TD>{route.vehicle?.vehicleNumber ?? "No vehicle"}</TD>
                        <TD>{route.stops.length}</TD>
                        <TD>{route.assignments.length}/{route.vehicle?.capacity ?? 0}</TD>
                        <TD>{route.monthlyFee ? formatCurrency(Number(route.monthlyFee)) : "Not set"}</TD>
                        <TD className="text-right">
                          {canManageTransport ? (
                            <div className="flex justify-end gap-2">
                              <Dialog title={`Edit ${route.name}`} description="Update vehicle, endpoints, fee, or route status." triggerLabel="Edit">
                                <TransportRouteForm
                                  vehicles={vehicles.map((vehicle) => ({ id: vehicle.id, vehicleNumber: vehicle.vehicleNumber, vehicleType: vehicle.vehicleType, capacity: vehicle.capacity }))}
                                  defaultValues={{
                                    id: route.id,
                                    vehicleId: route.vehicleId,
                                    name: route.name,
                                    code: route.code,
                                    startPoint: route.startPoint,
                                    endPoint: route.endPoint,
                                    monthlyFee: route.monthlyFee?.toString() ?? "",
                                    isActive: route.isActive
                                  }}
                                />
                              </Dialog>
                              <form action={archiveTransportRouteAction}>
                                <input type="hidden" name="routeId" value={route.id} />
                                <Button variant="secondary" size="sm" type="submit">Archive</Button>
                              </form>
                            </div>
                          ) : <span className="text-sm text-slate-500">View only</span>}
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </TableFrame>
            ) : <EmptyState title="No routes" description="Create routes and stops to begin student assignments." />}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Assign student transport</CardTitle>
            <p className="text-sm leading-6 text-slate-600">Connect students to routes and stops with fee and active period.</p>
          </CardHeader>
          <CardContent>
            {canManageTransport && routes.length ? (
              <TransportAssignmentForm
                students={students.map((student) => ({ id: student.id, name: student.fullName, meta: [student.class?.name, student.section?.name].filter(Boolean).join(" ") }))}
                routes={routes.map((route) => ({ id: route.id, code: route.code, name: route.name, monthlyFee: route.monthlyFee?.toString() ?? null }))}
                stops={stops.map((stop) => ({ id: stop.id, routeId: stop.routeId, name: `${stop.route.code} - ${stop.name}` }))}
              />
            ) : <EmptyState title={canManageTransport ? "Routes required" : accessCopy.title} description={canManageTransport ? "Create at least one route before assigning students." : accessCopy.description} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent assignments</CardTitle>
            <p className="text-sm leading-6 text-slate-600">Latest student transport assignments and their current status.</p>
          </CardHeader>
          <CardContent>
            {assignments.length ? (
              <TableFrame>
                <Table>
                  <THead>
                    <tr>
                      <TH>Student</TH>
                      <TH>Route</TH>
                      <TH>Stop</TH>
                      <TH>Fee</TH>
                      <TH>Status</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <TD>{assignment.student.fullName}</TD>
                        <TD>{assignment.route.code} - {assignment.route.name}</TD>
                        <TD>{assignment.stop?.name ?? "Not set"}</TD>
                        <TD>{formatCurrency(Number(assignment.monthlyFee ?? assignment.route.monthlyFee ?? 0))}</TD>
                        <TD>{assignment.status}</TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </TableFrame>
            ) : <EmptyState title="No assignments" description="Assigned transport students will appear here." />}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <PlanningPanel title="Capacity planning" description="Vehicle capacity and active route assignments show occupancy before overcrowding happens." />
        <PlanningPanel title="Stop operations" description="Pickup and drop times can be maintained route-wise for front-office and parent communication." />
        <PlanningPanel title="Compliance watch" description={`${expiringCompliance} vehicle(s) currently need insurance or fitness attention based on saved dates.`} />
      </section>
    </div>
  );
}

