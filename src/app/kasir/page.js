import { useState, useEffect } from 'react';
import { ClockIcon, UserCircleIcon, ArrowRightOnRectangleIcon, ChartBarIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import banks from '../../dummy/bank.json';
import edcMachines from '../../dummy/edc.json';
import Select from "react-select";
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../api/firebase';

const idOutlet = localStorage.getItem('idOutlet');

export default function HomeBase() {
    const [cart, setCart] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState('');
    const [selectedTipPayment, setSelectedTipPayment] = useState('');

    const [selectedBank, setSelectedBank] = useState('');
    const [cashGiven, setCashGiven] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedEDC, setSelectedEDC] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [coupon, setCoupon] = useState('');
    const [discount, setDiscount] = useState(0);
    const [tip, setTip] = useState(0);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [outlet, setoutlet] = useState("POS");
    const [inventory, setInventory] = useState([]);

    const fetchInventory = async () => {
        const q = query(collection(db, 'Inventory'), where('idOutlet', '==', idOutlet));
        const snapshot = await getDocs(q);
        const result = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        // setInventory(result);
        localStorage.setItem('inventory', JSON.stringify(result));
    };

    const fetchCategories = async () => {
        const q = query(collection(db, 'Category'), where('idOutlet', '==', idOutlet));
        const snapshot = await getDocs(q);
        const result = snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            .sort((a, b) => new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt));
        // setCategories(result);
        localStorage.setItem('categories', JSON.stringify(result));

    };

    const fetchServices = async () => {
        const q = query(collection(db, 'Services'), where('idOutlet', '==', idOutlet));
        const snapshot = await getDocs(q);
        const result = snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            .sort((a, b) => new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt));
        // setProducts(result);
        localStorage.setItem('services', JSON.stringify(result));

    };

    const fetchTerapis = async () => {
        const idOutlet = localStorage.getItem('idOutlet');
        const q = query(collection(db, 'Terapis'), where('idOutlet', '==', idOutlet));
        const querySnapshot = await getDocs(q);
        const result = querySnapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            .sort((a, b) => new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt));
        // setEmployees(result);
        localStorage.setItem('terapis', JSON.stringify(result));
    };

    useEffect(() => {
        const categories = localStorage.getItem('categories');
        if (categories) {
            setCategories(JSON.parse(categories));
        }
        const services = localStorage.getItem('services');
        if (services) {
            setProducts(JSON.parse(services));
        }
        const trapis = localStorage.getItem('terapis');
        if (trapis) {
            setEmployees(JSON.parse(trapis));
        }
        const inventory = localStorage.getItem('inventory');
        if (inventory) {
            setInventory(JSON.parse(inventory));
        }

        const storedCart = localStorage.getItem('cart');
        const outlet = localStorage.getItem('outlet');
        setoutlet(outlet);
        if (storedCart) {
            setCart(JSON.parse(storedCart));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product) => {
        const foundIndex = cart.findIndex(item => item.id === product.id);
        if (foundIndex !== -1) {
            const updatedCart = [...cart];
            updatedCart[foundIndex].qty += 1;
            setCart(updatedCart);
        } else {
            setCart([...cart, { ...product, qty: 1, servedBy: '' }]);
        }
    };

    const validateCoupon = () => {
        // Misal kupon-kupon yang valid
        if (coupon === 'ROYAL1') {
            setDiscount(21.35);
            alert('Kupon berhasil digunakan! Diskon 10%');
        } else if (coupon === 'ROYAL2') {
            setDiscount(20);
            alert('Kupon berhasil digunakan! Diskon 20%');
        } else {
            setDiscount(0);
            alert('Kupon tidak valid.');
        }
    };

    const incrementQty = (index) => {
        const updatedCart = [...cart];
        updatedCart[index].qty += 1;
        setCart(updatedCart);
    };

    const decrementQty = (index) => {
        const updatedCart = [...cart];
        if (updatedCart[index].qty === 1) {
            updatedCart.splice(index, 1);
        } else {
            updatedCart[index].qty -= 1;
        }
        setCart(updatedCart);
    };

    function roundUpToNearest(value, nearest) {
        return Math.ceil(value / nearest) * nearest;
    }

    const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
    const total = roundUpToNearest(subtotal - (subtotal * discount / 100), 1000);
    const change = cashGiven ? parseInt(cashGiven) - total : 0;

    const handlePayment = () => {
        if (cart.length === 0) {
            alert('Keranjang kosong!');
            return;
        }
        setShowModal(true);
    };

    const saveTransaction = () => {
        const idOutlet = localStorage.getItem('idOutlet');
        const existingTransactions = JSON.parse(localStorage.getItem('transactions')) || [];
        const transactionId = Date.now();
        const treatmentNames = cart.map(item => item.name).join(", ");

        const cartWithTransactionId = cart.flatMap(item => {
            const servedByList = item.servedBy ? item.servedBy.split(",").map(s => s.trim()) : [];
        
            if (servedByList.length > 1) {
                const splitPrice = Math.floor(item.price / servedByList.length);
                return servedByList.map(name => ({
                    ...item,
                    servedBy: name,
                    price: splitPrice,
                    serviceId: item.id,
                    idTransaction: transactionId
                }));
            }
        
            return [{
                ...item,
                serviceId: item.id,
                idTransaction: transactionId
            }];
        });
        const newTransaction = {
            id: transactionId,
            date: new Date().toLocaleString(),
            customerName,
            customerPhone,
            treatment: treatmentNames,
            cart: cartWithTransactionId,
            tip: parseInt(tip),
            total,
            subtotal,
            coupon,
            discount,
            paymentMethod: selectedPayment,
            paymentTipMethod: selectedPayment,
            idOutlet: idOutlet,
            bank: selectedPayment === 'Transfer' ? selectedBank : selectedPayment === 'EDC' ? selectedEDC : null,
            cashGiven: selectedPayment === 'Tunai' ? cashGiven : null,
            change: selectedPayment === 'Tunai' ? change : null,
        };

        existingTransactions.push(newTransaction);
        localStorage.setItem('transactions', JSON.stringify(existingTransactions));
        alert("Terimakasih, transaksi berhasil disimpan!");
    };


    const updateDatabase = async () => {
        const confirmed = window.confirm(
            "PERHATIAN!\n\nMelakukan update data akan me-refresh kasir ini secara otomatis dan mengambil data terbaru dari server.\n\nSilakan CEK KEMBALI apakah ada layanan, harga, atau data lain yang berubah setelah update.\n\nLanjutkan update?"
        );

        if (!confirmed) return;

        await fetchCategories();
        await fetchServices();
        await fetchTerapis();
        await fetchInventory();

        alert("Data berhasil diperbarui dari server.");
        window.location.reload();
    };


    const confirmPayment = () => {
        if (!customerName.trim() || !customerPhone.trim()) {
            alert('Nama pelanggan dan nomor ponsel wajib diisi!');
            return;
        }

        if (!selectedPayment) {
            alert('Pilih metode pembayaran dulu!');
            return;
        }

        if (selectedPayment === 'Transfer' && !selectedBank) {
            alert('Pilih bank dulu!');
            return;
        }

        if (selectedPayment === 'Tunai' && (parseInt(cashGiven) < total)) {
            alert('Uang yang diberikan kurang!');
            return;
        }

        if (selectedPayment === 'EDC' && !selectedEDC) {
            alert('Pilih mesin EDC dulu!');
            return;
        }

        saveTransaction();
        setCart([]);
        setSelectedPayment('');
        setSelectedTipPayment('');
        setTip(0);
        setSelectedBank('');
        setCashGiven('');
        setCustomerName('');
        setCustomerPhone('');
        setSelectedEDC('');
        setDiscount(0);
        setCoupon('');
        setShowModal(false);
        localStorage.removeItem('cart');
    };

    const options = employees.map((emp) => ({
        value: emp.name,
        label: emp.name,
    }));

    useEffect(() => {
        const uid = localStorage.getItem('uid');
        const loginDate = localStorage.getItem('loginDate');

        if (uid && loginDate) {
            const today = new Date();
            const login = new Date(loginDate);

            const sameDay =
                today.getFullYear() === login.getFullYear() &&
                today.getMonth() === login.getMonth() &&
                today.getDate() === login.getDate();

            if (!sameDay) {
                localStorage.removeItem('uid');
                localStorage.removeItem('loginDate');
                window.location.href = '/';
            }
        } else {
            localStorage.removeItem('uid');
            localStorage.removeItem('loginDate');
            window.location.href = '/';
        }
    }, []);

    useEffect(() => {
        const fetchUser = async () => {
            const uid = localStorage.getItem('uid');
            if (!uid) {
                window.history.back();
                return;
            }
            try {
                const userRef = doc(db, 'User', uid); // 'users' adalah nama koleksi
                const userSnap = await getDoc(userRef);
                if (!userSnap.exists()) {
                    console.log('No such document!');
                    window.history.back();
                    return;
                }
                if (userSnap.data().role !== 'Kasir') {
                    window.history.back()
                }
            } catch (error) {
                console.error('Error fetching user:', error);
            }
        };
        fetchUser();
    }, []);

    const [editForm, setEditForm] = useState(null);
    const [editMode, setEditMode] = useState(false);

    ////crud local
    const handleEdit = (product) => {
        setEditForm(product); // Tampilkan modal edit
    };

    const handleDelete = (id) => {
        const confirmDelete = window.confirm("Yakin ingin menghapus item?");
        if (!confirmDelete) return;

        const updated = products.filter((item) => item.id !== id);
        setProducts(updated); // update state view
        localStorage.setItem('services', JSON.stringify(updated)); // update storage
    };

    const handleUpdate = () => {
        const updated = products.map((item) =>
            item.id === editForm.id ? editForm : item
        );
        setProducts(updated);
        localStorage.setItem('services', JSON.stringify(updated));
        setEditForm(null);
    };

    useEffect(() => {
        const saved = localStorage.getItem('services');
        if (saved) setProducts(JSON.parse(saved));
    }, []);

    return (
        <main className="p-6">
            <header className="flex justify-between items-center mb-6">
                {/* Kiri */}
                <div className="text-2xl font-bold m-4">
                    Kasir
                </div>

                {/* Kanan */}
                <div className="flex gap-4 items-center text-gray-600">
                    {editMode &&
                        <button
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            onClick={updateDatabase}
                        >
                            Update Database
                        </button>
                    }
                    <div className="flex items-center space-x-2">
                        <label htmlFor="editToggle" className="text-sm">Update Mode</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="editToggle"
                                className="sr-only peer"
                                checked={editMode}
                                onChange={() => setEditMode(!editMode)}
                            />
                            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition duration-300"></div>
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md transition peer-checked:translate-x-full"></div>
                        </label>
                    </div>

                    {/* History Icon */}
                    <button
                        title="Riwayat"
                        className="hover:text-blue-500 cursor-pointer"
                        onClick={() => window.location.href = '/history'}
                    >
                        <ClockIcon className="h-6 w-6" />
                    </button>

                    {/* Laporan Icon */}
                    {/* <button
                        title="Laporan"
                        className="hover:text-blue-500 cursor-pointer"
                        onClick={() => window.location.href = '/omset'}
                    >
                        <ChartBarIcon className="h-6 w-6" />
                    </button> */}

                    {/* Laporan Icon */}
                    <button
                        title="Pengaturan"
                        className="hover:text-blue-500 cursor-pointer"
                        onClick={() => window.location.href = '/settingKasir'}
                    >
                        <Cog6ToothIcon className="h-6 w-6" />
                    </button>

                    {/* Akun Icon */}
                    <button
                        title="Akun"
                        className="hover:text-blue-500 cursor-pointer"
                        onClick={() => {
                            localStorage.setItem('uid', '');
                            localStorage.setItem('loginDate', '');
                            window.location.href = '/';
                        }}
                    >
                        <ArrowRightOnRectangleIcon className="h-6 w-6" />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Produk */}
                <div className="p-4 md:col-span-2">
                    <div className="flex gap-2 mb-4 overflow-x-auto">
                        <button
                            className={`px-4 py-2 ${selectedCategoryId === null ? 'bg-blue-500 text-white' : 'bg-transparent text-gray-600 border border-gray-300'} rounded-lg`}
                            onClick={() => setSelectedCategoryId(null)}
                        >
                            Semua
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                className={`px-4 py-2 ${selectedCategoryId === category.id ? 'bg-blue-500 text-white' : 'bg-transparent text-gray-600 border border-gray-300'} rounded-lg`}
                                onClick={() => setSelectedCategoryId(category.id)}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                    <h2 className="text-2xl font-semibold mb-4">Daftar Layanan</h2>
                    {categories
                        .filter((cat) => selectedCategoryId === null || cat.id === selectedCategoryId)
                        .map((category) => (
                            <div key={category.id} className="mb-6">
                                <div
                                    className="flex justify-between items-center cursor-pointer p-2 bg-gray-100 rounded"
                                    onClick={() =>
                                        setExpandedCategories((prev) => ({
                                            ...prev,
                                            [category.id]: !prev[category.id],
                                        }))
                                    }
                                >
                                    <h3 className="text-lg font-bold">{category.name}</h3>
                                    <span>{expandedCategories[category.id] ? '🔽' : '▶️'}</span>
                                </div>

                                {expandedCategories[category.id] && (
                                    <div className="grid grid-cols-4 gap-4 mt-2">
                                        {products
                                            .filter((product) => product.idCategory === category.id)
                                            .map((product) => (
                                                <div
                                                    key={product.id}
                                                    className={`p-4 rounded-lg text-white cursor-pointer text-left ${product.bg}`}
                                                    onClick={() => addToCart(product)}
                                                >
                                                    <div className="font-bold">{product.name}</div>
                                                    <div className="text-sm mt-1">Rp {product.price.toLocaleString()}</div>
                                                    {/* Tombol edit dan hapus */}
                                                    {editMode &&
                                                        <div className="mt-5 space-x-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEdit(product);
                                                                }}
                                                                className="bg-yellow-400 text-xs px-2 py-1 rounded"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(product.id);
                                                                }}
                                                                className="bg-red-500 text-xs px-2 py-1 rounded"
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    }
                                                </div>
                                            ))}
                                    </div>
                                )}
                                {editForm && (
                                    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                                        <div className="bg-white p-6 rounded-lg w-full max-w-sm">
                                            <h2 className="text-lg font-bold mb-4">Edit Produk</h2>
                                            <input
                                                type="text"
                                                placeholder="Nama"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full border px-3 py-2 mb-2"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Harga"
                                                value={editForm.price}
                                                onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                                                className="w-full border px-3 py-2  mb-4"
                                            />
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Warna Latar</label>
                                                <select
                                                    value={editForm.bg}
                                                    onChange={(e) => setEditForm({ ...editForm, bg: e.target.value })}
                                                    className="w-full mt-1 border p-2 rounded  mb-4"
                                                >
                                                    <option value="bg-blue-400">Biru</option>
                                                    <option value="bg-green-400">Hijau</option>
                                                    <option value="bg-red-400">Merah</option>
                                                    <option value="bg-yellow-400">Kuning</option>
                                                    <option value="bg-purple-400">Ungu</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-4">Bahan yang digunakan</label>
                                                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border p-2 rounded">
                                                    {inventory.map((item) => {
                                                        const isChecked = editForm.ingredients.some((ing) => ing.id === item.id);
                                                        const amount = editForm.ingredients.find((ing) => ing.id === item.id)?.amount || 1;
                                                        return (
                                                            <label key={item.id} className="flex items-center justify-between space-x-2">
                                                                <div className="flex items-center space-x-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={(e) => {
                                                                            const checked = e.target.checked;
                                                                            setEditForm((prevForm) => {
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
                                                                    <span>{`${item.nama}`}</span>
                                                                </div>
                                                                {isChecked && (
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={amount}
                                                                        onChange={(e) => {
                                                                            const value = parseFloat(e.target.value) || 1;
                                                                            setEditForm((prevForm) => ({
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
                                            <div className="flex justify-end space-x-2">
                                                <button onClick={() => setEditForm(null)} className="px-4 py-2 border rounded">
                                                    Batal
                                                </button>
                                                <button
                                                    onClick={handleUpdate}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded"
                                                >
                                                    Simpan
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                </div>

                {/* Keranjang */}
                <div className="flex flex-col h-[calc(100vh-5rem)] p-4 md:col-span-1">
                    <h2 className="text-2xl font-semibold mb-4">Keranjang</h2>

                    <div className="flex-1 overflow-y-auto pr-2">
                        {cart.length === 0 ? (
                            <div className="text-gray-500">Belum ada layanan dipilih.</div>
                        ) : (
                            <div className="space-y-4">
                                {cart.map((item, index) => (
                                    <div key={index} className="flex flex-col border-b pb-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium">{item.name}</div>
                                                <div className="text-sm text-gray-500">
                                                    Rp {item.price.toLocaleString()} x {item.qty}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    className="px-2 py-1 border border-gray-300 rounded-lg hover:bg-gray-200"
                                                    onClick={() => decrementQty(index)}
                                                >
                                                    ➖
                                                </button>
                                                <span>{item.qty}</span>
                                                <button
                                                    className="px-2 py-1 border border-gray-300 rounded-lg hover:bg-gray-200"
                                                    onClick={() => incrementQty(index)}
                                                >
                                                    ➕
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <Select
                                                isMulti
                                                className="w-full text-sm"
                                                classNamePrefix="react-select"
                                                options={options}
                                                value={
                                                    (item.servedBy?.split(',').filter(Boolean) || []).map(name => ({
                                                        value: name,
                                                        label: name,
                                                    }))
                                                }
                                                onChange={(selectedOptions) => {
                                                    const selectedNames = selectedOptions.map((opt) => opt.value);
                                                    const updatedCart = [...cart];
                                                    updatedCart[index].servedBy = selectedNames.join(',');
                                                    setCart(updatedCart);
                                                }}
                                                placeholder="Pilih terapis"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-4 sticky bottom-0 bg-white py-4">
                        <div className="mb-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="px-4 py-2 border border-gray-300 rounded-lg w-full"
                                    placeholder="Masukkan kupon"
                                    value={coupon}
                                    onChange={(e) => setCoupon(e.target.value)}
                                />
                                <button
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                    onClick={validateCoupon}
                                >
                                    Pakai
                                </button>
                            </div>
                            {discount > 0 && (
                                <div className="text-green-600 text-sm mt-2">
                                    Diskon {discount}% diterapkan
                                </div>
                            )}
                        </div>
                        <div className="text-sm text-gray-500">
                            Subtotal: Rp {subtotal.toLocaleString()}
                        </div>
                        {discount > 0 && (
                            <div className="text-sm text-green-600">
                                Diskon: {discount}%
                            </div>
                        )}
                        <div className="font-bold text-lg mb-2">
                            Total: Rp {total.toLocaleString()}
                        </div>
                        <button
                            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            onClick={handlePayment}
                        >
                            Bayar Sekarang
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md max-h-[90vh] rounded-lg p-6 overflow-y-auto shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Informasi Pelanggan</h2>

                        {/* Input Nama */}
                        <div className="mb-4">
                            <label className="block font-semibold mb-1">Nama Pelanggan:</label>
                            <input
                                type="text"
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                                placeholder="Masukkan nama pelanggan"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>

                        {/* Input Nomor */}
                        <div className="mb-6">
                            <label className="block font-semibold mb-1">Nomor Ponsel:</label>
                            <input
                                type="tel"
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                                placeholder="Masukkan nomor ponsel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                            />
                        </div>

                        <h2 className="text-xl font-bold mb-4">Pilih Metode Pembayaran</h2>

                        {/* Tombol Pilihan */}
                        <div className="space-y-2 mb-6">
                            {['Transfer', 'EDC', 'Tunai'].map((method) => (
                                <button
                                    key={method}
                                    onClick={() => setSelectedPayment(method)}
                                    className={`w-full px-4 py-2 rounded font-semibold border ${selectedPayment === method
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                        }`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>

                        {/* Transfer */}
                        {selectedPayment === 'Transfer' && (
                            <div className="space-y-2 mb-6">
                                <label className="font-semibold">Pilih Bank:</label>
                                {banks.map((bank, i) => (
                                    <div
                                        key={i}
                                        className={`p-4 border rounded-lg cursor-pointer ${selectedBank?.name === bank.name ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                            }`}
                                        onClick={() => setSelectedBank(bank)}
                                    >
                                        <div className="font-bold">{bank.name}</div>
                                        <div className="text-sm">Atas Nama: {bank.accountName}</div>
                                        <div className="text-sm">No Rek: {bank.accountNumber}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* EDC */}
                        {selectedPayment === 'EDC' && (
                            <div className="space-y-2 mb-6">
                                <label className="font-semibold">Pilih EDC:</label>
                                {edcMachines.map((edc, i) => (
                                    <div
                                        key={i}
                                        className={`p-4 border rounded-lg cursor-pointer ${selectedEDC?.name === edc.name ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                            }`}
                                        onClick={() => setSelectedEDC(edc)}
                                    >
                                        <div className="font-bold">{edc.name}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tunai */}
                        {selectedPayment === 'Tunai' && (
                            <div className="mb-6">
                                <label className="font-semibold mb-1 block">Masukkan Uang Diterima:</label>
                                <input
                                    type="number"
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Masukkan nominal uang"
                                    value={cashGiven}
                                    onChange={(e) => setCashGiven(e.target.value)}
                                />
                                {cashGiven && (
                                    <div className="mt-2 text-green-600">
                                        Kembalian: Rp {change > 0 ? change.toLocaleString() : 0}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Input Nomor */}
                        <div className="mb-6">
                            <label className="block font-semibold mb-1">TIP:</label>
                            <input
                                type="tel"
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                                placeholder="Masukkan tip"
                                value={tip}
                                onChange={(e) => setTip(e.target.value)}
                            />
                        </div>

                        {parseInt(tip) > 0 &&
                            <><h2 className="text-xl font-bold mb-4">Pilih Metode Pembayaran Tip</h2><div className="space-y-2 mb-6">
                                {['Transfer', 'EDC', 'Tunai'].map((method) => (
                                    <button
                                        key={method}
                                        onClick={() => setSelectedTipPayment(method)}
                                        className={`w-full px-4 py-2 rounded font-semibold border ${selectedTipPayment === method
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                                    >
                                        {method}
                                    </button>
                                ))}
                            </div></>
                        }

                        <div className="border-t pt-4 mt-4">
                            <div className="text-lg font-bold text-center">
                                Total Bayar: Rp {(total + parseInt(tip)).toLocaleString()}
                            </div>
                        </div>

                        <div className="flex justify-between mt-4">
                            <button className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={() => setShowModal(false)}>
                                Batal
                            </button>
                            <button className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700" onClick={confirmPayment}>
                                Konfirmasi
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </main>

    );
}
