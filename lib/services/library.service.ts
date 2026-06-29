import { LibraryIssueStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type LibraryPageDataParams = {
  schoolId: string;
  query?: string;
  category?: string;
  availability?: string;
};

type SaveLibraryBookInput = {
  schoolId: string;
  id?: string;
  accessionNumber: string;
  title: string;
  author?: string;
  category?: string;
  publisher?: string;
  isbn?: string;
  shelfLocation?: string;
  totalCopies: number;
  availableCopies: number;
};

type IssueLibraryBookInput = {
  schoolId: string;
  bookId: string;
  borrowerType: "STUDENT" | "STAFF" | "OTHER";
  studentId?: string;
  staffId?: string;
  borrowerName?: string;
  issueDate: string;
  dueDate: string;
  remarks?: string;
};

type ReturnLibraryBookInput = {
  schoolId: string;
  issueId: string;
  fineAmount?: number | string;
  remarks?: string;
};

export async function getLibraryPageData({
  schoolId,
  query = "",
  category = "",
  availability = ""
}: LibraryPageDataParams) {
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  const [books, allBooks, activeIssues, recentIssues, students, staff] = await Promise.all([
    db.libraryBook.findMany({
      where: {
        schoolId,
        isArchived: false,
        ...(category ? { category } : {}),
        ...(availability === "available" ? { availableCopies: { gt: 0 } } : {}),
        ...(availability === "unavailable" ? { availableCopies: 0 } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { accessionNumber: { contains: query, mode: "insensitive" } },
                { author: { contains: query, mode: "insensitive" } },
                { category: { contains: query, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        issues: {
          where: { status: LibraryIssueStatus.ISSUED },
          take: 1
        }
      },
      orderBy: [{ title: "asc" }]
    }),
    db.libraryBook.findMany({
      where: { schoolId, isArchived: false },
      select: { category: true, totalCopies: true, availableCopies: true }
    }),
    db.libraryIssue.findMany({
      where: { schoolId, status: LibraryIssueStatus.ISSUED },
      include: { book: true },
      orderBy: [{ dueDate: "asc" }]
    }),
    db.libraryIssue.findMany({
      where: { schoolId },
      include: { book: true },
      orderBy: [{ createdAt: "desc" }],
      take: 12
    }),
    db.student.findMany({
      where: { schoolId, status: { not: "ARCHIVED" } },
      include: { class: true, section: true },
      orderBy: [{ fullName: "asc" }]
    }),
    db.staff.findMany({
      where: { schoolId, isArchived: false },
      orderBy: [{ fullName: "asc" }]
    })
  ]);

  const categories = Array.from(
    new Set(allBooks.map((item) => item.category).filter((value): value is string => Boolean(value)))
  ).sort((a, b) => a.localeCompare(b));
  const totalCopies = allBooks.reduce((sum, book) => sum + book.totalCopies, 0);
  const availableCopies = allBooks.reduce((sum, book) => sum + book.availableCopies, 0);
  const overdueIssues = activeIssues.filter((issue) => issue.dueDate < todayEnd);
  const totalFine = recentIssues.reduce((sum, issue) => sum + Number(issue.fineAmount), 0);

  return {
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
  };
}

export async function saveLibraryBook(input: SaveLibraryBookInput) {
  if (input.id) {
    const existing = await db.libraryBook.findFirst({
      where: { id: input.id, schoolId: input.schoolId },
      select: { id: true }
    });

    if (!existing) {
      throw new Error("Book not found.");
    }

    return db.libraryBook.update({
      where: { id: existing.id },
      data: {
        accessionNumber: input.accessionNumber,
        title: input.title,
        author: input.author || null,
        category: input.category || null,
        publisher: input.publisher || null,
        isbn: input.isbn || null,
        shelfLocation: input.shelfLocation || null,
        totalCopies: input.totalCopies,
        availableCopies: input.availableCopies,
        isArchived: false,
        archivedAt: null
      }
    });
  }

  return db.libraryBook.create({
    data: {
      schoolId: input.schoolId,
      accessionNumber: input.accessionNumber,
      title: input.title,
      author: input.author || null,
      category: input.category || null,
      publisher: input.publisher || null,
      isbn: input.isbn || null,
      shelfLocation: input.shelfLocation || null,
      totalCopies: input.totalCopies,
      availableCopies: input.availableCopies
    }
  });
}

export async function archiveLibraryBook({ schoolId, bookId }: { schoolId: string; bookId: string }) {
  const activeIssues = await db.libraryIssue.count({
    where: { schoolId, bookId, status: LibraryIssueStatus.ISSUED }
  });

  if (activeIssues > 0) {
    throw new Error("Book cannot be archived while active issues exist.");
  }

  const book = await db.libraryBook.findFirst({
    where: { id: bookId, schoolId },
    select: { id: true }
  });

  if (!book) {
    throw new Error("Book not found.");
  }

  return db.libraryBook.update({
    where: { id: book.id },
    data: { isArchived: true, archivedAt: new Date() }
  });
}

export async function issueLibraryBook(input: IssueLibraryBookInput) {
  return db.$transaction(async (tx) => {
    const book = await tx.libraryBook.findFirst({
      where: { id: input.bookId, schoolId: input.schoolId, isArchived: false }
    });

    if (!book) {
      throw new Error("Book not found.");
    }

    if (book.availableCopies < 1) {
      throw new Error("No available copy is left for this book.");
    }

    let borrowerName = input.borrowerName?.trim() ?? "";
    if (input.borrowerType === "STUDENT") {
      const student = await tx.student.findFirst({
        where: { id: input.studentId, schoolId: input.schoolId },
        select: { fullName: true }
      });
      if (!student) throw new Error("Student borrower not found.");
      borrowerName = student.fullName;
    }

    if (input.borrowerType === "STAFF") {
      const staff = await tx.staff.findFirst({
        where: { id: input.staffId, schoolId: input.schoolId },
        select: { fullName: true }
      });
      if (!staff) throw new Error("Staff borrower not found.");
      borrowerName = staff.fullName;
    }

    await tx.libraryBook.update({
      where: { id: book.id },
      data: { availableCopies: { decrement: 1 } }
    });

    return tx.libraryIssue.create({
      data: {
        schoolId: input.schoolId,
        bookId: book.id,
        studentId: input.borrowerType === "STUDENT" ? input.studentId : null,
        staffId: input.borrowerType === "STAFF" ? input.staffId : null,
        borrowerName,
        borrowerType: input.borrowerType,
        issueDate: new Date(`${input.issueDate}T00:00:00.000Z`),
        dueDate: new Date(`${input.dueDate}T23:59:59.999Z`),
        remarks: input.remarks || null
      }
    });
  });
}

export async function returnLibraryBook(input: ReturnLibraryBookInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.libraryIssue.findFirst({
      where: { id: input.issueId, schoolId: input.schoolId, status: LibraryIssueStatus.ISSUED },
      include: { book: true }
    });

    if (!existing) {
      throw new Error("Active issue record not found.");
    }

    await tx.libraryBook.update({
      where: { id: existing.bookId },
      data: { availableCopies: { increment: 1 } }
    });

    return tx.libraryIssue.update({
      where: { id: existing.id },
      data: {
        status: LibraryIssueStatus.RETURNED,
        returnedAt: new Date(),
        fineAmount:
          input.fineAmount === undefined || input.fineAmount === ""
            ? new Prisma.Decimal(0)
            : new Prisma.Decimal(input.fineAmount),
        remarks: input.remarks || existing.remarks
      }
    });
  });
}
