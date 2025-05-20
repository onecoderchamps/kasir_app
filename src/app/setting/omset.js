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

  // Modal state
  const [modalAllUserOpen, setModalAllUserOpen] = useState(false);
  const [modalAllUserData, setModalAllUserData] = useState({
    name: '',
    transactions: [],
  });

  // Simpan transaksi fetch untuk modal detail
  const [allTransactions, setAllTransactions] = useState([]);

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

    // Simpan transaksi full untuk modal nanti
    setAllTransactions(transactions);

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

  // Fungsi buka modal semua transaksi user saat klik header nama
  const openModalUserTransactions = (userName) => {
    // Filter transaksi yang ada item servedBy user ini
    const userTransactions = allTransactions.filter((trx) =>
      trx.cart.some((item) =>
        item.servedBy.split(',').map((n) => n.trim()).includes(userName)
      )
    );

    setModalAllUserData({
      name: userName,
      transactions: userTransactions,
    });
    setModalAllUserOpen(true);
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
                <th
                  key={name}
                  className="p-2 border cursor-pointer hover:bg-gray-200"
                  onClick={() => openModalUserTransactions(name)}
                  title={`Lihat transaksi ${name}`}
                >
                  {name}
                </th>
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

      {/* Modal semua transaksi user */}
      {modalAllUserOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setModalAllUserOpen(false)}
        >
          <div
            className="bg-white p-6 rounded shadow-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">
              Semua Transaksi untuk {modalAllUserData.name}
            </h2>
            {modalAllUserData.transactions.length === 0 ? (
              <p>Tidak ada transaksi.</p>
            ) : (
              <>
                {modalAllUserData.transactions.map((trx, idx) => (
                  <div key={idx} className="mb-4 p-3 border rounded bg-gray-50">
                    <div>
                      <strong>No Transaksi:</strong> {trx.invoiceNumber || '-'}
                    </div>
                    <div>
                      <strong>Tanggal:</strong>{' '}
                      {new Date(trx.date).toLocaleDateString('id-ID')}
                    </div>
                    <div>
                      <strong>Jam:</strong>{' '}
                      {new Date(trx.date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div>
                      <strong>Item:</strong>
                    </div>
                    <ul className="list-disc ml-5">
                      {trx.cart
                        .filter((item) =>
                          item.servedBy
                            .split(',')
                            .map((n) => n.trim())
                            .includes(modalAllUserData.name)
                        )
                        .map((item, i) => (
                          <li key={i}>
                            {item.name} (Rp {item.price.toLocaleString()})
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}

                {/* Total transaksi */}
                <div className="mt-4 font-bold text-lg border-t pt-3">
                  Total Transaksi: Rp{' '}
                  {modalAllUserData.transactions
                    .reduce((acc, trx) => {
                      // Hitung hanya item yg servedBy sesuai nama user modal
                      const sumTrx = trx.cart.reduce((subAcc, item) => {
                        const servers = item.servedBy.split(',').map((n) => n.trim());
                        if (servers.includes(modalAllUserData.name)) {
                          return subAcc + item.price / servers.length;
                        }
                        return subAcc;
                      }, 0);
                      return acc + sumTrx;
                    }, 0)
                    .toLocaleString()}
                </div>
              </>
            )}
            <button
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              onClick={() => setModalAllUserOpen(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
