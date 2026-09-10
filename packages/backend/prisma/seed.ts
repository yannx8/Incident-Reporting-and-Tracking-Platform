import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const org = await prisma.organization.upsert({
    where: { slug: 'horizon' },
    update: {},
    create: { name: 'Horizon Immobilier', slug: 'horizon' }
  });
  console.log(`Organization: ${org.name} (${org.id})`);

  const adminEmail = 'admin@horizon.com';
  const adminPassword = 'AdminPass123!';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  let admin;

  if (existingAdmin) {
    admin = existingAdmin;
    console.log(`Admin already exists: ${admin.email} (${admin.id})`);
  } else {
    admin = await prisma.user.create({
      data: {
        name: 'Admin Nexus',
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        isVerified: true,
        memberships: {
          create: { organizationId: org.id, roles: ['ADMINISTRATOR'] }
        }
      }
    });
    console.log(`Admin created: ${admin.email} (${admin.id})`);
  }

  const siteCount = await prisma.site.count({ where: { organizationId: org.id } });
  if (siteCount === 0) {
    await prisma.site.createMany({
      data: [
        { organizationId: org.id, name: 'Siège Social', address: '123 Avenue de la Paix, Douala', latitude: 4.051, longitude: 9.768 },
        { organizationId: org.id, name: 'Entrepôt Port', address: 'Zone Portuaire, Douala', latitude: 4.048, longitude: 9.703 },
        { organizationId: org.id, name: 'Agence Akwa', address: 'Boulevard de la République, Douala', latitude: 4.045, longitude: 9.705 }
      ]
    });
    console.log('3 sites created');
  }

  console.log('\n--- Seed complete ---');
  console.log(`Admin login: ${adminEmail}`);
  console.log(`Password:     ${adminPassword}`);
  console.log(`Org slug:     horizon`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
