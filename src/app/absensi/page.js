import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../api/firebase';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function AbsensiPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const uid = localStorage.getItem('uid');
      if (!uid) {
        console.warn('UID not found in localStorage');
        window.history.back();
        return;
      }

      try {
        const userRef = doc(db, 'Terapis', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          if (userData?.role !== 'Terapis') {
            console.warn('Unauthorized access: Not a Terapis');
            window.history.back();
          }
        } else {
          console.warn('User document does not exist');
          window.history.back();
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        window.history.back(); // Optional fallback on error
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <main className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="p-6 bg-gray-50 min-h-screen">
      {/* Konten Absensi di sini */}
    </main>
  );
}
