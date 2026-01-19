// Direct Firebase seeding script
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp } = require('firebase/firestore');
const bcrypt = require('bcryptjs');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB7hNZXeXr5cy2o3U1xrGm3ih-Ce2mToiY",
  authDomain: "po-verse.firebaseapp.com",
  projectId: "po-verse",
  storageBucket: "po-verse.firebasestorage.app",
  messagingSenderId: "604319923602",
  appId: "1:604319923602:web:31e82e06e9a9cf5aae154b",
  measurementId: "G-H5656Z7RY8"
};

async function seedSuperadmin() {
  try {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Check if superadmin exists
    console.log('Checking if superadmin already exists...');
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'superadmin'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      console.log('Superadmin already exists!');
      process.exit(0);
    }

    // Hash password
    console.log('Creating superadmin user...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('superadmin123', salt);

    // Create superadmin user
    const userData = {
      username: 'superadmin',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'superadmin',
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
    };

    const docRef = await addDoc(usersRef, userData);
    console.log('Superadmin created successfully with ID:', docRef.id);
    console.log('\nLogin credentials:');
    console.log('Username: superadmin');
    console.log('Password: superadmin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding superadmin:', error);
    process.exit(1);
  }
}

seedSuperadmin();
