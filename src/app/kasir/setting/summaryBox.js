import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../api/firebase';

const paymentOptions = [
    'CASH / TUNAI',
    'EDC BCA - QRIS',
    'EDC BCA - CARD',
    'EDC MANDIRI - QRIS',
    'EDC MANDIRI - CARD',
    'EDC BRI - QRIS',
    'EDC BRI - CARD',
    'TRANSFER - REKENING BCA',
    'TRANSFER - REKENING MANDIRI',
    'TRANSFER - REKENING BRI',
    'BY VOUCHER',
    'SPONSOR',
    'TIP Transfer',
    'TIP Cash',
];

const idOutlet = localStorage.getItem('idOutlet');

const SummaryBox = () => {
    const [tanggal, setTanggal] = useState(() => new Date().toISOString().split('T')[0]);
    const [setor, setSetor] = useState(0);
    const [target, setTarget] = useState(0);
    const [retail, setRetail] = useState(0);
    const [updateTotal, setUpdateTotal] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [category, setCategory] = useState([]);
    const [startDate, setStartDate] = useState(() => localStorage.getItem('dashboardStartDate') || '');
    const [endDate, setEndDate] = useState(() => localStorage.getItem('dashboardEndDate') || '');

    const fetchTarget = async () => {
        const categoryRef = collection(db, 'Category');
        const q = query(categoryRef, where('idOutlet', '==', idOutlet));
        const querySnapshot = await getDocs(q);
        const result = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        console.log('Category Data:', result);
        setCategory(result);
    };

    const fetchData = async () => {
        if (!startDate || !endDate || !selectedCategory) return;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const transaksiQuery = query(
            collection(db, 'Transaksi'),
            where('date', '>=', Timestamp.fromDate(start)),
            where('date', '<=', Timestamp.fromDate(end)),
            where('idOutlet', '==', idOutlet)
        );

        const transaksisnap = await getDocs(transaksiQuery);
        const result = transaksisnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        console.log('Transactions Data:', result);

        const filteringAll = result.filter(
            (trx) => Array.isArray(trx.cart) && trx.cart[0]?.idCategory === selectedCategory
        );

        const mergedCart = filteringAll.flatMap((trx) =>
            (trx.cart || []).filter((item) => item?.idCategory === selectedCategory)
        );

        const mergedRetail = filteringAll.flatMap((trx) => trx.retail || []);
        const retailAll = mergedRetail.reduce(
            (acc, item) => acc + ((item?.harga || 0) - (item?.komisi || 0)),
            0
        );

        const TotalAll = mergedCart.reduce((acc, item) => acc + (item?.price || 0), 0);
        const categoryTarget = category.find((cat) => cat.id === selectedCategory);

        setTarget(categoryTarget?.target || 0);
        setRetail(retailAll);
        setUpdateTotal(TotalAll + retailAll);
        setTransactions(filteringAll);
    };

    useEffect(() => {
        fetchTarget();
    }, [startDate, endDate]);

    useEffect(() => {
        localStorage.setItem('dashboardStartDate', startDate || '');
        localStorage.setItem('dashboardEndDate', endDate || '');
    }, [startDate, endDate]);

    const formatRupiah = (number) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(number);

    const paymentTotals = Object.fromEntries(paymentOptions.map((p) => [p, 0]));
    let totalHariIni = 0;

    transactions.forEach((trx) => {
        (trx.payments || []).forEach((p) => {
            const matched = paymentOptions.find(
                (opt) => opt.toLowerCase() === (p.method || '').toLowerCase()
            );
            if (matched) {
                paymentTotals[matched] += p.amount || 0;
                if (matched !== 'TIP Cash' && matched !== 'TIP Transfer') {
                    totalHariIni += p.amount || 0;
                }
            }
        });
    });

    const sisaCash = paymentTotals['CASH / TUNAI'] - setor;
    const kekurangan = target - updateTotal;
    const persentase = target ? ((updateTotal / target) * 100).toFixed(2) : '0.00';

    return (
        <div className="p-6 bg-white rounded-2xl shadow-lg space-y-4">
            <div className="flex gap-4 mb-6 items-end">
                <div>
                    <label className="block font-semibold mb-1">Start Date</label>
                    <input
                        type="date"
                        className="border p-2 rounded"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block font-semibold mb-1">End Date</label>
                    <input
                        type="date"
                        className="border p-2 rounded"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Kategori</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="border p-2 rounded"
                    >
                        <option value="">-- Pilih Kategori --</option>
                        {category.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block font-semibold mb-1">Setor</label>
                    <input
                        type="number"
                        className="border p-2 rounded"
                        value={setor}
                        onChange={(e) => setSetor(Number(e.target.value))}
                        min={0}
                    />
                </div>
                <button
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    onClick={fetchData}
                >
                    Cari
                </button>
            </div>

            {target > 0 && (
                <div>TARGET / Hari = {formatRupiah(Math.floor(target / 31))}</div>
            )}

            <div className="pt-4 border-t grid grid-cols-2 gap-3 font-medium">
                {paymentOptions.map((method) => (
                    <div key={method}>
                        {method} = {paymentTotals[method] ? formatRupiah(paymentTotals[method]) : '-'}
                    </div>
                ))}
            </div>

            <div className="border-t pt-4 mt-4 grid grid-cols-2 gap-3 font-medium">
                <div>
                    <div>SETOR = {formatRupiah(setor)}</div>
                    <div>SISA CASH = {formatRupiah(sisaCash)}</div>
                    <div>RETAIL = {formatRupiah(retail)}</div>
                    <div>TOTAL = {formatRupiah(updateTotal)}</div>
                </div>
                <div>
                    <div>TARGET = {formatRupiah(target)}</div>
                    <div>KEKURANGAN = {formatRupiah(kekurangan)}</div>
                    <div className="col-span-2">PERSENTASE = {persentase}%</div>
                </div>
            </div>
        </div>
    );
};

export default SummaryBox;
