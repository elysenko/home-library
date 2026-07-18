// Seed contract (Colossus): every seeded demo credential MUST be printed as a
// `SEED_CRED <ROLE> <email> <password>` line (or a single SEED_CREDS_JSON line) —
// the deploy activity sync_seed_credentials parses stdout to populate
// deployments.appDemoCredentials. Keep these lines when extending this seed.
//
// Passwords are fixed & known (not derived) so they match the frontend's
// demo-account quick-fill (web/src/routes/Login.tsx). Re-asserted on every run.
import { PrismaClient, Role } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// The two accounts a reviewer signs in with — printed as SEED_CRED lines.
const DEMO_USERS: Array<{ email: string; name: string; role: Role; password: string }> = [
  { email: 'admin@library.local', name: 'Ada Keeper', role: Role.ADMIN, password: 'admin1234' },
  { email: 'reader@library.local', name: 'Jesse Reed', role: Role.USER, password: 'reader1234' },
];

// Extra household members (populate the admin roster; no login needed).
const EXTRA_USERS: Array<{ email: string; name: string; role: Role; password: string }> = [
  { email: 'mara@library.local', name: 'Mara Voss', role: Role.USER, password: 'mara1234' },
  { email: 'devon@library.local', name: 'Devon Cole', role: Role.USER, password: 'devon1234' },
];

const SEED_BOOKS = [
  { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', genre: 'Science Fiction', isbn: '978-0441478125', shelfLocation: 'A3' },
  { title: 'Braiding Sweetgrass', author: 'Robin Wall Kimmerer', genre: 'Nature', isbn: '978-1571313560', shelfLocation: 'C1' },
  { title: 'Piranesi', author: 'Susanna Clarke', genre: 'Fantasy', isbn: '978-1635575637', shelfLocation: 'A5' },
  { title: 'The Overstory', author: 'Richard Powers', genre: 'Literary Fiction', isbn: '978-0393635225', shelfLocation: 'B2' },
  { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', genre: 'Psychology', isbn: '978-0374533557', shelfLocation: 'D4' },
  { title: 'A Psalm for the Wild-Built', author: 'Becky Chambers', genre: 'Science Fiction', isbn: '978-1250236210', shelfLocation: 'A3' },
  { title: 'Klara and the Sun', author: 'Kazuo Ishiguro', genre: 'Literary Fiction', isbn: '978-0593318171', shelfLocation: 'B2' },
  { title: 'Entangled Life', author: 'Merlin Sheldrake', genre: 'Nature', isbn: '978-0525510314', shelfLocation: 'C1' },
];

// day offsets are relative to "now" so demo loan states stay realistic on any deploy date.
function daysFromNow(delta: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
}

const SEED_LOANS = [
  { bookTitle: 'Piranesi', borrowerName: 'Nora Ellison', ownerEmail: 'reader@library.local', dueDelta: -8, returnedDelta: null },
  { bookTitle: 'Thinking, Fast and Slow', borrowerName: 'Tom Bright', ownerEmail: 'reader@library.local', dueDelta: 7, returnedDelta: null },
  { bookTitle: 'The Left Hand of Darkness', borrowerName: 'Priya Anand', ownerEmail: 'reader@library.local', dueDelta: -12, returnedDelta: -14 },
  { bookTitle: 'Klara and the Sun', borrowerName: 'Leo Marsh', ownerEmail: 'mara@library.local', dueDelta: 12, returnedDelta: null },
  { bookTitle: 'The Overstory', borrowerName: 'Sam Okafor', ownerEmail: 'mara@library.local', dueDelta: -9, returnedDelta: null },
  { bookTitle: 'Entangled Life', borrowerName: 'Ivy Chen', ownerEmail: 'devon@library.local', dueDelta: 18, returnedDelta: null },
  { bookTitle: 'Braiding Sweetgrass', borrowerName: 'Jesse Reed', ownerEmail: 'devon@library.local', dueDelta: -16, returnedDelta: -18 },
];

async function upsertUser(u: { email: string; name: string; role: Role; password: string }) {
  const passwordHash = hashPassword(u.password);
  return prisma.user.upsert({
    where: { email: u.email },
    update: { name: u.name, role: u.role, password: passwordHash },
    create: { email: u.email, name: u.name, role: u.role, password: passwordHash },
  });
}

async function main(): Promise<void> {
  const creds: Array<{ role: string; email: string; password: string }> = [];
  for (const u of DEMO_USERS) {
    await upsertUser(u);
    console.log(`SEED_CRED ${u.role} ${u.email} ${u.password}`);
    creds.push({ role: u.role, email: u.email, password: u.password });
  }
  for (const u of EXTRA_USERS) {
    await upsertUser(u);
  }
  console.log(`SEED_CREDS_JSON ${JSON.stringify(creds)}`);

  // Books + loans: only seed when empty so redeploys stay idempotent and never duplicate.
  if ((await prisma.book.count()) === 0) {
    await prisma.book.createMany({ data: SEED_BOOKS });
  }
  if ((await prisma.loan.count()) === 0) {
    const books = await prisma.book.findMany();
    const users = await prisma.user.findMany();
    const bookByTitle = new Map(books.map((b) => [b.title, b.id]));
    const userByEmail = new Map(users.map((u) => [u.email, u.id]));
    for (const l of SEED_LOANS) {
      const bookId = bookByTitle.get(l.bookTitle);
      const userId = userByEmail.get(l.ownerEmail);
      if (bookId === undefined || userId === undefined) continue;
      await prisma.loan.create({
        data: {
          bookId,
          userId,
          borrowerName: l.borrowerName,
          dueDate: daysFromNow(l.dueDelta),
          status: l.returnedDelta === null ? 'lent' : 'returned',
          returnedAt: l.returnedDelta === null ? null : daysFromNow(l.returnedDelta),
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
