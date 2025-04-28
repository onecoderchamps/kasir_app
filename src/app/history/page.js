'use client';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function History() {
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        const saved = localStorage.getItem('transactions');
        if (saved) {
            const parsedTransactions = JSON.parse(saved);
    
            // Sorting berdasarkan tanggal, terbaru di atas
            const sortedTransactions = parsedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            setTransactions(sortedTransactions);
        }
    }, []);

    const clearHistory = () => {
        const confirmClear = confirm('Yakin mau hapus semua riwayat transaksi?');
        if (confirmClear) {
            localStorage.removeItem('transactions');
            setTransactions([]);
        }
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

    return (
        <main className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
                <h1 className="text-3xl font-bold">Riwayat Transaksi</h1>
                <div className="flex gap-3">
                    {transactions.length > 0 && (
                        <>
                            <button className="btn btn-primary" onClick={exportExcel}>
                                Export Excel
                            </button>
                            <button className="btn btn-secondary" onClick={exportExcel}>
                                Update ke Server
                            </button>
                            {/* <button className="btn btn-error" onClick={clearHistory}>
                                Hapus Semua
                            </button> */}
                        </>
                    )}
                </div>
            </div>

            {transactions.length === 0 ? (
                <div className="text-gray-500 text-center">Belum ada transaksi.</div>
            ) : (
                <div className="space-y-6">
                    {transactions.map((tx) => (
                        <div key={tx.id} className="card bg-base-100 shadow-md p-4">
                            <div className="flex justify-between items-center mb-2">
                                <div className="font-bold">ID: {tx.id}</div>
                                <div className="text-sm text-gray-500">{tx.date}</div>
                            </div>

                            <div className="mb-2">
                                <span className="font-semibold">Customer:</span> {tx.customerName || '-'}
                            </div>
                            <div className="mb-4">
                                <span className="font-semibold">Ponsel:</span> {tx.customerPhone || '-'}
                            </div>

                            <div className="mb-4">
                                <div className="font-semibold mb-2">Layanan:</div>
                                <ul className="list-disc ml-5 space-y-1">
                                    {tx.cart.map((item, idx) => (
                                        <li key={idx}>
                                            {item.name} (x{item.qty}) - Rp {item.price.toLocaleString()}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mb-2">
                                <span className="font-semibold">Total:</span> Rp {tx.total.toLocaleString()}
                            </div>

                            <div className="mb-2">
                                <span className="font-semibold">Metode Pembayaran:</span> {tx.paymentMethod}
                            </div>

                            {tx.paymentMethod === 'Transfer' && tx.bank && (
                                <div className="mb-2">
                                    <span className="font-semibold">Transfer ke Bank:</span> {tx.bank.name} (a.n {tx.bank.accountName})
                                </div>
                            )}

                            {tx.paymentMethod === 'Tunai' && (
                                <div className="mb-2">
                                    <span className="font-semibold">Tunai Diberikan:</span> Rp {parseInt(tx.cashGiven).toLocaleString()}
                                    <br />
                                    <span className="font-semibold">Kembalian:</span> Rp {parseInt(tx.change).toLocaleString()}
                                </div>
                            )}

                            <div className="flex gap-2 mt-4">
                                <button className="btn btn-info btn-sm" onClick={() => printReceipt(tx)}>
                                    Cetak Struk
                                </button>
                                <button className="btn btn-error btn-sm" onClick={() => deleteTransaction(tx.id)}>
                                    Hapus
                                </button>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
