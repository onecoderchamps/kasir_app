'use client';
import { useState, useEffect } from 'react';

export default function Home() {
    const [cart, setCart] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    const [cashGiven, setCashGiven] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

    const [products] = useState([
        { id: 1, name: 'Cuci Mobil', price: 50000, bg: 'bg-blue-400' },
        { id: 2, name: 'Salon Mobil', price: 150000, bg: 'bg-green-400' },
        { id: 3, name: 'Ganti Oli', price: 80000, bg: 'bg-yellow-400' },
        { id: 4, name: 'Cuci Motor', price: 30000, bg: 'bg-purple-400' },
    ]);

    const employees = [
        { name: 'Budi' },
        { name: 'Ani' },
        { name: 'Cici' },
    ];

    const banks = [
        { name: 'BCA', accountName: 'Hilman Zu', accountNumber: '1234567890' },
        { name: 'Mandiri', accountName: 'Hilman Zu', accountNumber: '9876543210' },
        { name: 'BRI', accountName: 'Hilman Zu', accountNumber: '5678901234' },
        { name: 'BNI', accountName: 'Hilman Zu', accountNumber: '4321098765' },
    ];

    useEffect(() => {
        const storedCart = localStorage.getItem('cart');
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

    const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
    const change = cashGiven ? parseInt(cashGiven) - total : 0;

    const handlePayment = () => {
        if (cart.length === 0) {
            alert('Keranjang kosong!');
            return;
        }
        setShowModal(true);
    };

    const saveTransaction = () => {
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
            paymentMethod: selectedPayment,
            bank: selectedPayment === 'Transfer' ? selectedBank : null,
            cashGiven: selectedPayment === 'Tunai' ? cashGiven : null,
            change: selectedPayment === 'Tunai' ? change : null,
        };

        existingTransactions.push(newTransaction);
        localStorage.setItem('transactions', JSON.stringify(existingTransactions));
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

        saveTransaction();
        setCart([]);
        setSelectedPayment('');
        setSelectedBank('');
        setCashGiven('');
        setCustomerName('');
        setCustomerPhone('');
        setShowModal(false);
        localStorage.removeItem('cart');
    };

    return (
        <main className="p-6">
            <h1 className="text-3xl font-bold mb-6">POS Layanan</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Produk */}
                <div className="card bg-base-100 shadow-xl p-4 md:col-span-2">
                    <h2 className="text-2xl font-semibold mb-4">Daftar Layanan</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className={`p-4 rounded-lg text-white cursor-pointer text-center ${product.bg}`}
                                onClick={() => addToCart(product)}
                            >
                                <div className="font-bold">{product.name}</div>
                                <div className="text-sm mt-1">Rp {product.price.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Keranjang */}
                <div className="card bg-base-100 shadow-xl flex flex-col h-[calc(100vh-5rem)] p-4 md:col-span-1">
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
                                            <select
                                                className="select select-bordered w-full select-sm"
                                                value={item.servedBy}
                                                onChange={(e) => {
                                                    const updatedCart = [...cart];
                                                    updatedCart[index].servedBy = e.target.value;
                                                    setCart(updatedCart);
                                                }}
                                            >
                                                <option value="">Pilih yang melayani</option>
                                                {employees.map((emp, empIndex) => (
                                                    <option key={empIndex} value={emp.name}>
                                                        {emp.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-4 sticky bottom-0 bg-base-100 py-4 border-t">
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
