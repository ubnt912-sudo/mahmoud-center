/* eslint-disable no-console */
// إنشاء مدير النظام الأولي. لإضافة بيانات تجريبية: SEED_DEMO=true npm run db:seed
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mahmoudcenter.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026';

async function seedAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    // لا نعيد كتابة كلمة المرور إذا غيّرها المدير بعد أول تشغيل
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN', isActive: true } });
    console.log(`✓ المدير موجود مسبقاً: ${ADMIN_EMAIL}`);
    return;
  }
  await prisma.user.create({
    data: {
      name: 'محمود',
      email: ADMIN_EMAIL,
      password: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: 'ADMIN',
    },
  });
  console.log(`✓ تم إنشاء المدير: ${ADMIN_EMAIL}`);
}

async function seedDemo() {
  if ((await prisma.product.count()) > 0) {
    console.log('• توجد بيانات مسبقاً — تخطي البيانات التجريبية');
    return;
  }
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  const day = 86400000;

  const products = [
    { sku: 'IP15-128', name: 'iPhone 15 128GB', category: 'NEW_PHONE', brand: 'Apple', model: 'iPhone 15', costPrice: 1050000, sellPrice: 1150000, oldPrice: 1200000, stock: 4, minStock: 2, isOffer: true },
    { sku: 'SA54-256', name: 'Samsung Galaxy A54 256GB', category: 'NEW_PHONE', brand: 'Samsung', model: 'A54', costPrice: 420000, sellPrice: 475000, stock: 6, minStock: 2 },
    { sku: 'IP12-USED', name: 'iPhone 12 مستعمل نظيف', category: 'USED_PHONE', brand: 'Apple', model: 'iPhone 12', costPrice: 380000, sellPrice: 440000, stock: 2, minStock: 1 },
    { sku: 'APP-PRO2', name: 'AirPods Pro 2', category: 'EARBUDS', brand: 'Apple', model: 'Pro 2', costPrice: 230000, sellPrice: 275000, stock: 3, minStock: 3 },
    { sku: 'CHG-20W', name: 'شاحن سريع 20W', category: 'CHARGER', brand: 'Anker', costPrice: 9000, sellPrice: 15000, stock: 40, minStock: 10 },
    { sku: 'CBL-USBC', name: 'كيبل USB-C إلى Lightning', category: 'CHARGER', brand: 'Baseus', costPrice: 4000, sellPrice: 8000, stock: 8, minStock: 10 },
    { sku: 'CASE-IP15', name: 'كفر iPhone 15 شفاف', category: 'ACCESSORY', costPrice: 2500, sellPrice: 7000, stock: 25, minStock: 8 },
    { sku: 'SCR-IP13', name: 'شاشة iPhone 13 أصلية', category: 'PARTS', brand: 'Apple', costPrice: 85000, sellPrice: 120000, stock: 2, minStock: 2 },
  ];
  const created = [];
  for (const p of products) {
    const prod = await prisma.product.create({ data: { ...p, images: [] } });
    await prisma.inventoryTransaction.create({
      data: { productId: prod.id, type: 'IN', quantity: p.stock, balanceAfter: p.stock, reason: 'رصيد افتتاحي', userId: admin.id },
    });
    created.push(prod);
  }

  const ali = await prisma.customer.create({ data: { name: 'علي حسين', phone: '9647701234567', address: 'بغداد - الكرادة' } });
  const sara = await prisma.customer.create({ data: { name: 'سارة محمد', phone: '9647809876543' } });

  await prisma.repair.create({
    data: {
      customerId: ali.id,
      deviceCompany: 'Apple',
      deviceModel: 'iPhone 13',
      imei: '356789104512345',
      issue: 'الشاشة مكسورة واللمس لا يعمل',
      techNotes: 'تحتاج شاشة أصلية',
      cost: 120000,
      paid: 50000,
      status: 'REPAIRING',
      expectedDate: new Date(Date.now() + 2 * day),
      timeline: {
        create: [
          { status: 'RECEIVED', note: 'تم استلام الجهاز', userId: admin.id, createdAt: new Date(Date.now() - 2 * day) },
          { status: 'INSPECTING', userId: admin.id, createdAt: new Date(Date.now() - 1.5 * day) },
          { status: 'REPAIRING', note: 'وافق الزبون على السعر', userId: admin.id, createdAt: new Date(Date.now() - day) },
        ],
      },
    },
  });

  await prisma.internetSubscription.create({
    data: {
      customerId: ali.id,
      type: 'FTTH',
      planName: 'فايبر 50 ميجا',
      speed: '50 Mbps',
      price: 35000,
      paid: 35000,
      startDate: new Date(Date.now() - 27 * day),
      endDate: new Date(Date.now() + 3 * day),
      status: 'EXPIRING_SOON',
    },
  });
  await prisma.internetSubscription.create({
    data: {
      customerId: sara.id,
      type: 'WIRELESS',
      planName: 'لاسلكي 20 ميجا',
      speed: '20 Mbps',
      price: 25000,
      paid: 25000,
      startDate: new Date(Date.now() - 5 * day),
      endDate: new Date(Date.now() + 25 * day),
    },
  });

  await prisma.message.create({ data: { customerId: ali.id, type: 'REPAIR', content: 'متى يكون الجهاز جاهزاً؟' } });
  await prisma.feedback.create({ data: { customerId: sara.id, rating: 'EXCELLENT', comment: 'خدمة سريعة' } });
  console.log('✓ تمت إضافة بيانات تجريبية');
}

async function main() {
  await seedAdmin();
  if (String(process.env.SEED_DEMO).toLowerCase() === 'true') await seedDemo();
}

main()
  .catch((e) => {
    console.error('✗ فشل الـSeed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
