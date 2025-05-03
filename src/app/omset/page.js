'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OmzetReport() {
  const [pivotData, setPivotData] = useState([]);
  const [names, setNames] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const router = useRouter();

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
        router.push('/');
      }
    }else{
        localStorage.removeItem('uid');
        localStorage.removeItem('loginDate');
        router.push('/');
    }
  }, [router]);

  function getServedRevenue(transactions, category) {
    const result = [];

    transactions.forEach((transaction) => {
      transaction.cart.forEach((item) => {
        if (category && item.idCategory !== category) return;

        const servers = item.servedBy.split(',').map((name) => name.trim());
        const revenuePerPerson = item.price / servers.length;

        servers.forEach((server) => {
          result.push({
            name: server,
            revenue: revenuePerPerson,
            date: new Date(transaction.date).toLocaleDateString('en-CA'), // YYYY-MM-DD
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

    // Baris total akhir
    const totalRow = { date: 'Total', total: 0 };
    sortedNames.forEach((name) => {
      const totalPerName = rows.reduce((acc, row) => acc + (row[name] || 0), 0);
      totalRow[name] = totalPerName;
      totalRow.total += totalPerName;
    });

    rows.push(totalRow);

    return { rows, sortedNames };
  }

  useEffect(() => {
    const stored = localStorage.getItem('transactions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);

        // Ambil semua kategori unik
        const categorySet = new Set();
        parsed.forEach(t => t.cart.forEach(i => categorySet.add(i.idCategory)));
        const categoryList = Array.from(categorySet);
        setCategories(categoryList);
        setSelectedCategory(categoryList[0] || '');

        // Ambil tanggal range dari semua transaksi
        const allDates = parsed.map((t) => new Date(t.date).toLocaleDateString('en-CA'));
        const minDate = allDates.length > 0 ? allDates.reduce((a, b) => (a < b ? a : b)) : '';
        const maxDate = allDates.length > 0 ? allDates.reduce((a, b) => (a > b ? a : b)) : '';
        setStartDate(minDate);
        setEndDate(maxDate);
      } catch (e) {
        console.error('Invalid JSON in localStorage:', e);
      }
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('transactions');
    if (stored && startDate && endDate && selectedCategory) {
      try {
        const parsed = JSON.parse(stored);
        const servedRevenue = getServedRevenue(parsed, selectedCategory);
        const { rows, sortedNames } = buildPivot(servedRevenue, startDate, endDate);
        setPivotData(rows);
        setNames(sortedNames);
      } catch (e) {
        console.error('Invalid JSON in localStorage:', e);
      }
    }
  }, [startDate, endDate, selectedCategory]);

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">Omzet Report (Filtered by Category)</h1>

      <div className="flex flex-wrap gap-4 mb-4 items-end">
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
          <label className="block text-sm font-medium">Kategori</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(parseInt(e.target.value))}
            className="border p-2 rounded"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                Kategori {cat}
              </option>
            ))}
          </select>
        </div>
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
