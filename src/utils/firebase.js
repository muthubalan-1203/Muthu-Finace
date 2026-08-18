import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyABVJbwOnY5vk9hXEtmQltMHt70DzlktgI",
  authDomain: "muthu-abi-e3b3d.firebaseapp.com",
  projectId: "muthu-abi-e3b3d",
  storageBucket: "muthu-abi-e3b3d.firebasestorage.app",
  messagingSenderId: "906300428202",
  appId: "1:906300428202:web:8860e7b33eb909e7c1e5d3"
};

const app = initializeApp(firebaseConfig);

// Use new persistent cache (replaces deprecated enableIndexedDbPersistence)
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  // If already initialized, fallback to getFirestore
  db = getFirestore(app);
}

export { db, collection, doc, setDoc, deleteDoc, onSnapshot };
