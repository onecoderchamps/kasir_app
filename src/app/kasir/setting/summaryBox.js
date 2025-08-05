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
    const [setor, setSetor] = useState(0);
    const [target, setTarget] = useState(0);
    const [retail, setRetail] = useState(0);
    const [updateTotal, setUpdateTotal] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [category, setCategory] = useState([]);
    const [startDate, setStartDate] = useState(() => localStorage.getItem('dashboardStartDate') || '');
    const [endDate, setEndDate] = useState(() => localStorage.getItem('dashboardEndDate') || '');
    const [loading, setLoading] = useState(false);

    // Fetch categories on component mount
    useEffect(() => {
        const fetchCategories = async () => {
            if (!idOutlet) return;
            try {
                const categoryRef = collection(db, 'Category');
                const q = query(categoryRef, where('idOutlet', '==', idOutlet));
                const querySnapshot = await getDocs(q);
                const result = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setCategory(result);
                // Set initial category to the first one if available
                if (result.length > 0) {
                    setSelectedCategory(result[0].id);
                }
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        fetchCategories();
    }, []);

    // Fetch and process data whenever filters change
    useEffect(() => {
        const fetchData = async () => {
            if (!startDate || !endDate || !selectedCategory) return;
            
            setLoading(true);

            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            try {
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

                const filteringAll = result.filter(
                    (trx) => trx.cart?.some(item => item.idCategory === selectedCategory)
                );
                
                // Get the target for the selected category
                const categoryTarget = category.find((cat) => cat.id === selectedCategory);
                setTarget(categoryTarget?.target || 0);

                // Calculate totals from filtered transactions
                let totalRetail = 0;
                let totalCart = 0;
                
                filteringAll.forEach(trx => {
                    const retailItems = (trx.retail || []).filter(item => item.barangId);
                    totalRetail += retailItems.reduce((acc, item) => acc + (item?.harga || 0), 0);

                    const cartItems = (trx.cart || []).filter(item => item.idCategory === selectedCategory);
                    totalCart += cartItems.reduce((acc, item) => acc + (item?.price || 0), 0);
                });
                
                setRetail(totalRetail);
                setUpdateTotal(totalCart + totalRetail);
                setTransactions(filteringAll);

            } catch (error) {
                console.error("Error fetching transactions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        
    }, [startDate, endDate, selectedCategory, category]);

    // Store dates in local storage
    useEffect(() => {
        if (startDate) localStorage.setItem('dashboardStartDate', startDate);
        if (endDate) localStorage.setItem('dashboardEndDate', endDate);
    }, [startDate, endDate]);

    const formatRupiah = (number) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(number);

    const paymentTotals = paymentOptions.reduce((acc, option) => {
        acc[option] = 0;
        return acc;
    }, {});
    
    let totalHariIni = 0;

    transactions.forEach((trx) => {
        (trx.payments || []).forEach((p) => {
            const matched = paymentOptions.find(
                (opt) => opt.toLowerCase() === (p.method || '').toLowerCase()
            );
            if (matched) {
                paymentTotals[matched] += p.amount || 0;
                if (!matched.startsWith('TIP')) {
                    totalHariIni += p.amount || 0;
                }
            }
        });
    });

    const sisaCash = (paymentTotals['CASH / TUNAI'] || 0) - setor;
    const kekurangan = target > updateTotal ? target - updateTotal : 0;
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
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    onClick={() => {
                        // This button is no longer strictly necessary but can be used for manual refetch
                        // You can remove it and the onClick handler entirely for a fully automatic experience
                        if (startDate && endDate && selectedCategory) {
                             // Just a manual trigger
                        }
                    }}
                    disabled={loading}
                >
                    {loading ? 'Memuat...' : 'Cari'}
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