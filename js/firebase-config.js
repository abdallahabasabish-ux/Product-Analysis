/**
 * firebase-config.js – إعدادات Firebase
 * ⚠️ استبدل هذه القيم بمفاتيح مشروعك من Firebase Console
 */

// 🔥 استبدل هذه القيم بمفاتيح مشروعك الفعلية
const firebaseConfig = {
  apiKey: "AIzaSyDVaRJ_t56faR0iMoMwco9hLJgVSpiMq8M",            // استبدل
  authDomain: "product-analysis-fbcb7.firebaseapp.com",
  projectId: "product-analysis-fbcb7",
  storageBucket: "product-analysis-fbcb7.firebasestorage.app",
  messagingSenderId: "295714829331",
  appId: "1:295714829331:web:8839a16033d92cac533be6"
};

// تهيئة Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized');
} else {
  console.warn('⚠️ Firebase already initialized or not loaded');
}

// تهيئة Firestore
let db;
try {
  db = firebase.firestore();
  db.settings({ merge: true, ignoreUndefinedProperties: true });
  console.log('✅ Firestore initialized');
} catch (e) {
  console.error('❌ Firestore init error:', e);
}

// جعل db متاحاً عالمياً
window.db = db;

// تصدير db للاستخدام في الملفات الأخرى (اختياري)
export { db };
