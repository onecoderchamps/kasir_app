import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../../../api/firebase';

const idOutlet = localStorage.getItem('idOutlet');

export default function RetailReport() {
  const [pivotData, setPivotData] = useState([]);
  const [names, setNames] = useState([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [products, setProducts] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalAllUserOpen, setModalAllUserOpen] = useState(false);
  const [modalAllUserData, setModalAllUserData] = useState(null);

  useEffect(() => {
    const uid = localStorage.getItem('uid');
    const loginDate = localStorage.getItem('loginDate');
    if (!uid || !loginDate) {
      window.location.href = '/';
      return;
    }
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
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!idOutlet) return;
      try {
        const q = query(collection(db, 'Inventory'), where('idOutlet', '==', idOutlet));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(fetched);
        if (fetched.length > 0) {
          setSelectedProduct(fetched[0]?.id || '');
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
      }
    };
    fetchProducts();
  }, []);

  // PERBAIKAN: Tambahkan komisi ke perhitungan served revenue
  const getServedRevenueAndCommission = (transactions, productId) => {
    const result = [];
    transactions.forEach((transaction) => {
      transaction.retail.forEach((item) => {
        if (productId && item.barangId !== productId) return;

        const servers = item.servedBy.split(',').map((name) => name.trim());
        const revenuePerPerson = item.harga / servers.length;
        const commissionPerPerson = item.komisi / servers.length; // PERBAIKAN: Hitung komisi

        servers.forEach((server) => {
          result.push({
            name: server,
            revenue: revenuePerPerson,
            commission: commissionPerPerson, // PERBAIKAN: Tambahkan komisi
            date: new Date(transaction.date).toLocaleDateString('en-CA'),
            itemName: item.nama,
            invoiceNumber: transaction.invoiceNumber || '-',
            time: new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        });
      });
    });
    return result;
  };

  const getDateRangeArray = (start, end) => {
    const date = new Date(start);
    const dates = [];
    while (date <= new Date(end)) {
      dates.push(new Date(date).toLocaleDateString('en-CA'));
      date.setDate(date.getDate() + 1);
    }
    return dates;
  };

  // PERBAIKAN: Perbarui buildPivot untuk menghitung revenue dan commission
  const buildPivot = (data, start, end) => {
    const pivot = {};
    const uniqueNames = new Set();
    data.forEach(({ name, date, revenue, commission }) => {
      if (!pivot[date]) {
        pivot[date] = {};
      }
      if (!pivot[date][name]) {
        pivot[date][name] = { revenue: 0, commission: 0 };
      }
      pivot[date][name].revenue += revenue;
      pivot[date][name].commission += commission;
      uniqueNames.add(name);
    });

    const sortedNames = Array.from(uniqueNames).sort();
    const rangeDates = getDateRangeArray(start, end);
    const rows = rangeDates.map((date) => {
      const row = { date, totalRevenue: 0, totalCommission: 0 };
      sortedNames.forEach((name) => {
        const value = pivot[date]?.[name] || { revenue: 0, commission: 0 };
        row[name] = value;
        row.totalRevenue += value.revenue;
        row.totalCommission += value.commission;
      });
      return row;
    });

    const totalRow = { date: 'Total', totalRevenue: 0, totalCommission: 0 };
    sortedNames.forEach((name) => {
      const totalPerName = rows.reduce((acc, row) => ({
        revenue: acc.revenue + (row[name]?.revenue || 0),
        commission: acc.commission + (row[name]?.commission || 0)
      }), { revenue: 0, commission: 0 });
      totalRow[name] = totalPerName;
      totalRow.totalRevenue += totalPerName.revenue;
      totalRow.totalCommission += totalPerName.commission;
    });

    rows.push(totalRow);
    return { rows, sortedNames };
  };


  const fetchReport = async () => {
    if (!startDate || !endDate || !selectedProduct) return;
    setLoading(true);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    try {
      const transaksiRef = collection(db, 'Transaksi');
      const q = query(
        transaksiRef,
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end)),
        where('idOutlet', '==', idOutlet)
      );
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: data.date?.toDate?.() ?? new Date(data.date.seconds * 1000),
          };
        })
        .filter((t) => t.retail?.some((item) => item.barangId === selectedProduct));
      setAllTransactions(transactions);
      const servedData = getServedRevenueAndCommission(transactions, selectedProduct);
      const { rows, sortedNames } = buildPivot(servedData, startDate, endDate);
      setPivotData(rows);
      setNames(sortedNames);
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedProduct]);

  const filteredDailyTransactions = useMemo(() => {
    if (!modalData?.date || modalData.date === 'Total') return [];
    return allTransactions.filter((t) => {
      const d = new Date(t.date).toLocaleDateString('en-CA');
      return d === modalData.date;
    });
  }, [modalData, allTransactions]);

  const handleNameClick = (name, date) => {
    if (date === 'Total') return;
    const itemsData = [];
    let totalRevenue = 0;
    let totalCommission = 0;
    allTransactions.forEach((trx) => {
      const trxDate = new Date(trx.date).toLocaleDateString('en-CA');
      if (trxDate === date) {
        trx.retail.forEach((item) => {
          const servers = item.servedBy.split(',').map((n) => n.trim());
          if (servers.includes(name)) {
            const revenue = item.harga / servers.length;
            const commission = item.komisi / servers.length; // PERBAIKAN: Ambil komisi
            itemsData.push({
              name: item.nama,
              revenue,
              commission, // PERBAIKAN: Tambahkan komisi
              invoiceNumber: trx.invoiceNumber || '-',
              time: new Date(trx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
            totalRevenue += revenue;
            totalCommission += commission; // PERBAIKAN: Tambahkan ke total komisi
          }
        });
      }
    });
    setModalData({ name, date, items: itemsData, totalRevenue, totalCommission });
    setModalOpen(true);
  };

  const handleHeaderNameClick = (name) => {
    const filtered = allTransactions.filter((t) =>
      t.retail?.some((item) =>
        item.servedBy.split(',').map((n) => n.trim()).includes(name)
      )
    );
    setModalAllUserData({ name, transactions: filtered });
    setModalAllUserOpen(true);
  };
  
  const closeModal = () => {
    setModalOpen(false);
    setModalAllUserOpen(false);
  }

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
          <label className="block text-sm font-medium">Produk</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="border p-2 rounded"
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.nama}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchReport}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? 'Memuat...' : 'Cari'}
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
                  className="p-2 border cursor-pointer text-blue-600 hover:underline select-none"
                  onClick={() => handleHeaderNameClick(name)}
                  title="Klik untuk lihat semua transaksi"
                >
                  {name}
                </th>
              ))}
              <th className="p-2 border">Total Revenue</th>
              <th className="p-2 border">Total Komisi</th>
            </tr>
          </thead>
          <tbody>
            {pivotData.map((row, idx) => (
              <tr key={idx} className={`text-center`}>
                <td className="p-2 border font-semibold">
                  {row.date === 'Total' ? 'Total' : new Date(row.date).getDate()}
                </td>
                {names.map((name) => (
                  <td key={name} className="p-2 border">
                    <span
                      className="cursor-pointer text-blue-700 hover:underline"
                      onClick={() => handleNameClick(name, row.date)}
                    >
                      Rp {row[name]?.revenue?.toLocaleString() || 0}
                    </span>
                    <br />
                    <span className="text-gray-500 text-xs">
                      (Komisi: Rp {row[name]?.commission?.toLocaleString() || 0})
                    </span>
                  </td>
                ))}
                <td className="p-2 border font-semibold">
                  Rp {row.totalRevenue?.toLocaleString() || 0}
                </td>
                <td className="p-2 border font-semibold">
                  Rp {row.totalCommission?.toLocaleString() || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail transaksi per tanggal */}
      {modalData?.date && filteredDailyTransactions.length > 0 && (
        <div className="mt-4 p-4 border rounded bg-gray-50 max-h-96 overflow-y-auto">
          {filteredDailyTransactions.map((trx, i) => (
            <div key={i} className="mb-3 p-3 border rounded bg-white shadow-sm">
              <div><strong>No Transaksi:</strong> {trx.invoiceNumber || '-'}</div>
              <div><strong>Jam:</strong> {new Date(trx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div>
                <strong>Item:</strong>
                <ul className="list-disc ml-5">
                  {trx.retail
                    .filter(item => item.barangId === selectedProduct)
                    .map((item, idx) => (
                      <li key={idx}>
                        {item.nama} (Rp {item.harga.toLocaleString()}) - Komisi: Rp {item.komisi.toLocaleString()}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal detail per user per tanggal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white p-6 rounded shadow-lg max-w-xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">
              Detail Transaksi untuk {modalData.name} pada {modalData.date}
            </h2>
            {modalData.items.length === 0 ? (
              <p>Tidak ada transaksi.</p>
            ) : (
              modalData.items.map((item, index) => (
                <div key={index} className="mb-3 p-2 border rounded bg-gray-50">
                  <div><strong>Nama Produk:</strong> {item.name}</div>
                  <div><strong>Invoice:</strong> {item.invoiceNumber}</div>
                  <div><strong>Jam:</strong> {item.time}</div>
                  <div><strong>Revenue:</strong> Rp {item.revenue.toLocaleString()}</div>
                  <div><strong>Komisi:</strong> Rp {item.commission.toLocaleString()}</div>
                </div>
              ))
            )}
            <div className="font-bold mt-4">
              <p>Total Revenue: Rp {modalData.totalRevenue.toLocaleString()}</p>
              <p>Total Komisi: Rp {modalData.totalCommission.toLocaleString()}</p>
            </div>
            <button
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              onClick={closeModal}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal semua transaksi user (klik header) */}
      {modalAllUserOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={closeModal}
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
                    <div><strong>No Transaksi:</strong> {trx.id || '-'}</div>
                    <div><strong>Tanggal:</strong> {new Date(trx.date).toLocaleDateString('id-ID')}</div>
                    <div><strong>Jam:</strong> {new Date(trx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div><strong>Item:</strong></div>
                    <ul className="list-disc ml-5">
                      {trx.retail
                        .filter(item => item.servedBy.split(',').map(n => n.trim()).includes(modalAllUserData.name))
                        .map((item, i) => (
                          <li key={i}>
                            {item.nama} (Rp {item.harga.toLocaleString()}) - Komisi: Rp {item.komisi.toLocaleString()}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
                <div className="mt-4 font-bold text-lg border-t pt-3">
                  Total Revenue: Rp{' '}
                  {modalAllUserData.transactions
                    .reduce((acc, trx) => {
                      const sumTrx = trx.retail.reduce((subAcc, item) => {
                        const servers = item.servedBy.split(',').map(n => n.trim());
                        if (servers.includes(modalAllUserData.name)) {
                          return subAcc + item.harga / servers.length;
                        }
                        return subAcc;
                      }, 0);
                      return acc + sumTrx;
                    }, 0)
                    .toLocaleString()}
                  <br/>
                  Total Komisi: Rp{' '}
                  {modalAllUserData.transactions
                    .reduce((acc, trx) => {
                      const sumTrx = trx.retail.reduce((subAcc, item) => {
                        const servers = item.servedBy.split(',').map(n => n.trim());
                        if (servers.includes(modalAllUserData.name)) {
                          return subAcc + item.komisi / servers.length;
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
              onClick={closeModal}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </main>
  );
}