// components/InputForm.js
'use client'; // kalau pakai Next.js 13/14 (biar React Hooks jalan)

import { db } from '@/api/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { useState, useEffect } from 'react';

export default function InputForm() {
  const [name, setName] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncDataToFirebase();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveDataLocally = (data) => {
    const pendingData = JSON.parse(localStorage.getItem('pendingData')) || [];
    pendingData.push(data);
    localStorage.setItem('pendingData', JSON.stringify(pendingData));
  };

  const syncDataToFirebase = async () => {
    const pendingData = JSON.parse(localStorage.getItem('pendingData')) || [];
    if (pendingData.length === 0) return;

    setLoading(true);
    try {
      for (let data of pendingData) {
        await addDoc(collection(db, "names"), {
          name: data.name,
          timestamp: new Date()
        });
      }
      localStorage.removeItem('pendingData');
      alert('Semua data offline berhasil dikirim ke Firebase!');
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newData = { name };

    if (isOnline) {
      setLoading(true);
      try {
        await addDoc(collection(db, "names"), {
          name,
          timestamp: new Date()
        });
        alert('Data berhasil dikirim ke Firebase!');
      } catch (error) {
        console.error('Error adding document: ', error);
      } finally {
        setLoading(false);
      }
    } else {
      saveDataLocally(newData);
      alert('Kamu offline. Data disimpan lokal dulu.');
    }

    setName('');
  };

  return (
    <div>
      <h1>Form Input Nama</h1>

      <div style={{ marginBottom: '20px', color: isOnline ? 'green' : 'red' }}>
        Status: {isOnline ? 'Online ✅' : 'Offline ❌'}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Masukkan Nama"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
