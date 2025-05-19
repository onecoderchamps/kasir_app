import { db } from '../api/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    const q = query(
      collection(db, 'User'),
      where('username', '==', username),
      where('pin', '==', pin)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const uid = userDoc.id;
      const userData = userDoc.data();

      if (userData.role !== 'Admin') {
        setMessage('Akses ditolak');
        return;
      }

      localStorage.setItem('uid', uid);
      localStorage.setItem('idOutlet', userData.idOutlet);
      localStorage.setItem('outlet', userData.nameOutlet);
      localStorage.setItem('loginDate', new Date().toISOString());
      window.location.href = '/setting'; // navigasi setelah login
    } else {
      setMessage('Username atau PIN salah');
    }
  };

  const handleKeypadClick = (value) => {
    if (value === 'DEL') {
      setPin('');
    } else if (value === 'OK') {
      handleLogin();
    } else if (pin.length < 6) {
      setPin((prev) => prev + value);
    }
  };

  const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'OK'];

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-200 via-orange-300 to-orange-200 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-6 text-blue-600">Admin Panel</h1>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-6 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* Display PIN as dots */}
        <div className="flex justify-center gap-2 mb-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border ${i < pin.length ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {keypad.map((key) => (
            <button
              key={key}
              onClick={() => handleKeypadClick(key)}
              className={`p-4 rounded-lg text-white font-semibold transition ${
                key === 'OK'
                  ? 'bg-green-500 hover:bg-green-600'
                  : key === 'DEL'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        {message && (
          <p className="mt-4 text-center text-red-500 font-medium">{message}</p>
        )}
        <button
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 mt-5"
          onClick={() => window.history.back()}
        >
          Kembali
        </button>
      </div>
    </main>
  );
}
