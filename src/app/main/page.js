'use client';
import { useState, useEffect } from 'react';
import { ClockIcon, UserCircleIcon, ArrowRightOnRectangleIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
// import categories from '../../dummy/category.json';
// import products from '../../dummy/layanan.json';
// import employees from '../../dummy/terapis.json';
import banks from '../../dummy/bank.json';
import edcMachines from '../../dummy/edc.json';
import Select from "react-select";
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/api/firebase';

export default function Home() {
    const router = useRouter();
    const [cart, setCart] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    const [cashGiven, setCashGiven] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedEDC, setSelectedEDC] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [coupon, setCoupon] = useState('');
    const [discount, setDiscount] = useState(0);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [outlet, setoutlet] = useState("POS");


    const fetchCategories = async () => {
        const snapshot = await getDocs(collection(db, 'Category'));
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
        const snapshot = await getDocs(collection(db, 'Services'));
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
        // fetchCategories();
        // fetchServices();
        // fetchTerapis();
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
        const cartWithTransactionId = cart.map(item => ({
            ...item,
            idTransaction: transactionId
        }));

        const newTransaction = {
            id: transactionId,
            date: new Date().toLocaleString(),
            customerName,
            customerPhone,
            cart: cartWithTransactionId,
            total,
            subtotal,
            coupon,
            discount,
            paymentMethod: selectedPayment,
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
        await fetchCategories();
        await fetchServices();
        await fetchTerapis();
        alert("Sudah update semua");
        window.location.reload();
    }    
    

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
                router.push('/');
            }
        } else {
            localStorage.removeItem('uid');
            localStorage.removeItem('loginDate');
            router.push('/');
        }
    }, [router]);

    return (
        <main className="p-6">
            <header className="flex justify-between items-center mb-6">
                {/* Kiri */}
                <div className="text-2xl font-bold m-4">
                    Outlet {outlet}
                </div>

                {/* Kanan */}
                <div className="flex gap-4 items-center text-gray-600">
                    <button className="btn btn-success" onClick={updateDatabase}>
                                Update Database
                            </button>
                    {/* History Icon */}
                    <button title="Riwayat" className="hover:text-primary cursor-pointer" onClick={() => window.open('/history', '_blank')}>
                        <ClockIcon className="h-6 w-6" />
                    </button>

                    {/* Laporan Icon */}
                    <button title="Laporan" className="hover:text-primary cursor-pointer" onClick={() => window.open('/omset', '_blank')}>
                        <ChartBarIcon className="h-6 w-6" />
                    </button>

                    {/* Akun Icon */}
                    <button title="Akun" className="hover:text-primary cursor-pointer" onClick={() => { localStorage.setItem('uid', ''); localStorage.setItem('loginDate', ''); router.push('/'); }}>
                        <ArrowRightOnRectangleIcon className="h-6 w-6" />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Produk */}
                <div className="p-4 md:col-span-2">
                    <div className="flex gap-2 mb-4 overflow-x-auto">
                        <button
                            className={`btn btn-sm ${selectedCategoryId === null ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setSelectedCategoryId(null)}
                        >
                            Semua
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                className={`btn btn-sm ${selectedCategoryId === category.id ? 'btn-primary' : 'btn-outline'}`}
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
                                                    {/* <div className="font-light text-sm">{product.desc}</div> */}
                                                    <div className="text-sm mt-1">Rp {product.price.toLocaleString()}</div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        ))}
                </div>

                {/* Keranjang */}
                <div className=" flex flex-col h-[calc(100vh-5rem)] p-4 md:col-span-1">

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
                                                    className="btn btn-xs btn-outline"
                                                    onClick={() => decrementQty(index)}
                                                >
                                                    ➖
                                                </button>
                                                <span>{item.qty}</span>
                                                <button
                                                    className="btn btn-xs btn-outline"
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

                    <div className="mt-4 sticky bottom-0 bg-base-100 py-4 ">
                        <div className="mb-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    placeholder="Masukkan kupon"
                                    value={coupon}
                                    onChange={(e) => setCoupon(e.target.value)}
                                />
                                <button className="btn btn-primary" onClick={validateCoupon}>
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
                        <button className="btn btn-success w-full" onClick={handlePayment}>
                            Bayar Sekarang
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full overflow-y-auto max-h-[90vh]">
                        <h2 className="text-xl font-bold mb-4">Informasi Pelanggan</h2>

                        {/* Input Nama dan Nomor */}
                        <div className="mb-6 space-y-2">
                            <div className="font-semibold">Nama Pelanggan:</div>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Masukkan nama pelanggan"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>

                        <div className="mb-6 space-y-2">
                            <div className="font-semibold">Nomor Ponsel:</div>
                            <input
                                type="tel"
                                className="input input-bordered w-full"
                                placeholder="Masukkan nomor ponsel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                            />
                        </div>

                        <h2 className="text-xl font-bold mb-4 mt-6">Pilih Metode Pembayaran</h2>

                        <div className="space-y-2 mb-6">
                            <button
                                onClick={() => setSelectedPayment('QRIS')}
                                className={`btn w-full ${selectedPayment === 'QRIS' ? 'btn-primary' : 'btn-outline'}`}
                            >
                                QRIS
                            </button>
                            <button
                                onClick={() => setSelectedPayment('Transfer')}
                                className={`btn w-full ${selectedPayment === 'Transfer' ? 'btn-primary' : 'btn-outline'}`}
                            >
                                Transfer
                            </button>
                            <button
                                onClick={() => setSelectedPayment('EDC')}
                                className={`btn w-full ${selectedPayment === 'EDC' ? 'btn-primary' : 'btn-outline'}`}
                            >
                                EDC
                            </button>
                            <button
                                onClick={() => setSelectedPayment('Tunai')}
                                className={`btn w-full ${selectedPayment === 'Tunai' ? 'btn-primary' : 'btn-outline'}`}
                            >
                                Tunai
                            </button>
                        </div>

                        {/* QRIS Barcode */}
                        {selectedPayment === 'QRIS' && (
                            <div className="flex justify-center mb-6">
                                <img src="https://media.perkakasku.id/image/qrperkakasku.jpeg" alt="QRIS" className="w-40 h-40 object-contain" />
                            </div>
                        )}

                        {/* Transfer Bank List */}
                        {selectedPayment === 'Transfer' && (
                            <div className="mb-6 space-y-2">
                                <div className="font-semibold mb-2">Pilih Bank:</div>
                                {banks.map((bank, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-lg border cursor-pointer ${selectedBank?.name === bank.name ? 'border-primary' : 'border-gray-300'}`}
                                        onClick={() => setSelectedBank(bank)}
                                    >
                                        <div className="font-bold">{bank.name}</div>
                                        <div className="text-sm">Atas Nama: {bank.accountName}</div>
                                        <div className="text-sm">No Rek: {bank.accountNumber}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedPayment === 'EDC' && (
                            <div className="mb-6 space-y-2">
                                <div className="font-semibold mb-2">Pilih EDC:</div>
                                {edcMachines.map((edc, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-lg border cursor-pointer ${selectedEDC?.name === edc.name ? 'border-primary' : 'border-gray-300'}`}
                                        onClick={() => setSelectedEDC(edc)}
                                    >
                                        <div className="font-bold">{edc.name}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tunai Input */}
                        {selectedPayment === 'Tunai' && (
                            <div className="mb-6 space-y-2">
                                <div className="font-semibold">Masukkan Uang Diterima:</div>
                                <input
                                    type="number"
                                    className="input input-bordered w-full"
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

                        <div className="mt-6 border-t pt-4">
                            <div className="text-lg font-bold text-center">
                                Total Bayar: Rp {total.toLocaleString()}
                            </div>
                        </div>

                        <div className="flex justify-between mt-4">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                                Batal
                            </button>
                            <button className="btn btn-success" onClick={confirmPayment}>
                                Konfirmasi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
