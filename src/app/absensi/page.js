import { useEffect, useState, useRef } from 'react';
import React from 'react';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../api/firebase';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function hitungDenda(shift, waktuMasuk) {
  const jamMulaiStr = shift.split(' - ')[0];
  const [jam, menit] = jamMulaiStr.split('.').map(Number);

  const now = new Date(waktuMasuk.toDate());
  const jamMulaiShift = new Date(now);
  jamMulaiShift.setHours(jam, menit, 0, 0);

  const selisihMenit = Math.floor((now - jamMulaiShift) / 60000);

  if (selisihMenit <= 0) return 0;
  if (selisihMenit <= 20) return 20000;
  if (selisihMenit <= 40) return 50000;
  if (selisihMenit <= 59) return 75000;
  return 0;
}

export default function AbsensiPage() {
  const [outlets, setOutlets] = useState([]);
  const [currentOutlet, setCurrentOutlet] = useState(null);
  const [location, setLocation] = useState(null);
  const [inRange, setInRange] = useState(false);
  const [loading, setLoading] = useState(true);
  const [absenToday, setAbsenToday] = useState(null);

  const [selectedShift, setSelectedShift] = useState('');
  const [fotoDataUrl, setFotoDataUrl] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const todayDateString = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const startCamera = async () => {
      setCameraError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err) {
        setCameraError('Tidak dapat mengakses kamera: ' + err.message);
      }
    };
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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
        if (docData.data().shift) {
          setSelectedShift(docData.data().shift);
        }
      }
    };

    checkTodayAbsen();
  }, [currentOutlet]);

  const takePhoto = () => {
    if (!videoRef.current) return;
    setIsTakingPhoto(true);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg');
    setFotoDataUrl(dataUrl);
    setIsTakingPhoto(false);
  };

  const retakePhoto = () => {
    setFotoDataUrl(null);
  };

  const uploadPhotoToAPI = async (base64DataUrl) => {
    try {
      const res = await fetch(base64DataUrl);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append('file', blob, 'absen.jpg');

      const response = await fetch(
        'https://backendtrasgo-609517395039.asia-southeast1.run.app/api/v1/file/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (data.status && data.path) {
        return data.path;
      } else {
        alert('Upload foto gagal: ' + data.message);
        return null;
      }
    } catch (error) {
      console.error('Error upload foto:', error);
      alert('Gagal upload foto');
      return null;
    }
  };

  const getShiftsForToday = () => {
    const today = new Date();
    const day = today.getDay();

    if (day >= 1 && day <= 4) {
      return ['10.00 - 20.00', '12.00 - 22.00'];
    } else {
      return ['10.00 - 22.00'];
    }
  };

  const handleAbsenMasuk = async () => {
    if (!fotoDataUrl) {
      alert('Silakan ambil foto terlebih dahulu');
      return;
    }
    if (!selectedShift) {
      alert('Silakan pilih shift terlebih dahulu');
      return;
    }
    const uid = localStorage.getItem('uid');
    if (!uid || !currentOutlet) {
      alert('Tidak dapat menemukan user atau outlet');
      return;
    }

    const jamMasukNow = Timestamp.now();

    try {
      const fotoPath = await uploadPhotoToAPI(fotoDataUrl);
      if (!fotoPath) return;

      const denda = hitungDenda(selectedShift, jamMasukNow);

      if (!absenToday) {
        const newDoc = {
          idUser: uid,
          idOutlet: currentOutlet.id,
          tanggal: todayDateString,
          jamMasuk: jamMasukNow,
          jamKeluar: null,
          status: 'Hadir',
          fotoMasuk: fotoPath,
          shift: selectedShift,
          denda,
        };
        const docRef = await addDoc(collection(db, 'Absensi'), newDoc);
        setAbsenToday({ id: docRef.id, ...newDoc });
      } else {
        const absenRef = doc(db, 'Absensi', absenToday.id);
        await updateDoc(absenRef, {
          jamMasuk: jamMasukNow,
          fotoMasuk: fotoPath,
          shift: selectedShift,
          denda,
        });
        setAbsenToday({ ...absenToday, jamMasuk: jamMasukNow, fotoMasuk: fotoPath, shift: selectedShift, denda });
      }

      // Matikan kamera setelah absen masuk sukses
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      alert(`Absen masuk berhasil. Denda keterlambatan: Rp ${denda.toLocaleString()}`);
      setFotoDataUrl(null);
      setSelectedShift('');
    } catch (error) {
      console.error('Gagal absen masuk:', error);
      alert('Gagal absen masuk, coba lagi.');
    }
  };


  const handleAbsenKeluar = async () => {
    if (!absenToday) {
      alert('Anda belum melakukan absen masuk hari ini.');
      return;
    }

    try {
      const absenRef = doc(db, 'Absensi', absenToday.id);
      await updateDoc(absenRef, {
        jamKeluar: Timestamp.now(),
      });

      setAbsenToday({ ...absenToday, jamKeluar: Timestamp.now() });
      alert('Absen keluar berhasil');
    } catch (error) {
      console.error('Gagal absen keluar:', error);
      alert('Gagal absen keluar, coba lagi.');
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-600 text-lg">
        Loading...
      </div>
    );

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center text-indigo-600">Absensi</h2>

      {!inRange && (
          <><div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Anda tidak berada di lokasi outlet aktif (jarak &gt; 100 meter)
        </div><div className="mb-6 h-48 rounded overflow-hidden shadow-md">
            <MapContainer
              center={location
                ? [location.latitude, location.longitude]
                : outlets.length > 0
                  ? [outlets[0].latitude, outlets[0].longitude]
                  : [0, 0]}
              zoom={17}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
              className="rounded"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {outlets.map((outlet) => (
                <React.Fragment key={outlet.id}>
                  <Marker position={[outlet.latitude, outlet.longitude]}>
                    <Popup>{outlet.nama}</Popup>
                  </Marker>
                  <Circle
                    center={[outlet.latitude, outlet.longitude]}
                    radius={100}
                    pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.2 }} />
                </React.Fragment>
              ))}

              {location && (
                <Marker position={[location.latitude, location.longitude]}>
                  <Popup>Lokasi Anda</Popup>
                </Marker>
              )}
            </MapContainer>
          </div></>
      )}

      {currentOutlet && (
        <>
          <div className="mb-2 font-semibold text-gray-700">
            Outlet: <span className="text-indigo-600">{currentOutlet.nama}</span>
          </div>

          <div className="mb-6 h-48 rounded overflow-hidden shadow-md">
            <MapContainer
              center={
                location
                  ? [location.latitude, location.longitude]
                  : currentOutlet
                    ? [currentOutlet.latitude, currentOutlet.longitude]
                    : [0, 0]
              }
              zoom={17}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
              className="rounded"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {currentOutlet && (
                <>
                  <Marker position={[currentOutlet.latitude, currentOutlet.longitude]}>
                    <Popup>{currentOutlet.nama}</Popup>
                  </Marker>
                  <Circle
                    center={[currentOutlet.latitude, currentOutlet.longitude]}
                    radius={100}
                    pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.2 }}
                  />
                </>
              )}
              {location && (
                <Marker position={[location.latitude, location.longitude]}>
                  <Popup>Lokasi Anda</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

        </>
      )}

      {/* Shift selector hanya jika belum absen masuk */}
      {!absenToday && (
        <div className="mb-4">
          <label className="block mb-2 font-semibold text-gray-700">
            Pilih Shift
          </label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            disabled={!inRange}
          >
            <option value="">-- Pilih Shift --</option>
            {getShiftsForToday().map((shift) => (
              <option key={shift} value={shift}>
                {shift}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Kamera dan foto */}
      <div className="mb-6">
        {!fotoDataUrl ? (
          <>
            {!absenToday && !fotoDataUrl && (
              <><video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full rounded-md shadow-md bg-black aspect-video" /><button
                  onClick={takePhoto}
                  disabled={!inRange || !selectedShift || isTakingPhoto}
                  className="mt-3 w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  Ambil Foto
                </button></>
            )}
            {cameraError && <p className="mt-2 text-red-600">{cameraError}</p>}
          </>
        ) : (
          <>
            <img
              src={fotoDataUrl}
              alt="Foto Absen"
              className="w-full rounded-md shadow-md object-cover aspect-video"
            />
            <button
              onClick={retakePhoto}
              className="mt-3 w-full bg-yellow-400 text-black py-2 rounded hover:bg-yellow-500"
            >
              Ulangi Foto
            </button>
          </>
        )}
      </div>

      {/* Tombol absen masuk */}
      {!absenToday && (
        <button
          onClick={handleAbsenMasuk}
          disabled={!fotoDataUrl || !inRange || !selectedShift}
          className="w-full mb-4 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          Absen Masuk
        </button>
      )}

      {/* Tombol absen keluar */}
      {absenToday && !absenToday.jamKeluar && (
        <button
          onClick={handleAbsenKeluar}
          className="w-full mb-4 bg-red-600 text-white py-2 rounded hover:bg-red-700"
        >
          Absen Keluar
        </button>
      )}

      {/* Info absen hari ini */}
      {absenToday && (
        <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
          <h3 className="text-lg font-semibold mb-2 text-gray-700">Absensi Hari Ini</h3>
          <p>
            <span className="font-semibold">Shift:</span>{' '}
            <span className="text-indigo-600">{absenToday.shift}</span>
          </p>
          <p>
            <span className="font-semibold">Jam Masuk:</span>{' '}
            {absenToday.jamMasuk
              ? absenToday.jamMasuk.toDate().toLocaleTimeString()
              : '-'}
          </p>
          <p>
            <span className="font-semibold">Jam Keluar:</span>{' '}
            {absenToday.jamKeluar
              ? absenToday.jamKeluar.toDate().toLocaleTimeString()
              : '-'}
          </p>
          <p>
            <span className="font-semibold">Denda keterlambatan:</span>{' '}
            Rp {(absenToday.denda || 0).toLocaleString()}
          </p>
        </div>
      )}
      <div className="flex justify-between items-center mb-6 mt-10">
        <button
          onClick={() => {
            localStorage.removeItem('uid');
            window.location.href = '/absensiLogin'; // arahkan ke halaman login setelah logout
          }}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
