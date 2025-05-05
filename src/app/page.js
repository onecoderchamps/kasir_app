import React from 'react';
import {
  CreditCardIcon,
  ClockIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

export default function HomeDefaultPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-200 via-purple-300 to-blue-200">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-10 text-gray-800">D'Style Salon <br></br> Management System</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <a
            href="/kasirLogin"
            className="flex items-center justify-center bg-white shadow-lg rounded-2xl p-6 hover:bg-gray-100 transition"
          >
            <CreditCardIcon className="h-6 w-6 text-purple-600 mr-3" />
            <span className="text-lg font-medium text-gray-700">Kasir</span>
          </a>
          <a
            href="/absensiLogin"
            className="flex items-center justify-center bg-white shadow-lg rounded-2xl p-6 hover:bg-gray-100 transition"
          >
            <ClockIcon className="h-6 w-6 text-purple-600 mr-3" />
            <span className="text-lg font-medium text-gray-700">Absensi</span>
          </a>
          <a
            href="/adminLogin"
            className="flex items-center justify-center bg-white shadow-lg rounded-2xl p-6 hover:bg-gray-100 transition"
          >
            <ClockIcon className="h-6 w-6 text-purple-600 mr-3" />
            <span className="text-lg font-medium text-gray-700">Admin</span>
          </a>
        </div>
      </div>
    </main>
  );
}
