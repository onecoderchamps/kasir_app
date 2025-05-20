import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../api/firebase';

export default function Dashboard() {
  const [totalTerapis, setTotalTerapis] = useState(0);
  const [totalKasir, setTotalKasir] = useState(0);
  const [totalOutlet, setTotalOutlet] = useState(0);
  const [totalTransaksi, setTotalTransaksi] = useState(0);
  const [totalOmset, setTotalOmset] = useState(0);

  // State untuk date range
  const [startDate, setStartDate] = useState(() => localStorage.getItem('dashboardStartDate') || '');
  const [endDate, setEndDate] = useState(() => localStorage.getItem('dashboardEndDate') || '');

  useEffect(() => {
    const fetchData = async () => {
      // Total Terapis, Kasir, Outlet tetap full tanpa filter tanggal
      const terapissnap = await getDocs(collection(db, 'Terapis'));
      setTotalTerapis(terapissnap.size);

      const usersnap = await getDocs(collection(db, 'User'));
      const kasirCount = usersnap.docs.filter(doc => doc.data().role === 'Kasir').length;
      setTotalKasir(kasirCount);

      const outletsnap = await getDocs(collection(db, 'Outlet'));
      setTotalOutlet(outletsnap.size);

      // Query transaksi dengan filter date range jika ada
      let transaksiQuery = collection(db, 'Transaksi');
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        transaksiQuery = query(
          transaksiQuery,
          where('date', '>=', Timestamp.fromDate(start)),
          where('date', '<=', Timestamp.fromDate(end))
        );
      }

      const transaksisnap = await getDocs(transaksiQuery);
      setTotalTransaksi(transaksisnap.size);

      let totalOmsetCalc = 0;
      transaksisnap.docs.forEach(doc => {
        const data = doc.data();
        totalOmsetCalc += data.total || 0;
      });
      setTotalOmset(totalOmsetCalc);
    };

    fetchData();
  }, [startDate, endDate]);

  // Simpan date range ke localStorage saat berubah
  useEffect(() => {
    if (startDate) localStorage.setItem('dashboardStartDate', startDate);
    else localStorage.removeItem('dashboardStartDate');

    if (endDate) localStorage.setItem('dashboardEndDate', endDate);
    else localStorage.removeItem('dashboardEndDate');
  }, [startDate, endDate]);

  return (
    <main className="p-4">
      {/* Date Range Filter */}
      <div className="flex gap-4 mb-6 items-end">
        <div>
          <label className="block font-semibold mb-1">Start Date</label>
          <input
            type="date"
            className="border p-2 rounded"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">End Date</label>
          <input
            type="date"
            className="border p-2 rounded"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          onClick={() => {
            setStartDate('');
            setEndDate('');
          }}
        >
          Reset
        </button>
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 border rounded shadow">
          <h2 className="font-semibold text-lg">Total Terapis</h2>
          <p className="text-3xl">{totalTerapis}</p>
        </div>
        <div className="p-4 border rounded shadow">
          <h2 className="font-semibold text-lg">Total Kasir</h2>
          <p className="text-3xl">{totalKasir}</p>
        </div>
        <div className="p-4 border rounded shadow">
          <h2 className="font-semibold text-lg">Total Outlet</h2>
          <p className="text-3xl">{totalOutlet}</p>
        </div>
        <div className="p-4 border rounded shadow">
          <h2 className="font-semibold text-lg">Total Transaksi</h2>
          <p className="text-3xl">{totalTransaksi}</p>
        </div>
        <div className="p-4 border rounded shadow col-span-1 md:col-span-3">
          <h2 className="font-semibold text-lg">Total Omset</h2>
          <p className="text-3xl">Rp {totalOmset.toLocaleString()}</p>
        </div>
      </div>
    </main>
  );
}
