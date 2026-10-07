/* ===== CLOUDTOP BRAWL — account settings =====
   Paste your Firebase web app settings here (Firebase console > Project settings >
   Your apps > Web app > "firebaseConfig"). These values are meant to be public;
   security comes from the game server checking every sign-in.
   Leave FIREBASE_CONFIG as null to switch accounts off. */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC1zjuaZKK6OSHRln-Jyn32W7_qgrvdhBY",
  authDomain: "cloudtop-brawl.firebaseapp.com",
  projectId: "cloudtop-brawl",
  storageBucket: "cloudtop-brawl.firebasestorage.app",
  messagingSenderId: "528000194437",
  appId: "1:528000194437:web:5895190e173898956816ec"
};
/* Example:
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  appId: "1:123:web:abc"
};
*/

/* true = players must sign in before playing. false = they can also play as a guest
   (guests can't use Boss Fight or unlocked fighters). */
const ACCOUNT_REQUIRED = false;
