import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../../api/firebase';

const idOutletFromStorage = localStorage.getItem('idOutlet');

// Utility: Ambil array tanggal antara dua tanggal
const getDateRange = (start, end) => {
  const dates = [];
  const current = new Date(start);
  const last = new Date(end);

  while (current <= last) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

function App() {
  // State outlet list & filter
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(idOutletFromStorage || 'all');

  // State lain
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [absensi, setAbsensi] = useState([]);
  const [terapis, setTerapis] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  // Ambil list outlet saat mount
  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'Outlet'));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOutlets(data);
      } catch (error) {
        console.error('Error fetching outlets:', error);
      }
    };
    fetchOutlets();
  }, []);

  // Ambil data absensi & terapis sesuai filter tanggal dan outlet
  const fetchData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      // Query Absensi dengan kondisi tanggal dan outlet (jika tidak 'all')
      let absensiQueryConstraints = [
        where('tanggal', '>=', startDate),
        where('tanggal', '<=', endDate),
      ];
      if (selectedOutlet !== 'all') {
        absensiQueryConstraints.push(where('idOutlet', '==', selectedOutlet));
      }
      const absensiQuery = query(collection(db, 'Absensi'), ...absensiQueryConstraints);
      const absensiSnapshot = await getDocs(absensiQuery);
      const absensiData = absensiSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }));

      // Query Terapis dengan kondisi outlet (jika tidak 'all')
      let terapisQueryConstraints = [];
      if (selectedOutlet !== 'all') {
        terapisQueryConstraints.push(where('idOutlet', '==', selectedOutlet));
      }
      const terapisQuery = query(collection(db, 'Terapis'), ...terapisQueryConstraints);
      const terapisSnapshot = await getDocs(terapisQuery);
      const terapisData = terapisSnapshot.docs.map(doc => ({
        ...doc.data(),
        idUser: doc.id,
      }));

      setAbsensi(absensiData);
      setTerapis(terapisData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedOutlet]);

  const dates = getDateRange(startDate, endDate);

  const handleStatusChange = async (e, userId, date, absensiId) => {
    const newStatus = e.target.value;
    try {
      if (absensiId) {
        const absensiRef = doc(db, 'Absensi', absensiId);
        await updateDoc(absensiRef, { status: newStatus });
        console.log('Absensi berhasil diupdate!');
      } else {
        await addDoc(collection(db, 'Absensi'), {
          idUser: userId,
          tanggal: date,
          status: newStatus,
          idOutlet: selectedOutlet === 'all' ? null : selectedOutlet,
        });
        console.log('Absensi berhasil ditambahkan!');
      }
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating/adding absensi:', error);
    }
  };

  // Modal open/close
  const openModal = (absensiData) => {
    setModalData(absensiData);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalData(null);
  };

  const buildTableData = () => {
    return terapis.map((t) => {
      const row = { name: t.name || t.nama };

      dates.forEach((date) => {
        const match = absensi.find((a) => a.idUser === t.idUser && a.tanggal === date);

        if (match) {
          if (match.status === 'Hadir' && match.jamMasuk) {
            const jamMasuk = new Date(match.jamMasuk.seconds * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            row[date] = (
              <div className="flex flex-col items-center cursor-pointer" onClick={() => openModal({ ...match, name: t.name || t.nama })} title="Klik untuk lihat detail">
                <div className="text-green-600 font-medium mb-1">Masuk =&gt; {jamMasuk}</div>
                {match.fotoMasuk && (
                  <img
                    src={match.fotoMasuk}
                    alt="Foto Masuk"
                    className="w-20 h-20 object-cover rounded shadow"
                  />
                )}
              </div>
            );
          } else {
            row[date] = (
              <select
                className="border rounded p-1 text-sm"
                value={match.status || ''}
                onChange={(e) => handleStatusChange(e, t.idUser, date, match.id)}
                disabled={match.status === 'Hadir'}
              >
                <option value="" disabled>Pilih</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
                <option value="Absen">Absen</option>
                <option value="Cuti">Cuti</option>
              </select>
            );
          }
        } else {
          row[date] = (
            <select
              className="border rounded p-1 text-sm"
              defaultValue=""
              onChange={(e) => handleStatusChange(e, t.idUser, date)}
            >
              <option value="" disabled>Pilih</option>
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Absen">Absen</option>
              <option value="Cuti">Cuti</option>
            </select>
          );
        }
      });

      return row;
    });
  };

  const tableData = buildTableData();

  const formatDate = (date) => {
    return new Date(date).getDate().toString().padStart(2, '0');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      <h1 className="text-2xl font-bold mb-4">Rekap Absensi Terapis</h1>

      <div className="flex gap-4 mb-6 items-end">
        {/* Filter Outlet */}
        <div>
          <label className="block mb-1">Filter Outlet</label>
          <select
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">Tampilkan Semua</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>{o.name || o.nama}</option>
            ))}
          </select>
        </div>

        {/* Date Filters */}
        <div>
          <label className="block mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
        <div>
          <label className="block mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-600">Loading data...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-auto border-collapse w-full">
            <thead>
              <tr>
                <th className="border px-4 py-2 bg-gray-200">Nama</th>
                {dates.map((date) => (
                  <th key={date} className="border px-4 py-2 bg-gray-100">
                    {formatDate(date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={idx}>
                  <td className="border px-4 py-2 font-semibold">{row.name}</td>
                  {dates.map((date) => (
                    <td key={`${idx}-${date}`} className="border px-4 py-2 text-center">
                      {row[date]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && modalData && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 font-bold text-xl"
              onClick={closeModal}
              aria-label="Close modal"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">Detail Absensi</h2>
            <p><strong>Nama Terapis:</strong> {modalData.name}</p>
            <p><strong>Tanggal:</strong> {modalData.tanggal}</p>
            <p><strong>Status:</strong> {modalData.status}</p>
            {modalData.jamMasuk && (
              <p>
                <strong>Jam Masuk:</strong>{' '}
                {new Date(modalData.jamMasuk.seconds * 1000).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
            {modalData.fotoMasuk && (
              <img
                src={modalData.fotoMasuk}
                alt="Foto Masuk"
                className="mt-4 w-full object-cover rounded"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
