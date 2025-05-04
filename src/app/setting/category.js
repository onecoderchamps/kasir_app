'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../api/firebase';


export default function CategoryTable() {
  const [outlets, setOutlets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    bg: 'bg-blue-400',
    createdAt: new Date(),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const snapshot = await getDocs(collection(db, 'Category'));
    const result = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt));
    setOutlets(result);
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (editId) {
      const { name, bg } = form; // exclude createdAt
      await updateDoc(doc(db, 'Category', editId), { name, bg });
    } else {
      await addDoc(collection(db, 'Category'), {
        ...form,
        createdAt: new Date(),
      });
    }
  
    setForm({
      name: '',
      bg: 'bg-blue-400',
      createdAt: new Date(),
    });
    setEditId(null);
    setIsModalOpen(false);
    fetchData();
  };
  

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus outlet ini?');
    if (!confirmDelete) return;

    await deleteDoc(doc(db, 'Category', id));
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
      bg: 'bg-blue-400',
      createdAt: new Date(),
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
          Tambah Category
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border table-auto text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Nama</th>
              {/* <th className="p-2 border">Latar Belakang</th> */}
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {outlets.length === 0 ? (
              <tr>
                <td colSpan="3" className="p-4 text-center text-gray-500">
                  Belum ada outlet. Silakan tambahkan data.
                </td>
              </tr>
            ) : (
              outlets.map((item) => (
                <tr key={item.id} className="text-center">
                  <td className="border p-2">{item.name}</td>
                  {/* <td className="border p-2">{item.bg}</td> */}
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
            <h3 className="text-lg font-bold mb-4">{editId ? 'Edit' : 'Tambah'} Outlet</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Nama Outlet"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border p-2 rounded"
                required
              />
              {/* <input
                type="text"
                placeholder="Latar Belakang (contoh: bg-blue-400)"
                value={form.bg}
                onChange={(e) => setForm({ ...form, bg: e.target.value })}
                className="w-full border p-2 rounded"
                required
              /> */}
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
