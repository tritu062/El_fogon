const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra (seeding) de la base de datos...');

  // 1. Roles iniciales del restaurante
  const roles = [
    { name: 'ADMINISTRADOR', description: 'Acceso total al sistema, reportes y configuraciones generales' },
    { name: 'MESERO', description: 'Apertura de mesas, toma de pedidos y visualización de comandas' },
    { name: 'COCINERO', description: 'Recepción, preparación y despacho de comandas en cocina' },
    { name: 'CAJERO', description: 'Cobro de cuentas, facturación, y control de ingresos' }
  ];

  const dbRoles = {};

  for (const roleInfo of roles) {
    const dbRole = await prisma.role.upsert({
      where: { name: roleInfo.name },
      update: { description: roleInfo.description },
      create: {
        name: roleInfo.name,
        description: roleInfo.description
      }
    });
    dbRoles[roleInfo.name] = dbRole;
    console.log(`✅ Rol procesado: ${roleInfo.name}`);
  }

  // 2. Administrador inicial por defecto para el sistema
  const adminEmail = 'admin@elfogon.com';
  const adminPassword = 'Admin123!'; // Contraseña temporal de desarrollo
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'El Fogón',
      isActive: true
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'El Fogón',
      isActive: true
    }
  });

  console.log(`✅ Usuario administrador procesado: ${adminEmail}`);

  // 3. Vincular el Administrador con su Rol correspondiente
  const adminRole = dbRoles['ADMINISTRADOR'];
  
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id
      }
    },
    update: {}, // Si ya existe la relación, no cambiamos nada
    create: {
      userId: adminUser.id,
      roleId: adminRole.id
    }
  });

  console.log(`✅ Rol ADMINISTRADOR asignado con éxito a ${adminEmail}`);

  // 4. Crear Zonas por defecto (Fase 6: Salón Principal)
  const zoneName = 'Salón Principal';
  const salonPrincipal = await prisma.zone.upsert({
    where: { name: zoneName },
    update: { deletedAt: null },
    create: {
      name: zoneName,
      description: 'Área del comedor principal del restaurante'
    }
  });
  console.log(`✅ Zona procesada: ${zoneName}`);

  // 5. Crear Mesas de ejemplo (Mesas 1 a 10, todas libres y asignadas al Salón Principal)
  const numMesas = 10;
  for (let i = 1; i <= numMesas; i++) {
    await prisma.table.upsert({
      where: { number: i },
      update: {
        zoneId: salonPrincipal.id,
        deletedAt: null
      },
      create: {
        number: i,
        status: 'FREE',
        zoneId: salonPrincipal.id
      }
    });
  }
  console.log(`✅ Mesas creadas/procesadas: Mesas 1 a ${numMesas} en ${zoneName}`);

  console.log('🌱 Proceso de siembra completado con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la siembra de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Desconectar cliente de base de datos
    await prisma.$disconnect();
  });
