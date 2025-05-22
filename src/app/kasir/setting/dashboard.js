import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import SummaryBox from './summaryBox';

const idOutlet = localStorage.getItem('idOutlet');

export default function Dashboard() {
  const [totalTerapis, setTotalTerapis] = useState(0);
  const [totalTransaksi, setTotalTransaksi] = useState(0);
  const [totalOmset, setTotalOmset] = useState(0);
  const [data, setdata] = useState([]);


  // State untuk date range
  const [startDate, setStartDate] = useState(() => localStorage.getItem('dashboardStartDate') || '');
  const [endDate, setEndDate] = useState(() => localStorage.getItem('dashboardEndDate') || '');

  useEffect(() => {
    const fetchData = async () => {
      // Total Terapis, Kasir, Outlet tetap full tanpa filter tanggal
      const terapissnap = await getDocs(collection(db, 'Terapis'));
      setTotalTerapis(terapissnap.size);

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
          where('date', '<=', Timestamp.fromDate(end)),
          where('idOutlet', '==', idOutlet)
        );
      }

      const transaksisnap = await getDocs(transaksiQuery);
      const result = transaksisnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setdata(result);
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
        <SummaryBox transactions={data} />
    </main>
  );
}
