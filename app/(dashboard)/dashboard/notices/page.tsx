import { Megaphone, Send, Tags } from "lucide-react";

import { toggleNoticePublishAction } from "@/app/(dashboard)/dashboard/notices/actions";
import { NoticeForm } from "@/components/notices/notice-form";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { noticeTypeTone } from "@/lib/notices";
import { PERMISSIONS } from "@/lib/permissions";
import { toDateInput } from "@/lib/school";

export default async function NoticesPage() {
  const session = await requirePermission(PERMISSIONS.manageNotices);
  const [classes, sections, notices, roles] = await Promise.all([
    db.schoolClass.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    }),
    db.section.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ name: "asc" }]
    }),
    db.notice.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ updatedAt: "desc" }]
    }),
    db.role.findMany({
      where: { schoolId: session.schoolId },
      orderBy: { code: "asc" }
    })
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 6"
        title="Notices"
        description="Draft, update, publish, and target notices by audience while keeping important items visible on staff dashboards."
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-brand-700">
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="grid gap-1">
                <CardTitle>Create notice</CardTitle>
                <p className="text-sm leading-6 text-slate-600">
                  Notices can target all users, roles, classes, or sections. No paid SMS or WhatsApp API is used here.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <NoticeForm
              roles={roles.map((role) => role.code)}
              classes={classes.map((item) => ({ id: item.id, name: item.name }))}
              sections={sections.map((item) => ({
                id: item.id,
                name: item.name,
                classId: item.classId
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Tags className="h-5 w-5" />
              </div>
              <div className="grid gap-1">
                <CardTitle>Notice register</CardTitle>
                <p className="text-sm leading-6 text-slate-600">
                  Publish or unpublish notices and copy the message text for email or manual sharing when useful.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {notices.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <THead>
                    <tr>
                      <TH>Notice</TH>
                      <TH>Audience</TH>
                      <TH>Type</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {notices.map((notice) => (
                      <tr key={notice.id}>
                        <TD>
                          <div className="grid gap-1">
                            <span className="font-medium text-slate-950">{notice.title}</span>
                            <span className="text-xs text-slate-500">
                              {notice.expiresAt
                                ? `Expires ${notice.expiresAt.toLocaleDateString("en-IN")}`
                                : "No expiry"}
                            </span>
                          </div>
                        </TD>
                        <TD>{notice.audienceLabel}</TD>
                        <TD>
                          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${noticeTypeTone(notice.noticeType)}`}>
                            {notice.noticeType}
                          </span>
                        </TD>
                        <TD>{notice.isPublished ? "Published" : "Draft"}</TD>
                        <TD>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Dialog
                              title={`Edit ${notice.title}`}
                              description="Update notice content or targeting before publishing again."
                              triggerLabel="Edit"
                            >
                              <NoticeForm
                                roles={roles.map((role) => role.code)}
                                classes={classes.map((item) => ({ id: item.id, name: item.name }))}
                                sections={sections.map((item) => ({
                                  id: item.id,
                                  name: item.name,
                                  classId: item.classId
                                }))}
                                defaultValues={{
                                  id: notice.id,
                                  title: notice.title,
                                  body: notice.body,
                                  audienceType: notice.audienceType,
                                  roleCode: notice.roleCode,
                                  classId: notice.classId,
                                  sectionId: notice.sectionId,
                                  noticeType: notice.noticeType,
                                  expiresAt: toDateInput(notice.expiresAt)
                                }}
                              />
                            </Dialog>
                            <form action={toggleNoticePublishAction}>
                              <input type="hidden" name="noticeId" value={notice.id} />
                              <Button type="submit" variant="secondary" size="sm">
                                <Send className="h-4 w-4" />
                                {notice.isPublished ? "Unpublish" : "Publish"}
                              </Button>
                            </form>
                            <CopyButton
                              text={`${notice.title}\n\n${notice.body}`}
                              label="Copy"
                            />
                          </div>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No notices have been created yet.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
