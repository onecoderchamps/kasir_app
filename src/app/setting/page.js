import { useState, useEffect } from "react";
import TerapisTable from "./terapis";
import CategoryTable from "./category";
import OutletTable from "./outlet";
import ServiceTable from "./layanan";
import InventoryTable from "./inventory";
import UserTable from "./kasir";
import Omset from "./omset";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../api/firebase";

const menuItems = ["Laporan", "Kategori", "Outlet", "Layanan", "Inventory", "Terapis", "Kasir"];

export default function HomePage() {
    const [active, setActive] = useState("Laporan");

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
                if (userSnap.data().role !== 'Admin') {
                    window.history.back()
                }
            } catch (error) {
                console.error('Error fetching user:', error);
            }
        };
        fetchUser();
    }, []);

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

    const handleLogout = () => {
        localStorage.removeItem('uid');
        localStorage.removeItem('loginDate');
        window.location.href = '/';
    };

    const renderContent = () => {
        switch (active) {
            case "Kategori":
                return <CategoryTable />;
            case "Layanan":
                return <ServiceTable />
            case "Terapis":
                return <TerapisTable />;
            case "Outlet":
                return <OutletTable />;
            case "Inventory":
                return <InventoryTable />;
            case "Kasir":
                return <UserTable />;
            case "Laporan":
                return <Omset />;
            case "Bank":
                return <p>Ini adalah konten untuk <strong>Bank</strong>.</p>;
            default:
                return <p>Pilih menu di samping untuk melihat konten.</p>;
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <div className="w-64 bg-white shadow-lg p-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold mb-6 text-blue-600">Setting</h1>
                </div>
                <ul className="space-y-3">
                    {menuItems.map((item) => (
                        <li
                            key={item}
                            onClick={() => setActive(item)}
                            className={`cursor-pointer px-4 py-2 rounded-md ${active === item
                                ? "bg-blue-100 text-blue-700 font-semibold"
                                : "text-gray-700 hover:bg-gray-100"
                                }`}
                        >
                            {item}
                        </li>
                    ))}
                    <li
                        onClick={() => handleLogout()}
                        className={`cursor-pointer px-4 py-2 rounded-md bg-red-100 text-white-700 font-semibold absolute bottom-5`}
                    >
                        Keluar
                    </li>
                </ul>
            </div>

            {/* Konten */}
            <div className="flex-1 p-6 bg-gray-50">
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">{active}</h2>
                {renderContent()}
            </div>
        </div>
    );
}
