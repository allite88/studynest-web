// Creates a ToyyibPay bill for any plan type.
// Plan types: {subject}_papers, {subject}_bundle, core5, all_access,
//             collection_{contentId}, books_order
// Prices always read from Firestore — never trusted from client.
// Required env vars: TOYYIBPAY_SECRET, TOYYIBPAY_CATEGORY, SITE_URL,
//                    FIREBASE_SERVICE_ACCOUNT
// Optional: TOYYIBPAY_SANDBOX=true

const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    ),
  });
}

const CORE5 = ['BM','BI','Math','Sejarah','Sains'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { uid, email, name, plan, items, shipping } = body;
  if (!uid || !email || !plan)
    return { statusCode: 400, body: 'Missing uid / email / plan' };

  const db       = admin.firestore();
  const isSandbox = process.env.TOYYIBPAY_SANDBOX === 'true';
  const apiBase  = isSandbox ? 'https://dev.toyyibpay.com' : 'https://toyyibpay.com';
  const siteUrl  = (process.env.SITE_URL || '').replace(/\/$/, '');

  // ── Resolve amount & label from Firestore ─────────────────────────
  let amountSen = 0;
  let billLabel = '';
  let orderId   = null;

  if (plan === 'books_order') {
    // Verify each book price from Firestore
    if (!items?.length || !shipping)
      return { statusCode: 400, body: 'Missing items or shipping for books_order' };

    let total = 0;
    const verifiedItems = [];
    for (const item of items) {
      const snap = await db.doc(`content/${item.id}`).get();
      if (!snap.exists) continue;
      const price = snap.data().price || 0;
      const qty   = Math.max(1, parseInt(item.qty) || 1);
      total += price * qty;
      verifiedItems.push({ id: item.id, name: snap.data().title || item.name, price, qty });
    }
    amountSen = Math.round(total * 100);
    billLabel = `Allite Books`;

    // Create pending order in Firestore
    const orderRef = await db.collection('orders').add({
      uid, name: shipping.name, phone: shipping.phone,
      email, address: shipping.address, note: shipping.note || '',
      items: verifiedItems, total,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    orderId = orderRef.id;

  } else if (plan.startsWith('collection_')) {
    const contentId = plan.replace('collection_', '');
    const snap = await db.doc(`content/${contentId}`).get();
    if (!snap.exists) return { statusCode: 404, body: 'Content not found' };
    amountSen = Math.round((snap.data().price || 1.99) * 100);
    billLabel = `Allite Collection`;

  } else {
    // Subject / bundle / new plan types — read from config/pricing
    const pSnap = await db.doc('config/pricing').get();
    const pricing = pSnap.exists ? pSnap.data() : {};

    if (plan === 'all_access') {
      amountSen = pricing.allAccess || 14900;
      billLabel = 'Allite All Access';
    } else if (plan === 'core5') {
      amountSen = pricing.core5 || 6900;
      billLabel = 'Allite Core 5 Bundle';
    } else if (plan === 'trial_pass') {
      amountSen = pricing.trialPass || 1900;
      billLabel = 'Allite Trial Pass - 30 Days';
    } else if (plan === 'pro_yearly') {
      amountSen = pricing.proYearly || 12900;
      billLabel = 'Allite Pro Yearly';
    } else if (plan === 'premium_yearly') {
      amountSen = pricing.premiumYearly || 19900;
      billLabel = 'Allite Premium Yearly';
    } else if (plan === 'sejarah_sprint') {
      amountSen = pricing.serahSprint || pricing.sprints?.Sejarah || 2900;
      billLabel = 'Allite Sejarah Sprint Pack - 30 Days';
    } else if (plan.endsWith('_papers')) {
      const subj = plan.replace('_papers', '');
      amountSen = pricing.subjects?.[subj]?.papers || 1490;
      billLabel = `Allite ${subj} Papers`;
    } else if (plan.endsWith('_bundle')) {
      const subj = plan.replace('_bundle', '');
      amountSen = pricing.subjects?.[subj]?.bundle || 2290;
      billLabel = `Allite ${subj} Bundle`;
    } else {
      return { statusCode: 400, body: `Unknown plan: ${plan}` };
    }
  }

  if (amountSen <= 0)
    return { statusCode: 400, body: 'Invalid amount' };

  const refNo = orderId
    ? `${uid}_${plan}_${orderId}`
    : `${uid}_${plan}_${Date.now()}`;

  const params = new URLSearchParams({
    userSecretKey:           process.env.TOYYIBPAY_SECRET,
    categoryCode:            process.env.TOYYIBPAY_CATEGORY,
    billName:                billLabel.substring(0, 30),
    billDescription:         `${billLabel} - ${email}`.substring(0, 100),
    billPriceSetting:        '1',
    billPayorInfo:           '1',
    billAmount:              String(amountSen),
    billReturnUrl:           `${siteUrl}/`,
    billCallbackUrl:         `${siteUrl}/.netlify/functions/payment-notify`,
    billExternalReferenceNo: refNo,
    billTo:                  (name || email.split('@')[0]).substring(0, 50),
    billEmail:               email,
    billPhone:               shipping?.phone || '',
    billSplitPayment:        '0',
    billSplitPaymentArgs:    '',
    billPaymentChannel:      '0',
    billContentEmail:        `Terima kasih! Pembelian anda telah berjaya.`,
    billChargeToCustomer:    '1',
    billExpiryDays:          '3',
  });

  let res;
  try {
    res = await fetch(`${apiBase}/index.php/api/createBill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Cannot reach payment gateway' }) };
  }

  const data = await res.json();
  if (!data[0]?.BillCode) {
    console.error('ToyyibPay error:', JSON.stringify(data));
    return { statusCode: 500, body: JSON.stringify({ error: 'Bill creation failed' }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url:      `${apiBase}/${data[0].BillCode}`,
      billCode: data[0].BillCode,
      refNo,
    }),
  };
};
