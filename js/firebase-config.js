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

const db   = firebase.firestore();
const auth = firebase.auth();

// Storage sólo se carga en el panel de admin (es el único que sube fotos).
// En la tienda el SDK no está presente, así que no lo inicializamos.
const storage = typeof firebase.storage === "function" ? firebase.storage() : null;

// SIN caché offline a propósito.
// Se probó `db.enablePersistence()` y en iPhone dejaba la consulta colgada
// para siempre: la página cargaba pero los productos no aparecían nunca,
// sin error. Es un problema conocido de IndexedDB en WebKit. En Android
// funcionaba bien, por eso costó verlo. La caché no compensa perder la
// tienda en todos los dispositivos Apple.
