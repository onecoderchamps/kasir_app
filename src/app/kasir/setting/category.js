'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  where,
  query,
} from 'firebase/firestore';
import { db } from '../../../api/firebase';

const idOutlet = typeof window !== 'undefined' ? localStorage.getItem('idOutlet') : null;

export default function CategoryTable() {
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initialForm());

  function initialForm() {
    return {
      name: '',
      bg: 'bg-blue-400',
      target: 0,
      createdAt: new Date(),
    };
  }

  useEffect(() => {
    if (idOutlet) fetchData();
  }, []);

  const fetchData = async () => {
    const q = query(collection(db, 'Category'), where('idOutlet', '==', idOutlet));
    const snapshot = await getDocs(q);
    const result = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort(
        (a, b) =>
          new Date(a.createdAt?.toDate?.() || a.createdAt) -
          new Date(b.createdAt?.toDate?.() || b.createdAt)
      );
    setCategories(result);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { name, bg, target } = form;

    if (editId) {
      await updateDoc(doc(db, 'Category', editId), { name, bg, target });
    } else {
      await addDoc(collection(db, 'Category'), {
        ...form,
        idOutlet,
        createdAt: new Date(),
      });
    }

    resetForm();
    fetchData();
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus kategori ini?');
    if (!confirmDelete) return;

    await deleteDoc(doc(db, 'Category', id));
    fetchData();
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name || '',
      bg: item.bg || 'bg-blue-400',
      target: item.target || 0,
      createdAt: item.createdAt || new Date(),
    });
    setEditId(item.id);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setForm(initialForm());
    setEditId(null);
    setIsModalOpen(false);
  };

  return (
    <div className="mx-auto h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Manajemen Kategori</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Tambah Kategori
        </button>
      </div>

      <div className="overflow-y-auto">
        <table className="w-full border table-auto text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Nama</th>
              <th className="p-2 border">Target</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-500">
                  Belum ada kategori. Silakan tambahkan data.
                </td>
              </tr>
            ) : (
              categories.map((item) => (
                <tr key={item.id} className="text-center">
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2">Rp {item.target.toLocaleString('id-ID')}</td>
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
            <h3 className="text-lg font-bold mb-4">
              {editId ? 'Edit' : 'Tambah'} Kategori
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama</label>
                <input
                  type="text"
                  placeholder="Nama Kategori"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Target</label>
                <input
                  type="text"
                  placeholder="Target (contoh: 10.000)"
                  value={form.target.toLocaleString('id-ID')}
                  onChange={(e) => {
                    // Hapus karakter selain angka
                    const rawValue = e.target.value.replace(/[^0-9]/g, '');
                    // Parse ke number, default 0 jika kosong
                    const numberValue = rawValue ? parseInt(rawValue, 10) : 0;
                    setForm({ ...form, target: numberValue });
                  }}
                  className="w-full border p-2 rounded"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
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
