import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'admin123';

async function main() {
  // Wipe in FK-safe order: children before parents.
  await prisma.auditEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.progressUpdate.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.responsableSpecialty.deleteMany();
  await prisma.responsableSite.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.responsableProfile.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.organizationInvitation.deleteMany();
  await prisma.site.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: { name: 'Acme Corp', slug: 'acme-corp' },
  });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      displayName: 'Admin User',
      passwordHash,
      memberships: {
        create: { organizationId: org.id, role: 'ADMINISTRATOR', isActive: true },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: 'reporter@acme.com',
      displayName: 'Jane Reporter',
      passwordHash,
      memberships: {
        create: { organizationId: org.id, role: 'USER', isActive: true },
      },
    },
  });

  const responsable = await prisma.user.create({
    data: {
      email: 'responsable@acme.com',
      displayName: 'Alex Responsable',
      passwordHash,
      memberships: {
        create: { organizationId: org.id, role: 'RESPONSABLE', isActive: true },
      },
    },
  });

  const site = await prisma.site.create({
    data: { name: 'Main HQ', organizationId: org.id, address: '123 Acme Way' },
  });

  const profile = await prisma.responsableProfile.create({
    data: {
      userId: responsable.id,
      organizationId: org.id,
      title: 'Maintenance Responsable',
      phone: '+1 555 0100',
    },
  });

  await prisma.responsableSite.create({
    data: {
      responsableProfileId: profile.id,
      siteId: site.id,
      organizationId: org.id,
      isActive: true,
    },
  });

  await prisma.organizationInvitation.create({
    data: {
      organizationId: org.id,
      code: 'TEST-JOIN-CODE',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Seed completed successfully!');
  console.log('Organization: Acme Corp (site: Main HQ)');
  console.log(`Admin:       admin@acme.com / ${PASSWORD}`);
  console.log(`Reporter:    reporter@acme.com / ${PASSWORD}`);
  console.log(`Responsable: responsable@acme.com / ${PASSWORD}`);
  console.log('New-user join code: TEST-JOIN-CODE');
}

main().catch(console.error).finally(() => prisma.$disconnect());