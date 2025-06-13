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
import { db } from '../../../api/firebase';

const idOutlet = localStorage.getItem('idOutlet');

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
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [absensi, setAbsensi] = useState([]);
  const [terapis, setTerapis] = useState([]);
  const [loading, setLoading] = useState(false);

  // State modal review
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  const fetchData = async () => {
    if (!startDate || !endDate || !idOutlet) return;

    setLoading(true);
    try {
      const absensiQuery = query(
        collection(db, 'Absensi'),
        where('idOutlet', '==', idOutlet),
        where('tanggal', '>=', startDate),
        where('tanggal', '<=', endDate)
      );
      const absensiSnapshot = await getDocs(absensiQuery);
      const absensiData = absensiSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }));

      const terapisQuery = query(
        collection(db, 'Terapis'),
        where('idOutlet', '==', idOutlet)
      );
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
  }, [startDate, endDate]);

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
          idOutlet: idOutlet,
        });
        console.log('Absensi berhasil ditambahkan!');
      }
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating/adding absensi:', error);
    }
  };

  // Fungsi untuk buka modal dengan data absensi
  const openModal = (absensiData) => {
    setModalData(absensiData);
    setModalOpen(true);
  };

  // Fungsi untuk tutup modal
  const closeModal = () => {
    setModalOpen(false);
    setModalData(null);
  };

  // Build data tabel, tambah total denda per baris
  const buildTableData = () => {
    return terapis.map((t) => {
      let totalDenda = 0;
      const row = { name: t.name, totalDenda: 0 };

      dates.forEach((date) => {
        const match = absensi.find((a) => a.idUser === t.idUser && a.tanggal === date);
        const denda = match?.denda || 0;
        totalDenda += denda;

        if (match) {
          if (match.status === 'Hadir' && match.jamMasuk) {
            const jamMasuk = new Date(match.jamMasuk.seconds * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            row[date] = (
              <div className="flex flex-col items-center cursor-pointer" onClick={() => openModal({ ...match, name: t.name })} title="Klik untuk lihat detail">
                <div className="text-green-600 font-medium mb-1">Masuk =&gt; {jamMasuk}</div>
                {match.fotoMasuk && (
                  <img
                    src={match.fotoMasuk}
                    alt="Foto Masuk"
                    className="w-20 h-20 object-cover rounded shadow"
                  />
                )}
                {denda > 0 && (
                  <div className="text-red-600 font-semibold mt-1">Denda: Rp {denda.toLocaleString()}</div>
                )}
              </div>
            );
          } else {
            row[date] = (
              <div>
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
                {denda > 0 && (
                  <div className="text-red-600 font-semibold mt-1">Denda: Rp {denda.toLocaleString()}</div>
                )}
              </div>
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
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Absen">Absen</option>
              <option value="Cuti">Cuti</option>
            </select>
          );
        }
      });

      row.totalDenda = totalDenda;

      return row;
    });
  };

  const tableData = buildTableData();

  const formatDate = (date) => {
    return new Date(date).getDate().toString().padStart(2, '0');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      <h1 className="text-2xl font-bold mb-4">Rekap Absensi Karyawan</h1>

      <div className="flex gap-4 mb-6">
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
                  <th key={date} className="border px-4 py-2 bg-gray-100">{formatDate(date)}</th>
                ))}
                <th className="border px-4 py-2 bg-gray-200">Total Denda</th>
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
                  <td className="border px-4 py-2 text-right font-semibold text-red-600">
                    Rp {row.totalDenda.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="border px-4 py-2 font-bold text-right" colSpan={dates.length + 1}>
                  Total Denda Keseluruhan:
                </td>
                <td className="border px-4 py-2 font-bold text-right text-red-600">
                  Rp {tableData.reduce((sum, row) => sum + row.totalDenda, 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
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
            <p><strong>Nama Karyawan:</strong> {modalData.name}</p>
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
            {modalData.denda > 0 && (
              <p className="mt-2 font-semibold text-red-600">Denda: Rp {modalData.denda.toLocaleString()}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
