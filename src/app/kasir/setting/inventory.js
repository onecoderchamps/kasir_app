'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../../api/firebase';

const idOutlet = localStorage.getItem('idOutlet');

export default function InventoryTable() {
  const [inventory, setInventory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    nama: '',
    qty: 0,
    satuan: 'kg', // default satuan
    createdAt: new Date(),
  });

  const satuanOptions = ['kg', 'gram', 'liter', 'buah', 'pcs', 'pack', 'box']; // Pilihan satuan

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const q = query(collection(db, 'Inventory'), where('idOutlet', '==', idOutlet));
    const snapshot = await getDocs(q);
    const result = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt));
    setInventory(result);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editId) {
      const { name, qty, satuan } = form; // exclude createdAt
      await updateDoc(doc(db, 'Inventory', editId), { name, qty, satuan });
    } else {
      await addDoc(collection(db, 'Inventory'), {
        ...form,
        idOutlet,
        createdAt: new Date(),
      });
    }

    setForm({
      nama: '',
      qty: 0,
      satuan: 'kg', // reset default satuan to kg
      createdAt: new Date(),
    });
    setEditId(null);
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus bahan ini?');
    if (!confirmDelete) return;

    await deleteDoc(doc(db, 'Inventory', id));
    fetchData();
  };

  const handleEdit = (item) => {
    setForm(item);
    setEditId(item.id);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setForm({
      nama: '',
      qty: 0,
      satuan: 'kg', // default satuan
      createdAt: new Date(),
    });
    setEditId(null);
    setIsModalOpen(true);
  };

  return (
    <div className="mx-auto h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Manajemen Inventory</h2>
        <button
          onClick={openNewModal}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Tambah Bahan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border table-auto text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Nama Bahan</th>
              <th className="p-2 border">Jumlah Pemakaian</th>
              {/* <th className="p-2 border">Satuan</th> */}
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  Belum ada bahan. Silakan tambahkan data.
                </td>
              </tr>
            ) : (
              inventory.map((item) => (
                <tr key={item.id} className="text-center">
                  <td className="border p-2">{item.nama}</td>
                  <td className="border p-2">{item.qty}</td>
                  {/* <td className="border p-2">{item.satuan}</td> */}
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
            <h3 className="text-lg font-bold mb-4">{editId ? 'Edit' : 'Tambah'} Bahan</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Nama Bahan</label>
              <input
                type="text"
                placeholder="Nama Bahan"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="w-full border p-2 rounded"
                required
              />
              <label className="block text-sm font-medium text-gray-700">Jumlah Pemakaian</label>
              <input
                type="number"
                placeholder="Jumlah"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) })}
                className="w-full border p-2 rounded"
                required
              />
              {/* <label className="block text-sm font-medium text-gray-700">Satuan</label>
              <select
                value={form.satuan}
                onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                className="w-full border p-2 rounded"
                required
              >
                {satuanOptions.map((satuan) => (
                  <option key={satuan} value={satuan}>
                    {satuan}
                  </option>
                ))}
              </select> */}
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
