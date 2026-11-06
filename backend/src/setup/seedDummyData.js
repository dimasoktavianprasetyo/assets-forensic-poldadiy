require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.DATABASE);

const Admin = require('../models/coreModels/Admin');
const Client = require('../models/appModels/Client');
const Invoice = require('../models/appModels/Invoice');
const Payment = require('../models/appModels/Payment');

// Realistic Indonesian business names pool
const companyPrefixes = ['PT', 'CV', 'UD', 'Toko'];
const companyNames = [
  'Nusantara Solusindo', 'Sinar Abadi Gemilang', 'Maju Bersama Sentosa', 'Digital Kreatif Utama',
  'Teknologi Mega Global', 'Sumber Rejeki Abadi', 'Karya Mandiri Sejahtera', 'Inti Surya Semesta',
  'Prima Daya Nusantara', 'Lintas Samudera Logistik', 'Mitra Usaha Cemerlang', 'Wahana Cipta Kreasi',
  'Harapan Gemilang Mandiri', 'Sentra Informasi Digital', 'Garuda Sukses Sejati', 'Citra Medika Prima',
  'Mega Logistik Indonesia', 'Cemerlang Digital Asia', 'Aero Jasa Kargo', 'Bintang Sejahtera Makmur',
  'Tridaya Perkasa Solusi', 'Bumi Raya Konsultindo', 'Sukses Niaga Makmur', 'Panca Surya Pratama',
  'Graha Multi Teknologi', 'Pustaka Digital Indonesia', 'Bhakti Karya Persada', 'Samudera Artha Sentosa',
  'Kurnia Pangan Lestari', 'Jaya Pratama Retail', 'Bima Sakti Telematika', 'Cahaya Timur Niaga',
  'Duta Sarana Niaga', 'Era Digital Nusantara', 'Fajar Surya Utama', 'Global Solusi Integrasi',
  'Harmoni Alam Semesta', 'Inovasi Canggih Indonesia', 'Jaya Abadi Kencana', 'Kinarya Adhi Cipta',
  'Lestari Mandiri Perkasa', 'Multi Prima Distribusi', 'Nusantara Data Network', 'Optima Sistem Solusindo',
  'Pandawa Lima Media', 'Qirana Global Logistik', 'Reka Bentuk Kreatif', 'Sinergi Daya Rekatama',
  'Tri Mandiri Jaya', 'Utama Jaya Bersaudara', 'Visi Komputer Sentosa', 'Wira Karya Teknika',
  'Xquisite Boga Nusantara', 'Yasa Mitra Integrasi', 'Zenith Solusi Mandiri'
];

const cities = [
  { city: 'Jakarta Selatan', prov: 'DKI Jakarta', zip: '12190', phoneCode: '021' },
  { city: 'Jakarta Pusat', prov: 'DKI Jakarta', zip: '10110', phoneCode: '021' },
  { city: 'Jakarta Barat', prov: 'DKI Jakarta', zip: '11470', phoneCode: '021' },
  { city: 'Surabaya', prov: 'Jawa Timur', zip: '60271', phoneCode: '031' },
  { city: 'Bandung', prov: 'Jawa Barat', zip: '40115', phoneCode: '022' },
  { city: 'Medan', prov: 'Sumatera Utara', zip: '20111', phoneCode: '061' },
  { city: 'Semarang', prov: 'Jawa Tengah', zip: '50132', phoneCode: '024' },
  { city: 'Tangerang Selatan', prov: 'Banten', zip: '15321', phoneCode: '021' },
  { city: 'Bekasi', prov: 'Jawa Barat', zip: '17141', phoneCode: '021' },
  { city: 'Yogyakarta', prov: 'DI Yogyakarta', zip: '55224', phoneCode: '0274' },
  { city: 'Denpasar', prov: 'Bali', zip: '80232', phoneCode: '0361' },
  { city: 'Makassar', prov: 'Sulawesi Selatan', zip: '90111', phoneCode: '0411' },
  { city: 'Balikpapan', prov: 'Kalimantan Timur', zip: '76112', phoneCode: '0542' },
  { city: 'Malang', prov: 'Jawa Timur', zip: '65111', phoneCode: '0341' },
  { city: 'Palembang', prov: 'Sumatera Selatan', zip: '30129', phoneCode: '0711' }
];

const streets = [
  'Jl. Jend. Sudirman Kav. ', 'Jl. M.H. Thamrin No. ', 'Jl. Gatot Subroto No. ',
  'Jl. H.R. Rasuna Said Blok ', 'Jl. Asia Afrika No. ', 'Jl. Letjen S. Parman No. ',
  'Jl. Pemuda No. ', 'Jl. Raya Darmo No. ', 'Jl. Diponegoro No. ',
  'Jl. Malioboro No. ', 'Jl. Gajah Mada No. ', 'Jl. R.E. Martadinata No. ',
  'Jl. TB Simatupang Kav. ', 'Jl. Panglima Polim No. ', 'Jl. Boulevard Gading No. '
];

const itemCatalog = [
  { name: 'Pengembangan Aplikasi Web Custom', price: 1500, desc: 'Pengembangan modul backend REST API & frontend SPA responsive' },
  { name: 'Pengembangan Aplikasi Mobile iOS & Android', price: 2200, desc: 'Pembuatan aplikasi mobile cross-platform flutter' },
  { name: 'Layanan Cloud VPS & Managed Server', price: 250, desc: 'Biaya langganan cloud server hosting, database cluster, & backup harian' },
  { name: 'Konsultasi IT Security & Vulnerability Assessment', price: 950, desc: 'Audit keamanan sistem informasi, penetration testing & hardening OS' },
  { name: 'Implementasi & Kustomisasi ERP IDURAR', price: 1800, desc: 'Setup sistem akuntansi, CRM, invoicing & pelatihan staff' },
  { name: 'SLA Maintenance & Technical Support', price: 350, desc: 'Layanan perbaikan bug, monitoring uptime 99.9%, dan support priority' },
  { name: 'Desain UI/UX & Design System', price: 800, desc: 'Desain user flow, wireframe, prototype interaktif Figma & aset grafis' },
  { name: 'Integrasi Payment Gateway & Open Finance', price: 650, desc: 'Integrasi QRIS, Virtual Account bank, dan automasi mutasi rekening' },
  { name: 'Optimasi Database & Cloud Migration', price: 750, desc: 'Migrasi database lokal ke cloud cluster dengan zero-downtime' },
  { name: 'Digital Marketing & SEO Campaign Optimization', price: 450, desc: 'Strategi optimasi kata kunci pencarian, backlink, & laporan bulanan' },
  { name: 'Pelatihan SDM Sistem Digital & DevOps', price: 500, desc: 'Workshop 2 hari implementasi CI/CD pipeline & containerization' },
  { name: 'Lisensi Software Enterprise & Lisensi Tahunan', price: 1200, desc: 'Perpanjangan lisensi piranti lunak komersial 1 tahun' }
];

const bankRefs = ['BCA-TRF-', 'MANDIRI-VA-', 'BNI-TRF-', 'BRI-VA-', 'PERMATA-TRF-', 'CIMB-VA-'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startYear = 2025, endYear = 2026) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 10, 7).getTime(); // Up to November 2026
  return new Date(start + Math.random() * (end - start));
}

function addDays(date, days) {
  const res = new Date(date);
  res.setDate(res.getDate() + days);
  return res;
}

async function seed() {
  try {
    console.log('🚀 Memulai proses pembuatan Data Dummy Realistis...');
    
    // 1. Ambil Admin
    let admin = await Admin.findOne();
    if (!admin) {
      console.log('⚠️ Akun Admin belum ada! Menjalankan setup akun default...');
      const AdminPassword = require('../models/coreModels/AdminPassword');
      const { generate: uniqueId } = require('shortid');
      const salt = uniqueId();
      const newAdminPassword = new AdminPassword();
      const passwordHash = newAdminPassword.generateHash(salt, 'admin123');
      admin = await new Admin({
        email: 'admin@admin.com',
        name: 'IDURAR',
        surname: 'Admin',
        enabled: true,
        role: 'owner',
      }).save();
      await new AdminPassword({
        password: passwordHash,
        emailVerified: true,
        salt: salt,
        user: admin._id,
      }).save();
    }
    const adminId = admin._id;

    // 2. Buat 1.000 Klien Indonesia
    console.log('\n[1/3] 🏢 Sedang membuat 1.000 Data Klien (Perusahaan & UKM Indonesia)...');
    const clientDocs = [];
    const usedNames = new Set();

    for (let i = 1; i <= 1000; i++) {
      const prefix = randomChoice(companyPrefixes);
      const baseName = randomChoice(companyNames);
      const branchNum = i > companyNames.length ? ` Cabang ${randomNumber(1, 99)}` : '';
      let companyFullName = `${prefix} ${baseName}${branchNum}`;
      
      if (usedNames.has(companyFullName)) {
        companyFullName = `${prefix} ${baseName} ${randomNumber(100, 9999)}`;
      }
      usedNames.add(companyFullName);

      const loc = randomChoice(cities);
      const streetName = randomChoice(streets) + randomNumber(1, 199);
      const domainSlug = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const emailDomain = randomChoice(['co.id', 'id', 'com']);
      const emailUser = randomChoice(['procurement', 'finance', 'billing', 'contact', 'info', 'accounting']);
      const email = `${emailUser}@${domainSlug}${randomNumber(1, 99)}.${emailDomain}`;
      const phone = `+62 ${randomNumber(811, 899)}-${randomNumber(1000, 9999)}-${randomNumber(1000, 9999)}`;

      const createdAt = randomDate(2025, 2026);

      clientDocs.push({
        name: companyFullName,
        phone: phone,
        country: 'Indonesia',
        address: `${streetName}, ${loc.city}, ${loc.prov} ${loc.zip}`,
        email: email,
        createdBy: adminId,
        assigned: adminId,
        enabled: true,
        removed: false,
        created: createdAt,
        updated: createdAt,
      });
    }

    const insertedClients = await Client.insertMany(clientDocs);
    console.log(`✅ Berhasil menyimpan ${insertedClients.length} Klien ke MongoDB!`);

    // 3. Buat 2.500 Invoices
    console.log('\n[2/3] 📄 Sedang membuat 2.500 Invoices (Faktur Tagihan Realistis)...');
    const invoiceDocs = [];
    const now = new Date();

    for (let i = 1; i <= 2500; i++) {
      const client = randomChoice(insertedClients);
      const invDate = randomDate(2025, 2026);
      const invYear = invDate.getFullYear();
      const expiredDate = addDays(invDate, randomNumber(14, 30));

      // Pilih 1 - 4 line items
      const itemCount = randomNumber(1, 4);
      const selectedItems = [];
      let subTotal = 0;

      for (let j = 0; j < itemCount; j++) {
        const itemInfo = randomChoice(itemCatalog);
        const qty = randomNumber(1, 3);
        const total = itemInfo.price * qty;
        subTotal += total;

        selectedItems.push({
          itemName: itemInfo.name,
          description: itemInfo.desc,
          quantity: qty,
          price: itemInfo.price,
          total: total,
        });
      }

      // Pajak PPN 0% atau 11%
      const hasTax = Math.random() > 0.4;
      const taxRate = hasTax ? 0.11 : 0;
      const taxTotal = Math.round(subTotal * taxRate);
      const total = subTotal + taxTotal;

      // Status pembayaran
      // 65% paid, 10% partially, 20% unpaid/pending/sent, 5% draft
      const randStatus = Math.random();
      let paymentStatus = 'unpaid';
      let status = 'sent';
      let credit = 0;

      if (randStatus < 0.65) {
        paymentStatus = 'paid';
        status = 'sent';
        credit = total;
      } else if (randStatus < 0.75) {
        paymentStatus = 'partially';
        status = 'sent';
        credit = Math.round(total * randomNumber(30, 70) / 100);
      } else if (randStatus < 0.95) {
        paymentStatus = 'unpaid';
        status = randomChoice(['pending', 'sent']);
        credit = 0;
      } else {
        paymentStatus = 'unpaid';
        status = 'draft';
        credit = 0;
      }

      const isOverdue = expiredDate < now && paymentStatus !== 'paid';

      invoiceDocs.push({
        createdBy: adminId,
        number: i,
        year: invYear,
        recurring: randomChoice(['monthly', 'quarter', 'annually', undefined]),
        date: invDate,
        expiredDate: expiredDate,
        client: client._id,
        items: selectedItems,
        taxRate: taxRate,
        subTotal: subTotal,
        taxTotal: taxTotal,
        total: total,
        currency: 'USD',
        credit: credit,
        discount: 0,
        payment: [],
        paymentStatus: paymentStatus,
        isOverdue: isOverdue,
        approved: status !== 'draft',
        status: status,
        notes: `Pembayaran ditransfer ke rekening PT IDURAR ERP CORP. Jatuh tempo: ${expiredDate.toLocaleDateString('id-ID')}.`,
        created: invDate,
        updated: invDate,
      });
    }

    // Insert invoices in batches of 500
    const insertedInvoices = [];
    const batchSize = 500;
    for (let i = 0; i < invoiceDocs.length; i += batchSize) {
      const batch = invoiceDocs.slice(i, i + batchSize);
      const res = await Invoice.insertMany(batch);
      insertedInvoices.push(...res);
      process.stdout.write(`... ${insertedInvoices.length} invoices tersimpan\r`);
    }
    console.log(`\n✅ Berhasil menyimpan ${insertedInvoices.length} Invoices ke MongoDB!`);

    // 4. Buat 2.000 Payments dari Invoices yang Paid / Partially
    console.log('\n[3/3] 💳 Sedang membuat Riwayat Pembayaran (Payments)...');
    const paymentDocs = [];
    const invoiceUpdates = []; // to link back payment ID
    let paymentNumber = 1;

    for (const inv of insertedInvoices) {
      if (paymentDocs.length >= 2000) break;

      if (inv.paymentStatus === 'paid' || inv.paymentStatus === 'partially') {
        const payDate = addDays(inv.date, randomNumber(1, 14));
        const payAmount = inv.credit;
        const bank = randomChoice(bankRefs);
        const refNo = `${bank}${randomNumber(10000000, 99999999)}`;

        paymentDocs.push({
          createdBy: adminId,
          number: paymentNumber++,
          client: inv.client._id || inv.client,
          invoice: inv._id,
          date: payDate,
          amount: payAmount,
          currency: 'USD',
          ref: refNo,
          description: `Pembayaran Faktur #${inv.number} via ${refNo}`,
          created: payDate,
          updated: payDate,
        });

        invoiceUpdates.push({
          invoiceId: inv._id,
          paymentIndex: paymentDocs.length - 1
        });
      }
    }

    const insertedPayments = await Payment.insertMany(paymentDocs);
    console.log(`✅ Berhasil menyimpan ${insertedPayments.length} Pembayaran ke MongoDB!`);

    // Hubungkan kembali ID Payment ke masing-masing Invoice
    console.log('🔗 Menghubungkan ID Pembayaran ke Faktur Invoice...');
    const bulkInvoiceOps = invoiceUpdates.map((item) => ({
      updateOne: {
        filter: { _id: item.invoiceId },
        update: {
          $push: { payment: insertedPayments[item.paymentIndex]._id }
        }
      }
    }));

    if (bulkInvoiceOps.length > 0) {
      await Invoice.bulkWrite(bulkInvoiceOps);
    }
    console.log('✅ Relasi Payment -> Invoice selesai dihubungkan!');

    console.log('\n🎉 ================================================ 🎉');
    console.log('     SEMUA DATA DUMMY REALISTIS BERHASIL DIBUAT!');
    console.log(`     - 🏢 Total Klien     : ${insertedClients.length}`);
    console.log(`     - 📄 Total Invoices  : ${insertedInvoices.length}`);
    console.log(`     - 💳 Total Payments  : ${insertedPayments.length}`);
    console.log('🎉 ================================================ 🎉\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Terjadi kesalahan saat seeding data:', err);
    process.exit(1);
  }
}

seed();

