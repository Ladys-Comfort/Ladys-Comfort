// =====================================================
// LADYS COMFORT — Firebase Config
// =====================================================

const firebaseConfig = {
  apiKey:            "AIzaSyAL0vUo8_7G0q1Pd0vZ_OTyr-d70MhRLDY",
  authDomain:        "ladys-comfort.firebaseapp.com",
  projectId:         "ladys-comfort",
  storageBucket:     "ladys-comfort.firebasestorage.app",
  messagingSenderId: "336825375731",
  appId:             "1:336825375731:web:3b3b30b9175646a8959086"
};

firebase.initializeApp(firebaseConfig);

const db      = firebase.firestore();
const auth    = firebase.auth();
const storage = firebase.storage();
