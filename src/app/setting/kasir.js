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


export default function UserTable() {
    const [users, setUsers] = useState([]);
    const [outlets, setOutlets] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({
        idOutlet: '',
        username: '',
        pin: '',
        role: 'Kasir',
    });

    useEffect(() => {
        fetchOutlets();
        fetchUsers();
    }, []);

    const fetchOutlets = async () => {
        const snapshot = await getDocs(collection(db, 'Outlet'));
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        setOutlets(data);
    };

    const fetchUsers = async () => {
        const snapshot = await getDocs(collection(db, 'User'));
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        setUsers(data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (editId) {
            await updateDoc(doc(db, 'User', editId), form);
        } else {
            await addDoc(collection(db, 'User'), form);
        }

        setForm({
            idOutlet: '',
            username: '',
            pin: '',
            role: 'Kasir',
        });
        setEditId(null);
        setIsModalOpen(false);
        fetchUsers();
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus pengguna ini?')) return;
        await deleteDoc(doc(db, 'User', id));
        fetchUsers();
    };

    const handleEdit = (item) => {
        setForm(item);
        setEditId(item.id);
        setIsModalOpen(true);
    };

    const openNewModal = () => {
        setForm({
            idOutlet: '',
            username: '',
            pin: '',
            role: 'Kasir',
        });
        setEditId(null);
        setIsModalOpen(true);
    };

    const getOutletName = (id) => {
        return outlets.find(outlet => outlet.id === id)?.nama || '—';
    };

    return (
        <div className="mx-auto h-screen">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Manajemen Pengguna</h2>
                <button
                    onClick={openNewModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Tambah Pengguna
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <table className="w-full border table-auto text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-2 border">Username</th>
                            <th className="p-2 border">PIN</th>
                            <th className="p-2 border">Role</th>
                            <th className="p-2 border">Outlet</th>
                            <th className="p-2 border">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-4 text-center text-gray-500">
                                    Belum ada pengguna.
                                </td>
                            </tr>
                        ) : (
                            users.map((item) => (
                                <tr key={item.id} className="text-center">
                                    <td className="border p-2">{item.username}</td>
                                    <td className="border p-2">{item.pin}</td>
                                    <td className="border p-2">{item.role}</td>
                                    <td className="border p-2">{getOutletName(item.idOutlet)}</td>
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
                        <h3 className="text-lg font-bold mb-4">{editId ? 'Edit' : 'Tambah'} Pengguna</h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
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
                            <select
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                                className="w-full border p-2 rounded"
                                required
                            >
                                <option value="Kasir">Kasir</option>
                                <option value="Admin">Admin</option>
                            </select>
                            <select
                                value={form.idOutlet}
                                onChange={(e) => setForm({ ...form, idOutlet: e.target.value })}
                                className="w-full border p-2 rounded"
                                required
                            >
                                <option value="">Pilih Outlet</option>
                                {outlets.map(outlet => (
                                    <option key={outlet.id} value={outlet.id}>
                                        {outlet.nama}
                                    </option>
                                ))}
                            </select>
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
