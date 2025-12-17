// components/PrintStruk.tsx
import React from 'react';

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  type: 'part' | 'service';
};

// Tambahkan tipe data untuk konfigurasi toko
type ShopConfig = {
  shop_name: string;
  address: string;
  phone: string;
  footer_msg: string;
};

type PrintStrukProps = {
  selectedTicket: any;
  cart: CartItem[];
  grandTotal: number;
  role?: string;
  shopConfig: ShopConfig | null; // Tambahkan prop shopConfig
};

const PrintStruk: React.FC<PrintStrukProps> = ({ selectedTicket, cart, grandTotal, role, shopConfig }) => {
  // Gunakan data dari shopConfig jika ada, jika tidak gunakan nilai default
  const shopName = shopConfig?.shop_name || "BENGKEL MANDIRI SEJAHTERA";
  const shopAddress = shopConfig?.address || "Jl. Raya Bengkel No. 123, Kota Bengkel";
  const shopPhone = shopConfig?.phone || "(021) 12345678";
  const footerMsg = shopConfig?.footer_msg || "Terima Kasih Atas Kunjungan Anda";

  return (
    <div id="print-area" className="bg-white p-4 text-black font-mono text-xs">
      {/* Header Struk Dinamis */}
      <div className="text-center mb-4">
          <h1 className="text-base font-bold mb-1 uppercase">{shopName}</h1>
          <p className="whitespace-pre-wrap">{shopAddress}</p> {/* whitespace-pre-wrap agar newline di textarea terbaca */}
          <p>Telp: {shopPhone}</p>
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Informasi Transaksi (Tidak Berubah) */}
      <div className="mb-4">
          <p>No. Tiket: {selectedTicket ? `A-${selectedTicket.no_antrian}` : '-'}</p>
          <p>Tanggal : {new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          <p>Pelanggan: {selectedTicket ? selectedTicket.costumer_name : '-'}</p>
          {role && <p>Kasir : {role.toUpperCase()}</p>}
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Daftar Item (Tidak Berubah) */}
      <div className="mb-4">
          {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between mb-1">
                  <div className="flex-1">
                      <p>{item.name}</p>
                      {item.qty > 1 && (
                          <p className="text-[10px] text-gray-600">
                              {item.qty} x {item.price.toLocaleString('id-ID')}
                          </p>
                      )}
                  </div>
                  <div className="w-20 text-right font-bold">
                      {(item.qty * item.price).toLocaleString('id-ID')}
                  </div>
              </div>
          ))}
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Total Tagihan (Tidak Berubah) */}
      <div className="flex justify-between font-bold text-sm mt-4">
          <span>TOTAL TAGIHAN</span>
          <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
      </div>

      {/* Informasi Pembayaran (Tidak Berubah) */}
      <div className="flex justify-between mt-2">
          <span>Tunai</span>
          <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
      </div>
      <div className="flex justify-between">
          <span>Kembali</span>
          <span>Rp 0</span>
      </div>

      <div className="border-t border-dashed border-black my-4"></div>

      {/* Footer Struk Dinamis */}
      <div className="text-center">
          <p className="font-bold mb-1">{footerMsg}</p>
          <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
      </div>
    </div>
  );
};

export default PrintStruk;