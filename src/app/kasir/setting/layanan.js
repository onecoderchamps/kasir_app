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
    where,
} from 'firebase/firestore';
import { db } from '../../../api/firebase';
import { ChevronDown, ChevronUp } from 'lucide-react';

const idOutlet = localStorage.getItem('idOutlet');

export default function ServiceTable() {

    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [openCategory, setOpenCategory] = useState(null);

    const [form, setForm] = useState({
        name: '',
        price: 0,
        bg: 'bg-blue-400',
        desc: '',
        idCategory: '',
        ingredients: [],
        createdAt: Timestamp.now(),
    });

    useEffect(() => {
        fetchData();
        fetchCategories();
        fetchInventory();
    }, []);

    const fetchData = async () => {
        const q = query(collection(db, 'Services'), where('idOutlet', '==', idOutlet));
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
        setServices(result);
    };

    const fetchCategories = async () => {
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

    const fetchInventory = async () => {
        const q = query(collection(db, 'Inventory'), where('idOutlet', '==', idOutlet));
        const snapshot = await getDocs(q);
        const result = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        setInventory(result);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editId) {
            await updateDoc(doc(db, 'Services', editId), form);
        } else {
            await addDoc(collection(db, 'Services'), {
                ...form,
                idOutlet,
                createdAt: new Date(),
            });
        }

        setForm({
            name: '',
            price: 0,
            bg: 'bg-blue-400',
            desc: '',
            idCategory: '',
            ingredients: [],
            createdAt: Timestamp.now(),
        });
        setEditId(null);
        setIsModalOpen(false);
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus layanan ini?')) return;
        await deleteDoc(doc(db, 'Services', id));
        fetchData();
    };

    const handleEdit = (item) => {
        setForm({
            ...item,
            ingredients: item.ingredients || [],
        });
        setEditId(item.id);
        setIsModalOpen(true);
    };

    const openNewModal = () => {
        setForm({
            name: '',
            price: 0,
            bg: 'bg-blue-400',
            desc: '',
            idCategory: '',
            ingredients: [],
            createdAt: Timestamp.now(),
        });
        setEditId(null);
        setIsModalOpen(true);
    };

    const toggleCategory = (categoryId) => {
        setOpenCategory(openCategory === categoryId ? null : categoryId);
    };

    return (
        <div className="mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Manajemen Layanan</h2>
                <button
                    onClick={openNewModal}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition"
                >
                    + Tambah Layanan
                </button>
            </div>

            <div className="space-y-4">
                {categories.map((category) => {
                    const filteredServices = services.filter(
                        (service) => service.idCategory === category.id
                    );
                    const isOpen = openCategory === category.id;

                    return (
                        <div key={category.id} className="border rounded-xl shadow bg-white overflow-hidden">
                            <button
                                onClick={() => toggleCategory(category.id)}
                                className="w-full flex items-center justify-between px-5 py-3 text-left text-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
                            >
                                {category.name}
                                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>

                            {isOpen && (
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    {filteredServices.length === 0 ? (
                                        <div className="text-center text-gray-400 col-span-full">
                                            Tidak ada layanan dalam kategori ini.
                                        </div>
                                    ) : (
                                        filteredServices.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`border rounded-xl p-4 shadow-sm hover:shadow-md transition ${item.bg} text-white`}
                                            >
                                                <div>
                                                    <h4 className="text-lg font-semibold text-white">{item.name}</h4>
                                                    <p className="text-sm text-white mt-1">{item.desc}</p>
                                                </div>
                                                <div className="mt-4 flex justify-between items-center">
                                                    <span className="text-white font-bold">
                                                        Rp {item.price.toLocaleString('id-ID')}
                                                    </span>
                                                    <div className="space-x-2">
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className="text-sm text-white hover:underline"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="text-sm text-white hover:underline"
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 transition">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
                        <h3 className="text-xl font-bold mb-4">
                            {editId ? 'Edit Layanan' : 'Tambah Layanan'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nama Layanan</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full mt-1 border p-2 rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Harga</label>
                                <input
                                    type="number"
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
                                    className="w-full mt-1 border p-2 rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Warna Latar</label>
                                <select
                                    value={form.bg}
                                    onChange={(e) => setForm({ ...form, bg: e.target.value })}
                                    className="w-full mt-1 border p-2 rounded"
                                >
                                    <option value="bg-blue-400">Biru</option>
                                    <option value="bg-green-400">Hijau</option>
                                    <option value="bg-red-400">Merah</option>
                                    <option value="bg-yellow-400">Kuning</option>
                                    <option value="bg-purple-400">Ungu</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Kategori</label>
                                <select
                                    value={form.idCategory}
                                    onChange={(e) => setForm({ ...form, idCategory: e.target.value })}
                                    className="w-full mt-1 border p-2 rounded"
                                    required
                                >
                                    <option value="" disabled>Pilih Kategori</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                                <textarea
                                    value={form.desc}
                                    onChange={(e) => setForm({ ...form, desc: e.target.value })}
                                    className="w-full mt-1 border p-2 rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Bahan yang digunakan</label>
                                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border p-2 rounded">
                                    {inventory.map((item) => {
                                        const isChecked = form.ingredients.some((ing) => ing.id === item.id);
                                        const amount = form.ingredients.find((ing) => ing.id === item.id)?.amount || 1;
                                        return (
                                            <label key={item.id} className="flex items-center justify-between space-x-2">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setForm((prevForm) => {
                                                                let updatedIngredients = [...prevForm.ingredients];
                                                                if (checked) {
                                                                    updatedIngredients.push({ id: item.id, amount: 1 });
                                                                } else {
                                                                    updatedIngredients = updatedIngredients.filter((ing) => ing.id !== item.id);
                                                                }
                                                                return { ...prevForm, ingredients: updatedIngredients };
                                                            });
                                                        }}
                                                    />
                                                    <span>{`${item.nama} ( ${item.qty} Sisa Pemakaian )`}</span>
                                                </div>
                                                {isChecked && (
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={amount}
                                                        onChange={(e) => {
                                                            const value = parseFloat(e.target.value) || 1;
                                                            setForm((prevForm) => ({
                                                                ...prevForm,
                                                                ingredients: prevForm.ingredients.map((ing) =>
                                                                    ing.id === item.id ? { ...ing, amount: value } : ing
                                                                ),
                                                            }));
                                                        }}
                                                        className="w-16 border p-1 rounded text-right"
                                                    />
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
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
