import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../api/firebase';
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function History() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);

    const saveTransaksi = async () => {
        const saved = localStorage.getItem('transactions');
        let parsedTransactions = JSON.parse(saved);

        setLoading(true);
        try {
            for (const trx of parsedTransactions) {
                const dateObj = new Date(trx.date);
                const trxWithTimestamp = {
                    ...trx,
                    date: Timestamp.fromDate(dateObj)
                };

                await setDoc(doc(collection(db, "Transaksi"), trx.id.toString()), trxWithTimestamp);
                parsedTransactions = parsedTransactions.filter(item => item.id !== trx.id);
                localStorage.setItem('transactions', JSON.stringify(parsedTransactions));
                setTransactions(parsedTransactions);
            }

            alert("Semua transaksi berhasil disimpan ke Firebase!");
        } catch (error) {
            console.error("Gagal menyimpan transaksi:", error);
            alert("Gagal menyimpan transaksi. Lihat console untuk detail.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const uid = localStorage.getItem('uid');
        const loginDate = localStorage.getItem('loginDate');

        if (uid && loginDate) {
            const today = new Date();
            const login = new Date(loginDate);
            const sameDay =
                today.getFullYear() === login.getFullYear() &&
                today.getMonth() === login.getMonth() &&
                today.getDate() === login.getDate();

            if (!sameDay) {
                localStorage.removeItem('uid');
                localStorage.removeItem('loginDate');
                window.location.href = '/';
            }
        } else {
            localStorage.removeItem('uid');
            localStorage.removeItem('loginDate');
            window.location.href = '/';
        }
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('transactions');
        if (saved) {
            const parsedTransactions = JSON.parse(saved);
            const sortedTransactions = parsedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(sortedTransactions);
        }
    }, []);

    const deleteTransaction = (id) => {
        const updatedTransactions = transactions.filter(tx => tx.id !== id);
        setTransactions(updatedTransactions);
        localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
    };

    const exportExcel = () => {
        const data = transactions.map(tx => ({
            ID: tx.id,
            Tanggal: tx.date,
            Customer: tx.customerName || '-',
            Ponsel: tx.customerPhone || '-',
            Layanan: tx.cart.map(item => `${item.name} (x${item.qty})`).join(', '),
            Total: tx.total,
            'Metode Pembayaran': tx.paymentMethod,
            Bank: tx.bank?.name || '-',
            'Uang Diterima': tx.cashGiven || '-',
            'Kembalian': tx.change || '-'
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Transaksi");
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const fileData = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(fileData, "riwayat_transaksi.xlsx");
    };

    const printReceipt = (tx) => {
        const newWindow = window.open('', '', 'width=400,height=600');
        newWindow.document.write(`
          <html>
            <head>
              <title>Struk Pembayaran</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h2 { text-align: center; }
                .info { margin-bottom: 10px; }
                .bold { font-weight: bold; }
                .divider { border-top: 1px dashed #333; margin: 10px 0; }
                .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
              </style>
            </head>
            <body>
              <h2>STRUK PEMBAYARAN</h2>
              <div class="info"><span class="bold">ID:</span> ${tx.id}</div>
              <div class="info"><span class="bold">Tanggal:</span> ${tx.date}</div>
              <div class="info"><span class="bold">Customer:</span> ${tx.customerName || '-'}</div>
              <div class="info"><span class="bold">Ponsel:</span> ${tx.customerPhone || '-'}</div>
              <div class="divider"></div>
              <div class="info bold">Layanan:</div>
              <ul>
                ${tx.cart.map(item => `<li>${item.name} (x${item.qty}) - Rp ${item.price.toLocaleString()}</li>`).join('')}
              </ul>
              <div class="divider"></div>
              ${tx.discount > 0 ? `
                <div class="info"><span class="bold">Subtotal:</span> Rp ${tx.subtotal.toLocaleString()}</div>
                <div class="info"><span class="bold">Diskon:</span> ${tx.coupon} - ${(tx.subtotal - tx.total).toLocaleString()}</div>
              ` : ''}
              <div class="info"><span class="bold">Metode Pembayaran:</span> ${tx.paymentMethod}</div>
              ${tx.paymentMethod === 'Transfer' ? `
                <div class="info"><span class="bold">Bank:</span> ${tx.bank?.name} (a.n ${tx.bank?.accountName})</div>
              ` : ''}
              ${tx.paymentMethod === 'Tunai' ? `
                <div class="info"><span class="bold">Uang Diterima:</span> Rp ${parseInt(tx.cashGiven).toLocaleString()}</div>
                <div class="info"><span class="bold">Kembalian:</span> Rp ${parseInt(tx.change).toLocaleString()}</div>
              ` : ''}
              <div class="total">Total: Rp ${tx.total.toLocaleString()}</div>
              <div style="text-align:center; margin-top:30px;">Terima kasih!</div>
            </body>
          </html>
        `);
        newWindow.document.close();
        newWindow.print();
    };

    return (
        <main className="p-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center text-gray-700 hover:text-gray-900"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">Transaksi</h1>
                </div>
                <div className="flex flex-wrap gap-3">
                    {transactions.length > 0 && (
                        <>
                            <button
                                onClick={exportExcel}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
                            >
                                Export Excel
                            </button>
                            <button
                                onClick={saveTransaksi}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
                            >
                                {loading ? "Menyimpan..." : "Update ke Server"}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {transactions.length === 0 ? (
                <div className="text-center text-gray-500">Belum ada transaksi.</div>
            ) : (
                <>
                    <div className="text-sm text-gray-500 mb-4">Transaksi Pending</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="bg-white rounded-lg shadow p-4 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between mb-2 text-sm text-gray-600">
                                        <div className="font-semibold text-gray-800">ID: {tx.id}</div>
                                        <div>{tx.date}</div>
                                    </div>

                                    <div className="mb-2">
                                        <div className="font-medium text-gray-700">Customer:</div>
                                        <div>{tx.customerName || '-'}</div>
                                    </div>
                                    <div className="mb-2">
                                        <div className="font-medium text-gray-700">Ponsel:</div>
                                        <div>{tx.customerPhone || '-'}</div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="font-medium text-gray-700">Layanan:</div>
                                        <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                                            {tx.cart.map((item, idx) => (
                                                <li key={idx}>
                                                    {item.name} (x{item.qty}) - Rp {item.price.toLocaleString()}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {tx?.discount !== 0 && (
                                        <>
                                            <div className="text-sm text-gray-600">SubTotal: Rp {tx?.subtotal?.toLocaleString()}</div>
                                            <div className="text-sm text-gray-600">Diskon: {tx?.discount}%</div>
                                        </>
                                    )}

                                    <div className="text-sm text-gray-800 mt-2 font-semibold">
                                        Total Bayar: Rp {tx.total.toLocaleString()}
                                    </div>

                                    <div className="text-sm text-gray-700 mt-1">Metode: {tx.paymentMethod}</div>

                                    {tx.paymentMethod === 'Transfer' && tx.bank && (
                                        <div className="text-sm text-gray-700 mt-1">
                                            Transfer ke: {tx.bank.name} (a.n {tx.bank.accountName})
                                        </div>
                                    )}

                                    {tx.paymentMethod === 'Tunai' && (
                                        <div className="text-sm text-gray-700 mt-1">
                                            Tunai Diberikan: Rp {parseInt(tx.cashGiven).toLocaleString()}<br />
                                            Kembalian: Rp {parseInt(tx.change).toLocaleString()}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <button onClick={() => printReceipt(tx)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                                        Cetak Struk
                                    </button>
                                    <button onClick={() => deleteTransaction(tx.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </main>
    );
}
