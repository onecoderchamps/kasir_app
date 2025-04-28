'use client';

import { useEffect, useState } from 'react';

export default function OmzetReport() {
  const [transactions, setTransactions] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [therapists, setTherapists] = useState([]);

  useEffect(() => {
    // Data transaksi dummy
    const transactionsData = [
      {
        id: 1,
        date: "2025-04-29",
        cart: [
          { name: "Back Massage", price: 30000, qty: 1, servedBy: "Budi" },
          { name: "Hair Spa", price: 20000, qty: 1, servedBy: "Cici" },
        ],
      },
      {
        id: 2,
        date: "2025-04-30",
        cart: [
          { name: "Back Massage", price: 30000, qty: 1, servedBy: "Budi" },
          { name: "Hair Spa", price: 20000, qty: 1, servedBy: "Cici" },
        ],
      },
      {
        id: 3,
        date: "2025-05-01",
        cart: [
          { name: "Back Massage", price: 30000, qty: 1, servedBy: "Budi" },
          { name: "Hair Spa", price: 20000, qty: 1, servedBy: "Cici" },
        ],
      },
    ];

    setTransactions(transactionsData);

    // Build therapist list
    const therapistSet = new Set();
    transactionsData.forEach(tx => {
      tx.cart.forEach(item => {
        therapistSet.add(item.servedBy);
      });
    });
    const therapistList = Array.from(therapistSet);
    setTherapists(therapistList);

    // Build table data
    const tempTable = transactionsData.map(tx => {
      const row = { date: tx.date };
      therapistList.forEach(name => {
        row[name] = 0;
      });

      tx.cart.forEach(item => {
        row[item.servedBy] += item.price * item.qty;
      });

      row.total = Object.values(row).slice(1).reduce((sum, value) => sum + value, 0); // sum omzet tanpa 'date'
      return row;
    });

    setTableData(tempTable);
  }, []);

  // Hitung total omzet semua
  const grandTotal = tableData.reduce((sum, row) => sum + row.total, 0);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6">Laporan Omzet Per Terapis</h1>

      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Tanggal</th>
              {therapists.map((name) => (
                <th key={name} className="border px-4 py-2">{name}</th>
              ))}
              <th className="border px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index}>
                <td className="border px-4 py-2">{row.date}</td>
                {therapists.map((name) => (
                  <td key={name} className="border px-4 py-2 text-right">
                    Rp {row[name].toLocaleString()}
                  </td>
                ))}
                <td className="border px-4 py-2 text-right font-bold">
                  Rp {row.total.toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="font-bold bg-gray-200">
              <td className="border px-4 py-2 text-center" colSpan={therapists.length + 1}>
                Total Omset
              </td>
              <td className="border px-4 py-2 text-right">
                Rp {grandTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
