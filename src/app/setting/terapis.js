'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../api/firebase';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function TherapistTable() {
  const [therapists, setTherapists] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [openOutlet, setOpenOutlet] = useState(null);
  const [form, setForm] = useState({
    name: '',
    username: '',
    pin: '',
    role: 'Terapis',
    idOutlet: '',
    createdAt: Timestamp.now(),
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTherapists();
    fetchOutlets();
  }, []);

  // Fetch Therapists
  const fetchTherapists = async () => {
    const snapshot = await getDocs(collection(db, 'Terapis'));
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
    setTherapists(result);
  };

  // Fetch Outlets
  const fetchOutlets = async () => {
    const snapshot = await getDocs(collection(db, 'Outlet'));
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
    setOutlets(result);
  };

  // Check if username already exists
  const checkUsernameExistence = async (username) => {
    const q = query(collection(db, 'Terapis'), where('username', '==', username));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // Return true if the username exists
  };

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    // Validate PIN length
    if (form.pin.length !== 6) {
      setError('PIN harus terdiri dari 6 digit.');
      return;
    }

    const usernameExists = therapists.some(
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
      pin: '',
      role: 'Terapis',
      idOutlet: '',
      createdAt: Timestamp.now(),
    });
    setEditId(null);
    setIsModalOpen(false);
    fetchTherapists();
  };

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus terapis ini?')) return;
    await deleteDoc(doc(db, 'Terapis', id));
    fetchTherapists();
  };

  // Handle Edit
  const handleEdit = (item) => {
    setForm(item);
    setEditId(item.id);
    setIsModalOpen(true);
  };

  // Open New Modal
  const openNewModal = () => {
    setForm({
      name: '',
      username: '',
      pin: '',
      role: 'Terapis',
      idOutlet: '',
      createdAt: Timestamp.now(),
    });
    setEditId(null);
    setIsModalOpen(true);
  };

  // Toggle Outlet
  const toggleOutlet = (outletId) => {
    setOpenOutlet(openOutlet === outletId ? null : outletId);
  };

  return (
    <div className="mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manajemen Terapis</h2>
        <button
          onClick={openNewModal}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition"
        >
          + Tambah Terapis
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="space-y-4">
        {outlets.map((outlet) => {
          const filteredTherapists = therapists.filter(
            (therapist) => therapist.idOutlet === outlet.id
          );
          const isOpen = openOutlet === outlet.id;

          return (
            <div key={outlet.id} className="border rounded-xl shadow bg-white overflow-hidden">
              <button
                onClick={() => toggleOutlet(outlet.id)}
                className="w-full flex items-center justify-between px-5 py-3 text-left text-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                {outlet.nama}
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {isOpen && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {filteredTherapists.length === 0 ? (
                    <div className="text-center text-gray-400 col-span-full">
                      Tidak ada terapis di outlet ini.
                    </div>
                  ) : (
                    filteredTherapists.map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-xl p-4 shadow-sm hover:shadow-md transition bg-white flex flex-col justify-between"
                      >
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">{item.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{item.username}</p>
                        </div>
                        <div className="mt-4 flex justify-between items-center">
                          <div className="space-x-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-sm text-red-600 hover:underline"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 transition">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg animate-fade-in">
            <h3 className="text-xl font-bold mb-4">
              {editId ? 'Edit Terapis' : 'Tambah Terapis'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Terapis</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full mt-1 border p-2 rounded focus:ring focus:ring-blue-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full mt-1 border p-2 rounded focus:ring focus:ring-blue-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PIN</label>
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
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Outlet</label>
                <select
                  value={form.idOutlet}
                  onChange={(e) => setForm({ ...form, idOutlet: e.target.value })}
                  className="w-full mt-1 border p-2 rounded focus:ring focus:ring-blue-200"
                  required
                >
                  <option value="" disabled>Pilih Outlet</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded border border-gray-400 hover:bg-gray-100"
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
