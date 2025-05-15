import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { collection, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../api/firebase';
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { TrashIcon, PlusIcon } from '@heroicons/react/24/solid';

const outlet = localStorage.getItem('idOutlet');

export default function History() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState([]);
    const [servicesList, setServicesList] = useState([]);

    // Cek sesi login
    useEffect(() => {
        const uid = localStorage.getItem('uid');
        const loginDate = localStorage.getItem('loginDate');

        if (!uid || !loginDate) {
            return window.location.href = '/';
        }

        const today = new Date();
        const login = new Date(loginDate);
        const sameDay = today.toDateString() === login.toDateString();

        if (!sameDay) {
            localStorage.removeItem('uid');
            localStorage.removeItem('loginDate');
            window.location.href = '/';
        }
    }, []);

    // Load data dari localStorage
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('transactions')) || [];
            const sorted = saved.sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(sorted);

            const staff = JSON.parse(localStorage.getItem('terapis')) || [];
            setStaffList(staff);

            const services = JSON.parse(localStorage.getItem('services')) || [];
            setServicesList(services);
        } catch (err) {
            console.error("Gagal memuat data dari localStorage:", err);
        }
    }, []);

    // Simpan transaksi ke Firestore
    const saveTransaksi = async () => {
        const saved = localStorage.getItem('transactions');
        const parsed = JSON.parse(saved || '[]');
        const failed = [];

        setLoading(true);

        for (const trx of parsed) {
            try {
                const trxData = {
                    ...trx,
                    date: Timestamp.fromDate(new Date(trx.date))
                };

                await setDoc(doc(collection(db, 'Transaksi'), trx.id.toString()), trxData);

                for (const item of trx.cart || []) {
                    for (const ingredient of item.ingredients || []) {
                        const ref = doc(db, 'Inventory', ingredient.id);
                        const snap = await getDoc(ref);

                        if (snap.exists()) {
                            const currentQty = snap.data().qty || 0;
                            const newQty = Math.max(currentQty - (ingredient.amount * item.qty), 0);
                            await updateDoc(ref, { qty: newQty });
                        }
                    }
                }
            } catch (error) {
                console.error(`Gagal simpan transaksi ID ${trx.id}:`, error);
                failed.push(trx);
            }
        }

        localStorage.setItem('transactions', JSON.stringify(failed));
        setTransactions(failed);

        alert(failed.length === 0
            ? 'Semua transaksi berhasil disimpan.'
            : `${failed.length} transaksi gagal disimpan. Lihat console untuk detail.`);

        setLoading(false);
    };

    // Handler perubahan field dan cart
    const handleFieldChange = (txId, field, value) => {
        const updated = transactions.map(tx => {
            if (tx.id === txId) {
                const updatedTx = { ...tx, [field]: field === 'tip' ? parseInt(value) || 0 : value };
                if (field === 'tip') updatedTx.total = (updatedTx.subtotal || 0) + updatedTx.tip;
                return updatedTx;
            }
            return tx;
        });
        setTransactions(updated);
        localStorage.setItem('transactions', JSON.stringify(updated));
    };

    const handlePriceChange = (txId, idx, value) => {
        const updated = transactions.map(tx => {
            if (tx.id === txId) {
                const cart = tx.cart.map((item, i) => i === idx ? { ...item, price: parseInt(value) } : item);
                const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
                return { ...tx, cart, subtotal, total: subtotal + (tx.tip || 0) };
            }
            return tx;
        });
        setTransactions(updated);
        localStorage.setItem('transactions', JSON.stringify(updated));
    };

    const handleServedByChange = (txId, idx, value) => {
        const updated = transactions.map(tx => {
            if (tx.id === txId) {
                const cart = tx.cart.map((item, i) => i === idx ? { ...item, servedBy: value } : item);
                return { ...tx, cart };
            }
            return tx;
        });
        setTransactions(updated);
        localStorage.setItem('transactions', JSON.stringify(updated));
    };

    const handleServiceChange = (txId, idx, serviceId) => {
        const service = servicesList.find(s => s.id === serviceId);
        if (!service) return;

        const updated = transactions.map(tx => {
            if (tx.id === txId) {
                const cart = tx.cart.map((item, i) =>
                    i === idx ? { ...item, ...service, serviceId: service.id } : item
                );
                const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
                return { ...tx, cart, subtotal, total: subtotal + (tx.tip || 0) };
            }
            return tx;
        });
        setTransactions(updated);
        localStorage.setItem('transactions', JSON.stringify(updated));
    };

    const handleAddCartItem = (txId) => {
        const updated = transactions.map(tx => {
            if (tx.id === txId) {
                const newItem = {
                    id: '', name: '', price: 0, qty: 1,
                    bg: '', desc: '', idCategory: '',
                    idOutlet: outlet, createdAt: Timestamp.now(),
                    servedBy: '', ingredients: [], idTransaction: tx.id
                };
                return { ...tx, cart: [...tx.cart, newItem] };
            }
            return tx;
        });
        setTransactions(updated);
        localStorage.setItem('transactions', JSON.stringify(updated));
    };

    const handleDeleteCartItem = (txId, idx) => {
        const updated = transactions.map(tx => {
            if (tx.id === txId) {
                const cart = tx.cart.filter((_, i) => i !== idx);
                const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
                return { ...tx, cart, subtotal, total: subtotal + (tx.tip || 0) };
            }
            return tx;
        });
        setTransactions(updated);
        localStorage.setItem('transactions', JSON.stringify(updated));
    };

    const formatDate = (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    const handleDeleteTransaction = (txId) => {
        if (!window.confirm('Yakin ingin menghapus transaksi ini?')) return;

        const updated = transactions.filter(tx => tx.id !== txId);
        setTransactions(updated);
        localStorage.setItem('transactions', JSON.stringify(updated));
    };

    return (
        <main className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <button onClick={() => window.history.back()} className="text-gray-700 hover:text-gray-900">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <h1 className="text-2xl font-bold">Transaksi</h1>
                </div>
                <button onClick={saveTransaksi} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
                    {loading ? 'Menyimpan...' : 'Update ke Server'}
                </button>
            </div>

            {transactions.length === 0 ? (
                <div className="text-gray-500 text-center">Belum ada transaksi.</div>
            ) : (
                <div className="overflow-auto">
                    <table className="min-w-full border text-sm">
                        <thead className="bg-gray-100 text-left">
                            <tr>
                                <th className="border p-2">Tanggal</th>
                                <th className="border p-2">Customer</th>
                                <th className="border p-2">No Hp</th>
                                <th className="border p-2">Treatment & Staff</th>
                                <th className="border p-2">Tip</th>
                                <th className="border p-2">Total</th>
                                <th className="border p-2">Metode</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(tx => (
                                <tr key={tx.id} className="bg-white">
                                    <td className="border p-2">{formatDate(tx.date)}</td>
                                    <td className="border p-2">
                                        <input type="text" value={tx.customerName || ''} onChange={(e) => handleFieldChange(tx.id, 'customerName', e.target.value)} className="border px-2 py-1 w-full rounded" />
                                    </td>
                                    <td className="border p-2">
                                        <input type="text" value={tx.customerPhone || ''} onChange={(e) => handleFieldChange(tx.id, 'customerPhone', e.target.value)} className="border px-2 py-1 w-full rounded" />
                                    </td>
                                    <td className="border p-2">
                                        <ul className="space-y-1">
                                            {tx.cart.map((item, idx) => (
                                                <li key={idx} className="flex items-center gap-1">
                                                    <select value={item.serviceId || ''} onChange={(e) => handleServiceChange(tx.id, idx, e.target.value)} className="border p-1 rounded w-44 text-sm">
                                                        <option value="">Pilih Treatment</option>
                                                        {servicesList.map(service => (
                                                            <option key={service.id} value={service.id}>{service.name}</option>
                                                        ))}
                                                    </select>
                                                    <select value={item.servedBy} onChange={(e) => handleServedByChange(tx.id, idx, e.target.value)} className="border p-1 rounded w-40 text-sm">
                                                        <option value="">Pilih Staff</option>
                                                        {staffList.map(staff => (
                                                            <option key={staff.id} value={staff.name}>{staff.name}</option>
                                                        ))}
                                                    </select>
                                                    - Rp
                                                    <input type="number" value={item.price} onChange={(e) => handlePriceChange(tx.id, idx, e.target.value)} className="ml-1 border p-1 w-24 text-sm rounded" />
                                                    <button onClick={() => handleDeleteCartItem(tx.id, idx)} className="text-red-500 hover:text-red-700">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </li>
                                            ))}
                                            <li>
                                                <button onClick={() => handleAddCartItem(tx.id)} className="flex items-center text-blue-500 hover:text-blue-700 text-sm">
                                                    <PlusIcon className="w-4 h-4 mr-1" /> Tambah
                                                </button>
                                            </li>
                                        </ul>
                                    </td>
                                    <td className="border p-2">
                                        <input type="number" value={tx.tip || 0} onChange={(e) => handleFieldChange(tx.id, 'tip', e.target.value)} className="border px-2 py-1 w-24 rounded" />
                                    </td>
                                    <td className="border p-2">Rp {tx.total.toLocaleString()}</td>
                                    <td className="border p-2">{tx.paymentMethod || '-'}</td>
                                    <td className="border p-2 text-center">
                                        <button
                                            onClick={() => handleDeleteTransaction(tx.id)}
                                            className="text-red-600 hover:text-red-800"
                                            title="Hapus Transaksi"
                                        >
                                            <TrashIcon className="w-5 h-5 inline" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}
