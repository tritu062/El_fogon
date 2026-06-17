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

  // 3.1 Crear y vincular otros usuarios de desarrollo (Mesero, Cocinero, Cajero)
  const additionalUsers = [
    {
      email: 'waiter@elfogon.com',
      password: 'Waiter123!',
      firstName: 'Mesero',
      lastName: 'El Fogón',
      roleName: 'MESERO'
    },
    {
      email: 'chef@elfogon.com',
      password: 'Chef123!',
      firstName: 'Cocinero',
      lastName: 'El Fogón',
      roleName: 'COCINERO'
    },
    {
      email: 'cashier@elfogon.com',
      password: 'Cashier123!',
      firstName: 'Cajero',
      lastName: 'El Fogón',
      roleName: 'CAJERO'
    }
  ];

  for (const userInfo of additionalUsers) {
    const hashedUserPassword = bcrypt.hashSync(userInfo.password, 10);
    const dbUser = await prisma.user.upsert({
      where: { email: userInfo.email },
      update: {
        password: hashedUserPassword,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        isActive: true
      },
      create: {
        email: userInfo.email,
        password: hashedUserPassword,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        isActive: true
      }
    });

    console.log(`✅ Usuario ${userInfo.roleName} procesado: ${userInfo.email}`);

    const role = dbRoles[userInfo.roleName];
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: dbUser.id,
          roleId: role.id
        }
      },
      update: {},
      create: {
        userId: dbUser.id,
        roleId: role.id
      }
    });

    console.log(`✅ Rol ${userInfo.roleName} asignado con éxito a ${userInfo.email}`);
  }

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

  // 6. Crear Categorías por defecto (Fase 7)
  const categoriesToSeed = [
    { name: 'Corrientes', description: 'Platos tradicionales y económicos del día' },
    { name: 'Ejecutivos', description: 'Menús de almuerzo ejecutivo con entrada, fuerte y bebida' },
    { name: 'Especiales', description: 'Platos premium de la casa, carnes a la parrilla y especialidades' }
  ];

  const dbCategories = {};
  for (const catInfo of categoriesToSeed) {
    const dbCat = await prisma.category.upsert({
      where: { name: catInfo.name },
      update: { description: catInfo.description, deletedAt: null },
      create: { name: catInfo.name, description: catInfo.description }
    });
    dbCategories[catInfo.name] = dbCat;
  }
  console.log('✅ Categorías procesadas');

  // 7. Crear Platos/Bebidas (Items) de ejemplo (Fase 7)
  const itemsToSeed = [
    {
      name: 'Sopa del Día',
      description: 'Tradicional sopa casera acompañada de pan o arepa',
      price: 650,
      imageUrl: 'https://images.unsplash.com/photo-1547592165-e1d17f97a15c?w=500',
      isAvailable: true,
      categoryId: dbCategories['Corrientes'].id,
      modifiers: [
        { name: 'Acompañamiento', options: ['Pan', 'Arepa'] }
      ]
    },
    {
      name: 'Arroz con Pollo Corriente',
      description: 'Clásico arroz con pollo desmechado y verduras, servido con papas fritas',
      price: 900,
      imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500',
      isAvailable: true,
      categoryId: dbCategories['Corrientes'].id,
      modifiers: [
        { name: 'Bebida', options: ['Limonada', 'Té frío', 'Gaseosa'] }
      ]
    },
    {
      name: 'Almuerzo Ejecutivo de Res',
      description: 'Filete de res asado a la plancha, servido con arroz, ensalada, principio del día y bebida',
      price: 1200,
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
      isAvailable: true,
      categoryId: dbCategories['Ejecutivos'].id,
      modifiers: [
        { name: 'Término de la carne', options: ['3/4', 'Bien cocido', 'Término medio'] },
        { name: 'Bebida', options: ['Jugo de Mora', 'Jugo de Mango', 'Agua'] }
      ]
    },
    {
      name: 'Almuerzo Ejecutivo de Pollo',
      description: 'Pechuga de pollo cocinada a tu elección, servido con arroz, ensalada, principio del día y bebida',
      price: 1150,
      imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500',
      isAvailable: true,
      categoryId: dbCategories['Ejecutivos'].id,
      modifiers: [
        { name: 'Preparación', options: ['A la plancha', 'Frito', 'Apanado'] },
        { name: 'Bebida', options: ['Jugo de Mora', 'Jugo de Mango', 'Agua'] }
      ]
    },
    {
      name: 'Bandeja Paisa Fogonera',
      description: 'Típico plato colombiano con frijol, arroz, carne molida, chicharrón crujiente, huevo frito, arepa, chorizo y tajada de maduro',
      price: 1800,
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500',
      isAvailable: true,
      categoryId: dbCategories['Especiales'].id,
      modifiers: [
        { name: 'Huevo', options: ['Frito', 'Revuelto'] }
      ]
    },
    {
      name: 'Parrillada El Fogón (2 pers)',
      description: 'Combinación premium de carne de res, pechuga de pollo, lomo de cerdo, chorizo, papas saladas, arepas y chimichurri',
      price: 3500,
      imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500',
      isAvailable: true,
      categoryId: dbCategories['Especiales'].id,
      modifiers: [
        { name: 'Término de la carne', options: ['3/4', 'Bien cocido', 'Término medio'] }
      ]
    }
  ];

  for (const itemInfo of itemsToSeed) {
    const existingItem = await prisma.item.findFirst({
      where: { name: itemInfo.name, categoryId: itemInfo.categoryId, deletedAt: null }
    });

    if (existingItem) {
      await prisma.item.update({
        where: { id: existingItem.id },
        data: {
          description: itemInfo.description,
          price: itemInfo.price,
          imageUrl: itemInfo.imageUrl,
          isAvailable: itemInfo.isAvailable,
          modifiers: itemInfo.modifiers
        }
      });
    } else {
      await prisma.item.create({
        data: itemInfo
      });
    }
  }
  console.log('✅ Platos y bebidas de ejemplo procesados');

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
