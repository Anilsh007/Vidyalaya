import { BookMarked, BookOpenCheck, Clock3, Search, WalletCards } from "lucide-react";

import { archiveLibraryBookAction } from "@/app/(dashboard)/dashboard/library/actions";
import { EmptyState } from "@/components/school/empty-state";
import { LibraryBookForm, LibraryIssueForm, LibraryReturnForm } from "@/components/library/library-forms";
import { SummaryCard, TableFrame } from "@/components/shared/dashboard-primitives";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/access";
import { PERMISSIONS } from "@/lib/permissions";
import { getLibraryPageData } from "@/lib/services/library.service";
import { formatCurrency } from "@/lib/utils";
import { getWorkspaceAccessCopy, resolveExperienceRole } from "@/lib/dashboard-experience";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePermission(PERMISSIONS.viewLibrary);
  const params = await searchParams;
  const query = asSingle(params.q)?.trim() ?? "";
  const category = asSingle(params.category) ?? "";
  const availability = asSingle(params.availability) ?? "";
  const canManageLibrary = session.permissions.includes(PERMISSIONS.manageLibrary);
  const accessCopy = getWorkspaceAccessCopy(resolveExperienceRole(session.roles), "library");
  const {
    books,
    allBooks,
    activeIssues,
    recentIssues,
    students,
    staff,
    categories,
    totalCopies,
    availableCopies,
    overdueIssues,
    totalFine
  } = await getLibraryPageData({
    schoolId: session.schoolId,
    query,
    category,
    availability
  });
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Phase 14"
        title="Library management"
        description="Maintain the book catalogue, issue books to students or staff, track active circulation, record returns, and monitor overdue items from one library workspace."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Book titles" value={allBooks.length.toString()} icon={<BookMarked className="h-5 w-5" />} />
        <SummaryCard title="Available copies" value={`${availableCopies}/${totalCopies}`} icon={<BookOpenCheck className="h-5 w-5" />} />
        <SummaryCard title="Active issues" value={activeIssues.length.toString()} icon={<Clock3 className="h-5 w-5" />} />
        <SummaryCard title="Fines recorded" value={formatCurrency(totalFine)} icon={<WalletCards className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Card>
          <CardHeader>
            <CardTitle>{canManageLibrary ? "Add book" : "Library controls"}</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              {canManageLibrary
                ? "Create catalogue records with copy counts and shelf locations before issuing books."
                : accessCopy.summary}
            </p>
          </CardHeader>
          <CardContent>
            {canManageLibrary ? (
              <LibraryBookForm />
            ) : (
              <EmptyState title={accessCopy.title} description={accessCopy.description} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Book catalogue</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Search by title, accession number, author, or category and review copy availability.
            </p>
          </CardHeader>
          <CardContent className="grid gap-5">
            <form className="grid gap-4 lg:grid-cols-[1fr_180px_180px_auto]" action="/dashboard/library">
              <FormField label="Search" htmlFor="q">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="q" name="q" defaultValue={query} className="pl-9" placeholder="Title, author, accession" />
                </div>
              </FormField>
              <FormField label="Category" htmlFor="category">
                <Select id="category" name="category" defaultValue={category}>
                  <option value="">All categories</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Availability" htmlFor="availability">
                <Select id="availability" name="availability" defaultValue={availability}>
                  <option value="">All books</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Fully issued</option>
                </Select>
              </FormField>
              <div className="flex items-end">
                <Button type="submit" className="w-full lg:w-auto">Apply</Button>
              </div>
            </form>

            {books.length ? (
              <TableFrame>
                <Table>
                  <THead>
                    <tr>
                      <TH>Book</TH>
                      <TH>Category</TH>
                      <TH>Shelf</TH>
                      <TH>Copies</TH>
                      <TH className="text-right">Action</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {books.map((book) => (
                      <tr key={book.id}>
                        <TD>
                          <div className="grid gap-1">
                            <span className="font-medium text-slate-950">{book.title}</span>
                            <span className="text-xs text-slate-500">{book.accessionNumber} {book.author ? `- ${book.author}` : ""}</span>
                          </div>
                        </TD>
                        <TD>{book.category ?? "Uncategorised"}</TD>
                        <TD>{book.shelfLocation ?? "Not set"}</TD>
                        <TD>{book.availableCopies}/{book.totalCopies}</TD>
                        <TD className="text-right">
                          {canManageLibrary ? (
                            <div className="flex justify-end gap-2">
                              <Dialog title={`Edit ${book.title}`} description="Update catalogue, copy, or shelf details." triggerLabel="Edit">
                                <LibraryBookForm defaultValues={book} />
                              </Dialog>
                              <form action={archiveLibraryBookAction}>
                                <input type="hidden" name="bookId" value={book.id} />
                                <Button variant="secondary" size="sm" type="submit" disabled={book.issues.length > 0}>Archive</Button>
                              </form>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">View only</span>
                          )}
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              </TableFrame>
            ) : (
              <EmptyState title="No books found" description="Adjust filters or add the first book to the library catalogue." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Issue book</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Select an available book, borrower, issue date, and due date.
            </p>
          </CardHeader>
          <CardContent>
            {canManageLibrary && books.some((book) => book.availableCopies > 0) ? (
              <LibraryIssueForm
                books={books
                  .filter((book) => book.availableCopies > 0)
                  .map((book) => ({
                    id: book.id,
                    title: book.title,
                    accessionNumber: book.accessionNumber,
                    availableCopies: book.availableCopies
                  }))}
                students={students.map((student) => ({
                  id: student.id,
                  name: student.fullName,
                  meta: [student.class?.name, student.section?.name].filter(Boolean).join(" ")
                }))}
                staff={staff.map((member) => ({ id: member.id, name: member.fullName, meta: member.designation }))}
              />
            ) : (
              <EmptyState
                title={canManageLibrary ? "No available books" : accessCopy.title}
                description={canManageLibrary ? "Add books or return issued copies before creating a new issue." : accessCopy.description}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active circulation</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Track issued books, due dates, overdue items, and returns.
            </p>
          </CardHeader>
          <CardContent>
            {activeIssues.length ? (
              <TableFrame>
                <Table>
                  <THead>
                    <tr>
                      <TH>Book</TH>
                      <TH>Borrower</TH>
                      <TH>Due</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Return</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {activeIssues.map((issue) => {
                      const overdue = issue.dueDate < todayEnd;
                      return (
                        <tr key={issue.id}>
                          <TD>
                            <div className="grid gap-1">
                              <span className="font-medium text-slate-950">{issue.book.title}</span>
                              <span className="text-xs text-slate-500">{issue.book.accessionNumber}</span>
                            </div>
                          </TD>
                          <TD>
                            <div className="grid gap-1">
                              <span>{issue.borrowerName}</span>
                              <span className="text-xs text-slate-500">{issue.borrowerType}</span>
                            </div>
                          </TD>
                          <TD>{issue.dueDate.toLocaleDateString("en-IN")}</TD>
                          <TD>
                            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${overdue ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                              {overdue ? "Overdue" : "Issued"}
                            </span>
                          </TD>
                          <TD className="text-right">
                            {canManageLibrary ? (
                              <Dialog title={`Return ${issue.book.title}`} description={`Borrower: ${issue.borrowerName}`} triggerLabel="Return">
                                <LibraryReturnForm issueId={issue.id} />
                              </Dialog>
                            ) : (
                              <span className="text-sm text-slate-500">View only</span>
                            )}
                          </TD>
                        </tr>
                      );
                    })}
                  </TBody>
                </Table>
              </TableFrame>
            ) : (
              <EmptyState title="No active issues" description="Issued books will appear here until they are returned." />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent library activity</CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Latest issue and return records for library desk review.
          </p>
        </CardHeader>
        <CardContent>
          {recentIssues.length ? (
            <TableFrame>
              <Table>
                <THead>
                  <tr>
                    <TH>Book</TH>
                    <TH>Borrower</TH>
                    <TH>Issued</TH>
                    <TH>Returned</TH>
                    <TH>Fine</TH>
                  </tr>
                </THead>
                <TBody>
                  {recentIssues.map((issue) => (
                    <tr key={issue.id}>
                      <TD>{issue.book.title}</TD>
                      <TD>{issue.borrowerName}</TD>
                      <TD>{issue.issueDate.toLocaleDateString("en-IN")}</TD>
                      <TD>{issue.returnedAt?.toLocaleDateString("en-IN") ?? issue.status}</TD>
                      <TD>{formatCurrency(Number(issue.fineAmount))}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </TableFrame>
          ) : (
            <EmptyState title="No library activity" description="Issue and return records will appear here." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

