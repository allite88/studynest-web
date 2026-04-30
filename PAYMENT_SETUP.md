# Payment Setup (ToyyibPay)

## 1. Daftar ToyyibPay
- Pergi ke https://toyyibpay.com → Daftar akaun merchant
- Buat satu **Category** (product category) → salin **Category Code**
- Dapatkan **User Secret Key** dari Settings

## 2. Firebase Service Account
- Firebase Console → Project Settings → Service accounts
- Klik "Generate new private key" → download JSON
- Salin SEMUA kandungan JSON itu

## 3. Set Netlify Environment Variables
Netlify Dashboard → Site → Environment variables → Add:

| Variable | Value |
|---|---|
| `TOYYIBPAY_SECRET` | User Secret Key dari ToyyibPay |
| `TOYYIBPAY_CATEGORY` | Category Code dari ToyyibPay |
| `SITE_URL` | `https://stunning-raindrop-b1a986.netlify.app` |
| `FIREBASE_SERVICE_ACCOUNT` | Keseluruhan JSON service account (paste terus) |
| `TOYYIBPAY_SANDBOX` | `true` (untuk test dulu) / `false` (untuk live) |

## 4. Test
- Set `TOYYIBPAY_SANDBOX=true`
- Gunakan sandbox credentials dari dev.toyyibpay.com
- Test payment flow end-to-end

## 5. Go Live
- Set `TOYYIBPAY_SANDBOX=false`
- Tukar ke live credentials

## Payment Flow
1. User klik "Beli Sekarang" → `/.netlify/functions/create-bill` dipanggil
2. Redirect ke ToyyibPay checkout
3. User bayar → ToyyibPay hantar webhook ke `/.netlify/functions/payment-notify`
4. Webhook update `users/{uid}.isPremium = true` dan `purchases/{uid}.premium = true`
5. User di-redirect balik ke site dengan `?status_id=1`
6. Site poll Firestore tiap 3s untuk confirm premium diaktifkan

## Firestore: payments collection
Setiap payment yang berjaya disimpan di `payments/{autoId}`:
- uid, plan, refNo, amount, billCode, transactionId, status, createdAt
