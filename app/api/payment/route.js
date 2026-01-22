import { NextResponse } from 'next/server';
// @ts-ignore
import Midtrans from 'midtrans-client';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  const { amount, customerDetails } = await request.json();

  const snap = new Midtrans.Snap({
    isProduction: false,
    // UBAH BAGIAN INI: Menggunakan process.env
    serverKey: process.env.MIDTRANS_SERVER_KEY, 
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY 
  });

  const orderId = `BOOK-${uuidv4()}`;

  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    customer_details: {
      first_name: customerDetails.name,
      phone: customerDetails.phone,
    },
    item_details: [{
        id: "DP-BENGKEL",
        price: amount,
        quantity: 1,
        name: "DP Booking Service"
    }]
  };

  try {
    const transaction = await snap.createTransaction(parameter);
    return NextResponse.json({ 
        token: transaction.token,
        orderId: orderId
    });
  } catch (error) {
    console.error("Error Midtrans:", error); 
    return NextResponse.json({ error: 'Gagal membuat transaksi' }, { status: 500 });
  }
}