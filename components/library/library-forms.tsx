"use client";

import { useActionState } from "react";

import {
  issueLibraryBookAction,
  returnLibraryBookAction,
  saveLibraryBookAction
} from "@/app/(dashboard)/dashboard/library/actions";
import { FieldError } from "@/components/school/field-error";
import { FormStateMessage } from "@/components/school/form-state-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { initialActionFormState } from "@/lib/forms";

type BookOption = {
  id: string;
  title: string;
  accessionNumber: string;
  availableCopies: number;
};

type BorrowerOption = {
  id: string;
  name: string;
  meta?: string;
};

export function LibraryBookForm({
  defaultValues
}: {
  defaultValues?: {
    id?: string;
    accessionNumber?: string;
    title?: string;
    author?: string | null;
    category?: string | null;
    publisher?: string | null;
    isbn?: string | null;
    shelfLocation?: string | null;
    totalCopies?: number;
    availableCopies?: number;
  };
}) {
  const [state, formAction] = useActionState(saveLibraryBookAction, initialActionFormState);
  const formId = defaultValues?.id ?? "new";

  return (
    <form action={formAction} className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
      <input type="hidden" name="id" value={defaultValues?.id ?? ""} />
      <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <div className="grid gap-2">
          <FormField label="Accession no." htmlFor={`book-accession-${formId}`}>
            <Input
              id={`book-accession-${formId}`}
              name="accessionNumber"
              defaultValue={defaultValues?.accessionNumber ?? ""}
              placeholder="LIB-001"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.accessionNumber} />
        </div>
        <div className="grid gap-2">
          <FormField label="Book title" htmlFor={`book-title-${formId}`}>
            <Input
              id={`book-title-${formId}`}
              name="title"
              defaultValue={defaultValues?.title ?? ""}
              placeholder="Mathematics Reference Guide"
            />
          </FormField>
          <FieldError error={state.fieldErrors?.title} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FormField label="Author" htmlFor={`book-author-${formId}`}>
          <Input id={`book-author-${formId}`} name="author" defaultValue={defaultValues?.author ?? ""} />
        </FormField>
        <FormField label="Category" htmlFor={`book-category-${formId}`}>
          <Input id={`book-category-${formId}`} name="category" defaultValue={defaultValues?.category ?? ""} placeholder="Reference" />
        </FormField>
        <FormField label="Shelf" htmlFor={`book-shelf-${formId}`}>
          <Input id={`book-shelf-${formId}`} name="shelfLocation" defaultValue={defaultValues?.shelfLocation ?? ""} placeholder="A-2" />
        </FormField>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <FormField label="Publisher" htmlFor={`book-publisher-${formId}`}>
          <Input id={`book-publisher-${formId}`} name="publisher" defaultValue={defaultValues?.publisher ?? ""} />
        </FormField>
        <FormField label="ISBN" htmlFor={`book-isbn-${formId}`}>
          <Input id={`book-isbn-${formId}`} name="isbn" defaultValue={defaultValues?.isbn ?? ""} />
        </FormField>
        <div className="grid gap-2">
          <FormField label="Total copies" htmlFor={`book-total-${formId}`}>
            <Input id={`book-total-${formId}`} name="totalCopies" type="number" min="1" defaultValue={defaultValues?.totalCopies ?? 1} />
          </FormField>
          <FieldError error={state.fieldErrors?.totalCopies} />
        </div>
        <div className="grid gap-2">
          <FormField label="Available" htmlFor={`book-available-${formId}`}>
            <Input id={`book-available-${formId}`} name="availableCopies" type="number" min="0" defaultValue={defaultValues?.availableCopies ?? defaultValues?.totalCopies ?? 1} />
          </FormField>
          <FieldError error={state.fieldErrors?.availableCopies} />
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving book...">
          {defaultValues?.id ? "Update book" : "Add book"}
        </SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function LibraryIssueForm({
  books,
  students,
  staff
}: {
  books: BookOption[];
  students: BorrowerOption[];
  staff: BorrowerOption[];
}) {
  const [state, formAction] = useActionState(issueLibraryBookAction, initialActionFormState);
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10);

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="Book" htmlFor="issue-book">
            <Select id="issue-book" name="bookId">
              <option value="">Select available book</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} ({book.accessionNumber}) - {book.availableCopies} left
                </option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.bookId} />
        </div>
        <div className="grid gap-2">
          <FormField label="Borrower type" htmlFor="borrower-type">
            <Select id="borrower-type" name="borrowerType" defaultValue="STUDENT">
              <option value="STUDENT">Student</option>
              <option value="STAFF">Staff</option>
              <option value="OTHER">Other</option>
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.borrowerType} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-2">
          <FormField label="Student borrower" htmlFor="issue-student">
            <Select id="issue-student" name="studentId">
              <option value="">No student selected</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.meta ? `- ${student.meta}` : ""}
                </option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.studentId} />
        </div>
        <div className="grid gap-2">
          <FormField label="Staff borrower" htmlFor="issue-staff">
            <Select id="issue-staff" name="staffId">
              <option value="">No staff selected</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.meta ? `- ${member.meta}` : ""}
                </option>
              ))}
            </Select>
          </FormField>
          <FieldError error={state.fieldErrors?.staffId} />
        </div>
        <div className="grid gap-2">
          <FormField label="Other borrower" htmlFor="issue-other">
            <Input id="issue-other" name="borrowerName" placeholder="External borrower name" />
          </FormField>
          <FieldError error={state.fieldErrors?.borrowerName} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          <FormField label="Issue date" htmlFor="issue-date">
            <Input id="issue-date" name="issueDate" type="date" defaultValue={today} />
          </FormField>
          <FieldError error={state.fieldErrors?.issueDate} />
        </div>
        <div className="grid gap-2">
          <FormField label="Due date" htmlFor="due-date">
            <Input id="due-date" name="dueDate" type="date" defaultValue={due} />
          </FormField>
          <FieldError error={state.fieldErrors?.dueDate} />
        </div>
      </div>

      <FormField label="Remarks" htmlFor="issue-remarks">
        <Textarea id="issue-remarks" name="remarks" className="min-h-[90px]" />
      </FormField>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Issuing book...">Issue book</SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}

export function LibraryReturnForm({ issueId }: { issueId: string }) {
  const [state, formAction] = useActionState(returnLibraryBookAction, initialActionFormState);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="issueId" value={issueId} />
      <div className="grid gap-2">
        <FormField label="Fine amount" htmlFor={`fine-${issueId}`}>
          <Input id={`fine-${issueId}`} name="fineAmount" type="number" min="0" step="0.01" defaultValue="0" />
        </FormField>
        <FieldError error={state.fieldErrors?.fineAmount} />
      </div>
      <FormField label="Return remarks" htmlFor={`return-remarks-${issueId}`}>
        <Textarea id={`return-remarks-${issueId}`} name="remarks" className="min-h-[90px]" />
      </FormField>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Recording return...">Record return</SubmitButton>
      </div>
      <FormStateMessage state={state} />
    </form>
  );
}
