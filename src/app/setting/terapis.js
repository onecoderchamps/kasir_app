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
import { db } from '@/api/firebase';

export default function TerapisTable() {
  const [data, setData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    username: '',
    idOutlet: '',
    pin: '',
    role: 'Terapis',
    isActive: true,
  });

  useEffect(() => {
    const outlet = typeof window !== 'undefined' ? localStorage.getItem('idOutlet') : '';
    setForm((prev) => ({ ...prev, idOutlet: outlet }));
    fetchData();
  }, []);

  const fetchData = async () => {
    const outlet = typeof window !== 'undefined' ? localStorage.getItem('idOutlet') : '';
    const q = query(collection(db, 'Terapis'), where('idOutlet', '==', outlet));
    const snapshot = await getDocs(q);
    const result = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setData(result);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.pin.length !== 6) {
      alert('PIN harus terdiri dari 6 digit.');
      return;
    }

    const usernameExists = data.some(
      (item) => item.username === form.username && item.id !== editId
    );

    if (usernameExists) {
      alert('Username sudah digunakan. Silakan pilih username lain.');
      return;
    }

    if (editId) {
      await updateDoc(doc(db, 'Terapis', editId), form);
    } else {
      await addDoc(collection(db, 'Terapis'), form);
    }

    setForm({
      name: '',
      username: '',
      idOutlet: form.idOutlet,
      pin: '',
      role: 'Terapis',
      isActive: true,
    });
    setEditId(null);
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus terapis ini?');
    if (!confirmDelete) return;

    await deleteDoc(doc(db, 'Terapis', id));
    fetchData();
  };

  const handleEdit = (item) => {
    setForm(item);
    setEditId(item.id);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setForm({
      name: '',
      username: '',
      idOutlet: form.idOutlet,
      pin: '',
      role: 'Terapis',
      isActive: true,
    });
    setEditId(null);
    setIsModalOpen(true);
  };

  return (
    <div className="mx-auto h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Manajemen Terapis</h2>
        <button
          onClick={openNewModal}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Tambah Terapis
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

      <table className="w-full border table-auto text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Nama</th>
              <th className="p-2 border">Username</th>
              <th className="p-2 border">PIN</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  Belum ada dokumen terapis. Silakan tambahkan data.
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="text-center">
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2">{item.username}</td>
                  <td className="border p-2">{item.pin}</td>
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
            <h3 className="text-lg font-bold mb-4">{editId ? 'Edit' : 'Tambah'} Terapis</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="text"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full border p-2 rounded"
                required
              />
              <input
                type="text"
                placeholder="PIN"
                value={form.pin}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d{0,6}$/.test(value)) {
                    setForm({ ...form, pin: value });
                  }
                }}
                className="w-full border p-2 rounded"
                required
              />
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
