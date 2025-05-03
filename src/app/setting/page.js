'use client'; // hanya untuk app router

import { useState } from "react";
import TerapisTable from "./terapis";
import CategoryTable from "./category";
import OutletTable from "./outlet";
import ServiceTable from "./layanan";

const menuItems = ["Category", "Layanan","Outlet", "Terapis"];

export default function HomePage() {
    const [active, setActive] = useState("Category");

    const renderContent = () => {
        switch (active) {
            case "Category":
                return <CategoryTable />;
            case "Layanan":
                return <ServiceTable />
            case "Terapis":
                return <TerapisTable />;
            case "Outlet":
                return <OutletTable />;
            case "EDC":
                return <p>Ini adalah konten untuk <strong>EDC</strong>.</p>;
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
                <h1 className="text-2xl font-bold mb-6 text-blue-600">Setting</h1>
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
