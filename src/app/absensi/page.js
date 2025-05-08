import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, where, addDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../api/firebase';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Patch ikon marker Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default function AbsensiPage() {
  const [outlets, setOutlets] = useState([]);
  const [currentOutlet, setCurrentOutlet] = useState(null);
  const [location, setLocation] = useState(null);
  const [inRange, setInRange] = useState(false);
  const [loading, setLoading] = useState(true);
  const [absenToday, setAbsenToday] = useState(null);

  const todayDateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  useEffect(() => {
    const fetchUser = async () => {
      const uid = localStorage.getItem('uid');
      if (!uid) return window.history.back();

      try {
        const userRef = doc(db, 'Terapis', uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        if (!userSnap.exists() || userData?.role !== 'Terapis') {
          return window.history.back();
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        window.history.back();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchOutlets = async () => {
      const querySnapshot = await getDocs(collection(db, 'Outlet'));
      const list = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive && data.latitude && data.longitude) {
          list.push({ id: doc.id, ...data });
        }
      });
      setOutlets(list);
    };

    const getLocation = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => console.error('Error getting location', error)
        );
      } else {
        alert('Geolocation tidak didukung di browser ini');
      }
    };

    fetchOutlets();
    getLocation();
  }, []);

  useEffect(() => {
    if (!location || outlets.length === 0) return;

    const nearest = outlets.find((outlet) => {
      const distance = getDistanceFromLatLonInMeters(
        parseFloat(location.latitude),
        parseFloat(location.longitude),
        parseFloat(outlet.latitude),
        parseFloat(outlet.longitude)
      );
      return distance <= 100;
    });

    setCurrentOutlet(nearest || null);
    setInRange(!!nearest);
  }, [location, outlets]);

  useEffect(() => {
    const checkTodayAbsen = async () => {
      const uid = localStorage.getItem('uid');
      if (!uid) return;

      const q = query(
        collection(db, 'Absensi'),
        where('idUser', '==', uid),
        where('tanggal', '==', todayDateString)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setAbsenToday({ id: docData.id, ...docData.data() });
      }
    };

    checkTodayAbsen();
  }, [currentOutlet]);

  const handleAbsen = async (type) => {
    const uid = localStorage.getItem('uid');
    if (!uid || !currentOutlet) return;

    const now = Timestamp.now();

    try {
      if (!absenToday) {
        // Create new doc
        const newDoc = {
          idUser: uid,
          idOutlet: currentOutlet.id,
          tanggal: todayDateString,
          jamMasuk: type === 'masuk' ? now : null,
          jamKeluar: type === 'keluar' ? now : null,
          status: 'Hadir'
        };
        const docRef = await addDoc(collection(db, 'Absensi'), newDoc);
        setAbsenToday({ id: docRef.id, ...newDoc });
      } else {
        // Update existing doc
        const absenRef = doc(db, 'Absensi', absenToday.id);
        const updateField = type === 'masuk' ? { jamMasuk: now } : { jamKeluar: now };
        await updateDoc(absenRef, updateField);
        setAbsenToday({ ...absenToday, ...updateField });
      }

      alert(`Absen ${type} berhasil`);
    } catch (error) {
      console.error('Gagal absen:', error);
    }
  };

  const sudahAbsenLengkap = absenToday?.jamMasuk && absenToday?.jamKeluar;

  if (loading) {
    return (
      <main className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="p-6 bg-gray-50 min-h-screen">
      {/* <div className="mb-4">
        <button
          onClick={() => window.history.back()}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Kembali
        </button>
      </div> */}

      <h1 className="text-2xl font-bold mb-4">Absensi</h1>

      {inRange ? (
        <div className="bg-green-100 p-4 rounded-lg shadow-md mb-4">
          <p className="text-green-700">
            Anda berada di dekat outlet: <strong>{currentOutlet?.nama}</strong>
          </p>
        </div>
      ) : (
        <div className="bg-red-100 p-4 rounded-lg shadow-md mb-4">
          <p className="text-red-700">Anda tidak berada dalam jangkauan outlet manapun.</p>
        </div>
      )}

      {location && (
        <>
          <p className="text-sm text-gray-500 mb-2">
            Lokasi Anda: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </p>
          <MapContainer
            center={[location.latitude, location.longitude]}
            zoom={17}
            scrollWheelZoom={false}
            style={{ height: '300px', width: '100%', marginBottom: '1rem' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[location.latitude, location.longitude]}>
              <Popup>Lokasi Anda</Popup>
            </Marker>
            {currentOutlet && (
              <>
                <Marker position={[currentOutlet.latitude, currentOutlet.longitude]}>
                  <Popup>Outlet: {currentOutlet.nama}</Popup>
                </Marker>
                <Circle
                  center={[currentOutlet.latitude, currentOutlet.longitude]}
                  radius={100}
                  pathOptions={{ color: 'blue' }}
                />
              </>
            )}
          </MapContainer>
        </>
      )}

      {sudahAbsenLengkap ? (
        <div className="bg-blue-100 p-4 rounded-lg shadow-md text-blue-700">
          Kamu sudah absen masuk dan keluar hari ini. Silakan absen kembali besok.
        </div>
      ) : (
        <div className="flex gap-4">
          {!absenToday?.jamMasuk && (
            <button
              onClick={() => handleAbsen('masuk')}
              disabled={!inRange}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Absen Masuk
            </button>
          )}
          {absenToday?.jamMasuk && !absenToday?.jamKeluar && (
            <button
              onClick={() => handleAbsen('keluar')}
              disabled={!inRange}
              className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Absen Keluar
            </button>
          )}
        </div>
      )}
      <button
        onClick={() => {
          localStorage.setItem('uid', '');
          localStorage.setItem('loginDate', '');
          window.location.href = '/';
      }}
        className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50 mt-20"
      >
        Log Out
      </button>
    </main>
  );
}
