// ToyyibPay webhook — fired on every payment status change.
// Updates Firestore based on plan type encoded in billExternalReferenceNo.
// Required env var: FIREBASE_SERVICE_ACCOUNT (or auto-initialized in Cloud Functions)

const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();
const CORE5 = ['BM','BI','Math','Sejarah','Sains'];
const TS = admin.firestore.FieldValue.serverTimestamp;
const NOW = () => TS();

exports.paymentNotify = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const params = Object.fromEntries(new URLSearchParams(req.body || ''));
  const status = params.status || params.transaction_status || params.status_id || '';
  const refNo  = params.billExternalReferenceNo || params.order_id || params.refno || '';

  console.log('payment-notify', { status, refNo });

  // Only process successful payments
  if (status !== '1') {
    res.status(200).send('ok');
    return;
  }
  if (!refNo) {
    res.status(400).send('missing refNo');
    return;
  }

  // refNo format: {uid}_{plan}_{timestamp|orderId}
  const firstUnderscore  = refNo.indexOf('_');
  const secondUnderscore = refNo.indexOf('_', firstUnderscore + 1);
  const uid  = refNo.substring(0, firstUnderscore);
  const plan = refNo.substring(firstUnderscore + 1, secondUnderscore);
  const tail = refNo.substring(secondUnderscore + 1); // orderId or timestamp

  if (!uid || !plan) {
    console.error('Invalid refNo format:', refNo);
    res.status(400).send('invalid refNo');
    return;
  }

  try {
    // ── books_order ───────────────────────────────────────────────────
    if (plan === 'books_order') {
      const orderId = tail;
      if (!orderId) {
        res.status(400).send('missing orderId');
        return;
      }
      await db.doc(`orders/${orderId}`).update({
        status:    'paid',
        paidAt:    NOW(),
        billCode:  params.billcode  || '',
        txId:      params.transaction_id || '',
      });
      res.status(200).send('ok');
      return;
    }

    // ── collection_{contentId} ────────────────────────────────────────
    if (plan.startsWith('collection_')) {
      const contentId = plan.replace('collection_', '');
      await db.doc(`purchases/${uid}`).set(
        { [contentId]: true },
        { merge: true }
      );
      await db.collection('payments').add({
        uid, plan, refNo,
        billCode: params.billcode || '',
        txId:     params.transaction_id || '',
        status:   'paid',
        createdAt: NOW(),
      });
      res.status(200).send('ok');
      return;
    }

    // ── Subject / bundle / core5 / all_access / new plans ────────────
    const purchases = {};
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    if (plan === 'all_access') {
      purchases.all_access = true;

    } else if (plan === 'core5') {
      purchases.core5 = true;
      // Also grant individual bundle access for all Core5 subjects
      CORE5.forEach(s => { purchases[`${s}_bundle`] = true; });

    } else if (plan === 'trial_pass') {
      purchases.trial_pass = true;
      purchases.trial_pass_expiresAt = now + thirtyDays;

    } else if (plan === 'pro_yearly') {
      purchases.pro_yearly = true;
      purchases.pro_yearly_expiresAt = now + oneYear;
      // Do NOT set all_access — let frontend check pro_yearly flag directly

    } else if (plan === 'premium_yearly') {
      purchases.premium_yearly = true;
      purchases.premium_yearly_expiresAt = now + oneYear;
      purchases.pro_yearly = true; // Premium includes Pro
      purchases.pro_yearly_expiresAt = now + oneYear; // Also set Pro's expiry
      // Do NOT set all_access — let frontend check premium_yearly flag directly

    } else if (plan === 'sejarah_sprint') {
      purchases.sejarah_sprint = true;
      purchases.sejarah_sprint_expiresAt = now + thirtyDays;
      purchases.Sejarah_sprint = true; // Also set for backward compatibility

    } else if (plan.endsWith('_papers')) {
      const subj = plan.replace('_papers', '');
      purchases[`${subj}_papers`] = true;

    } else if (plan.endsWith('_bundle')) {
      const subj = plan.replace('_bundle', '');
      purchases[`${subj}_bundle`] = true;
      purchases[`${subj}_papers`] = true; // bundle implies papers too

    } else {
      console.error('Unknown plan:', plan);
      res.status(400).send(`unknown plan: ${plan}`);
      return;
    }

    await db.doc(`purchases/${uid}`).set(purchases, { merge: true });

    await db.collection('payments').add({
      uid, plan, refNo,
      billCode:  params.billcode || '',
      txId:      params.transaction_id || '',
      status:    'paid',
      createdAt: NOW(),
    });

    res.status(200).send('ok');

  } catch (e) {
    console.error('Error processing payment:', e);
    res.status(500).json({ error: e.message });
  }
});
