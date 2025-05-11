import { useEffect, useState } from 'react';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../../api/firebase';

export default function OmzetReport() {
  const [pivotData, setPivotData] = useState([]);
  const [names, setNames] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('all');
  const [outlet, setOutlet] = useState([]);

  // Ambil outlet
  useEffect(() => {
    const fetchOutlet = async () => {
      const snapshot = await getDocs(collection(db, 'Outlet'));
      const fetched = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt));
      setOutlet(fetched);
    };
    fetchOutlet();
  }, []);

  // Ambil kategori berdasarkan selectedOutlet
  useEffect(() => {
    const fetchCategories = async () => {
      if (!selectedOutlet || selectedOutlet === 'all') {
        setCategories([]);
        setSelectedCategory('all');
        return;
      }

      const q = query(
        collection(db, 'Category'),
        where('idOutlet', '==', selectedOutlet)
      );
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt));
      setCategories(fetched);
      setSelectedCategory('all');
    };
    fetchCategories();
  }, [selectedOutlet]);

  // Cek sesi login
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

  function getServedRevenue(transactions, categoryId) {
    const result = [];

    transactions.forEach((transaction) => {
      transaction.cart.forEach((item) => {
        if (categoryId && item.idCategory !== categoryId) return;

        const servers = item.servedBy.split(',').map((name) => name.trim());
        const revenuePerPerson = item.price / servers.length;

        servers.forEach((server) => {
          result.push({
            name: server,
            revenue: revenuePerPerson,
            date: new Date(transaction.date).toLocaleDateString('en-CA'),
          });
        });
      });
    });

    return result;
  }

  function getDateRangeArray(start, end) {
    const date = new Date(start);
    const dates = [];

    while (date <= new Date(end)) {
      dates.push(new Date(date).toLocaleDateString('en-CA'));
      date.setDate(date.getDate() + 1);
    }

    return dates;
  }

  function buildPivot(data, start, end) {
    const pivot = {};
    const uniqueNames = new Set();

    data.forEach(({ name, date, revenue }) => {
      if (!pivot[date]) pivot[date] = {};
      if (!pivot[date][name]) pivot[date][name] = 0;
      pivot[date][name] += revenue;
      uniqueNames.add(name);
    });

    const sortedNames = Array.from(uniqueNames).sort();
    const rangeDates = getDateRangeArray(start, end);

    const rows = rangeDates.map((date) => {
      const row = { date, total: 0 };
      sortedNames.forEach((name) => {
        const value = pivot[date]?.[name] || 0;
        row[name] = value;
        row.total += value;
      });
      return row;
    });

    const totalRow = { date: 'Total', total: 0 };
    sortedNames.forEach((name) => {
      const totalPerName = rows.reduce((acc, row) => acc + (row[name] || 0), 0);
      totalRow[name] = totalPerName;
      totalRow.total += totalPerName;
    });

    rows.push(totalRow);

    return { rows, sortedNames };
  }

  const fetchReport = async () => {
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let q = query(
      collection(db, 'Transaksi'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end))
    );

    if (selectedOutlet !== 'all') {
      q = query(q, where('idOutlet', '==', selectedOutlet));
    }

    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        date: data.date?.toDate?.() ?? new Date(data.date.seconds * 1000),
      };
    });

    const filteredTransactions =
      selectedCategory === 'all'
        ? transactions
        : transactions.filter((t) =>
            t.cart.some((item) => item.idCategory === selectedCategory)
          );

    const servedRevenue = getServedRevenue(
      filteredTransactions,
      selectedCategory === 'all' ? null : selectedCategory
    );

    const { rows, sortedNames } = buildPivot(servedRevenue, startDate, endDate);
    setPivotData(rows);
    setNames(sortedNames);
  };

  return (
    <main>
      <div className="flex flex-wrap gap-4 mb-4 items-end mt-4">
        <div>
          <label className="block text-sm font-medium">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Outlet</label>
          <select
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">Pilih Semua</option>
            {outlet.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nama}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Kategori</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">Pilih Semua</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchReport}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Cari
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr className="text-center">
              <th className="p-2 border">Tanggal</th>
              {names.map((name) => (
                <th key={name} className="p-2 border">{name}</th>
              ))}
              <th className="p-2 border">Total</th>
            </tr>
          </thead>
          <tbody>
            {pivotData.map((row, idx) => (
              <tr key={idx} className="text-center">
                <td className="p-2 border font-semibold">
                  {row.date === 'Total' ? 'Total' : new Date(row.date).getDate()}
                </td>
                {names.map((name) => (
                  <td key={name} className="p-2 border">
                    Rp {row[name]?.toLocaleString() || 0}
                  </td>
                ))}
                <td className="p-2 border font-semibold">Rp {row.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
