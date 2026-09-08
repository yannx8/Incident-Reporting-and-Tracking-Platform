import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.organizationInvitation.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.site.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: { name: 'E2E Corp', slug: 'e2e-corp' },
  });

  const passwordHash = await bcrypt.hash('e2e-password-123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@e2e.com',
      displayName: 'E2E Admin',
      passwordHash,
      memberships: {
        create: { organizationId: org.id, role: 'ADMINISTRATOR', isActive: true },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: 'reporter@e2e.com',
      displayName: 'E2E Reporter',
      passwordHash,
      memberships: {
        create: { organizationId: org.id, role: 'USER', isActive: true },
      },
    },
  });

  const responsable = await prisma.user.create({
    data: {
      email: 'responsable@e2e.com',
      displayName: 'E2E Responsable',
      passwordHash,
      memberships: {
        create: { organizationId: org.id, role: 'RESPONSABLE', isActive: true },
      },
    },
  });

  const site = await prisma.site.create({
    data: {
      name: 'E2E Main Site',
      organizationId: org.id,
      address: '1 E2E Street',
      isActive: true,
    },
  });

  const profile = await prisma.responsableProfile.create({
    data: {
      userId: responsable.id,
      organizationId: org.id,
      title: 'Responsable',
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

  const incident = await prisma.incident.create({
    data: {
      organizationId: org.id,
      siteId: site.id,
      reporterId: admin.id,
      status: 'NEW',
      severity: 'HIGH',
      title: 'Broken elevator in main lobby',
      description: 'The elevator on the ground floor is not working.',
      category: 'MAINTENANCE',
      originalTitle: 'Broken elevator in main lobby',
      originalDescription: 'The elevator on the ground floor is not working.',
      originalCategory: 'MAINTENANCE',
      originalSeverity: 'HIGH',
      originalReportedAt: new Date(),
    },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: org.id,
      incidentId: incident.id,
      actorId: admin.id,
      eventType: 'INCIDENT_CREATED',
      metadata: { title: incident.title },
    },
  });

  await prisma.organizationInvitation.create({
    data: {
      organizationId: org.id,
      code: 'E2E-JOIN-CODE',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('E2E seed completed.');
  console.log('Admin:      admin@e2e.com / e2e-password-123');
  console.log('Reporter:   reporter@e2e.com / e2e-password-123');
  console.log('Responsable: responsable@e2e.com / e2e-password-123');
  console.log('Join code:  E2E-JOIN-CODE');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());