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
    const [tanggal, setTanggal] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0]; // Format: yyyy-mm-dd
    });
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
        setCategory(result);
    };

    const fetchData = async () => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        let transaksiQuery = query(
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
        const filteringAll = result.filter((trx) => trx.cart[0].idCategory === selectedCategory);

        const filteringCart = filteringAll.map((trx) => trx.cart);
        const mergedArray = filteringCart.flat();
        const filteredArray = mergedArray.filter((item) => item.idCategory === selectedCategory)
        const categoryTarget = category.find((cat) => cat.id === selectedCategory);

        const filteringRetail = filteringAll.map((trx) => trx.retail);
        const mergedArrayRetail = filteringRetail.flat();

        const retailAll = mergedArrayRetail.reduce((acc, item) => acc + (item.harga - item.komisi || 0), 0)
        const TotalAll = filteredArray.reduce((acc, item) => acc + (item.price || 0), 0)

        setTarget(categoryTarget.target);
        setRetail(retailAll);
        setUpdateTotal(TotalAll + retailAll);

        setTransactions(filteringAll);
    };

    useEffect(() => {
        fetchTarget();
        // fetchData();
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
        trx.payments.forEach((p) => {
            const matched = paymentOptions.find(
                (opt) => opt.toLowerCase() === p.method.toLowerCase()
            );

            if (matched) {
                paymentTotals[matched] += p.amount;

                // Hanya tambahkan ke totalHariIni jika bukan tip
                if (matched !== 'TIP Cash' && matched !== 'TIP Transfer') {
                    totalHariIni += p.amount;
                }
            }
        });
    });

    const sisaCash = paymentTotals['CASH / TUNAI'] - setor;
    const kekurangan = target - updateTotal;
    const persentase = ((updateTotal / target) * 100).toFixed(2);

    useEffect(() => {
        if (startDate) localStorage.setItem('dashboardStartDate', startDate);
        else localStorage.removeItem('dashboardStartDate');

        if (endDate) localStorage.setItem('dashboardEndDate', endDate);
        else localStorage.removeItem('dashboardEndDate');
    }, [startDate, endDate]);

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
                    onClick={() => {
                        fetchData();
                    }}
                >
                    Cari
                </button>
            </div>
            <div>TARGET / Hari = {formatRupiah((target/31).toFixed(0))}</div>
            <div className=" pt-4 border-t grid grid-cols-2 gap-3 font-medium">
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
