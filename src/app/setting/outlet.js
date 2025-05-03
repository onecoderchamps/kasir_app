'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/api/firebase';

export default function OutletTable() {
  const [outlets, setOutlets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    address: '',
    latitude: 0,
    longitude: 0,
    nama: '',
    isActive: true,
    createdAt: Timestamp.now(),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const snapshot = await getDocs(collection(db, 'Outlets'));
    const result = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setOutlets(result);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editId) {
      await updateDoc(doc(db, 'Outlets', editId), form);
    } else {
      await addDoc(collection(db, 'Outlets'), form);
    }

    setForm({
      address: '',
      latitude: 0,
      longitude: 0,
      nama: '',
      isActive: true,
      createdAt: Timestamp.now(),
    });
    setEditId(null);
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus outlet ini?');
    if (!confirmDelete) return;

    await deleteDoc(doc(db, 'Outlets', id));
    fetchData();
  };

  const handleEdit = (item) => {
    setForm(item);
    setEditId(item.id);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setForm({
      address: '',
      latitude: 0,
      longitude: 0,
      nama: '',
      isActive: true,
      createdAt: Timestamp.now(),
    });
    setEditId(null);
    setIsModalOpen(true);
  };

  return (
    <div className="mx-auto h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Manajemen Outlet</h2>
        <button
          onClick={openNewModal}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Tambah Outlet
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border table-auto text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Nama</th>
              <th className="p-2 border">Alamat</th>
              <th className="p-2 border">Koordinat</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {outlets.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Belum ada outlet. Silakan tambahkan data.
                </td>
              </tr>
            ) : (
              outlets.map((item) => (
                <tr key={item.id} className="text-center">
                  <td className="border p-2">{item.nama}</td>
                  <td className="border p-2">{item.address}</td>
                  <td className="border p-2">{`Lat: ${item.latitude}, Long: ${item.longitude}`}</td>
                  <td className="border p-2">{item.isActive ? 'Aktif' : 'Non-Aktif'}</td>
                  <td className="border p-2 space-x-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <div className="border-b mb-4 pb-3">
              <h3 className="text-lg font-bold">
                {editId ? 'Edit Outlet' : 'Tambah Outlet'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Input Nama Outlet */}
              <div>
                <label className="block font-semibold">Nama Outlet</label>
                <input
                  type="text"
                  placeholder="Nama Outlet"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>
              
              {/* Input Alamat */}
              <div>
                <label className="block font-semibold">Alamat</label>
                <input
                  type="text"
                  placeholder="Alamat"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>

              {/* Input Koordinat (Latitude & Longitude) */}
              <div className="flex space-x-2">
                <div className="w-full">
                  <label className="block font-semibold">Latitude</label>
                  <input
                    type="number"
                    placeholder="Latitude"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) })}
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>
                <div className="w-full">
                  <label className="block font-semibold">Longitude</label>
                  <input
                    type="number"
                    placeholder="Longitude"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) })}
                    className="w-full border p-2 rounded"
                    required
                  />
                </div>
              </div>

              {/* Checkbox Aktif */}
              <div className="flex items-center space-x-2">
                <label className="font-semibold">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  Aktif
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded border border-gray-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  {editId ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
