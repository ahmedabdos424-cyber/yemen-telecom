import { auth, storage } from '../firebase';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// Firebase Authentication Service
export const firebaseAuth = {
  login: (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password),

  logout: () => firebaseSignOut(auth),

  onAuthChange: (callback: (user: User | null) => void) =>
    onAuthStateChanged(auth, callback),

  getCurrentUser: () => auth.currentUser,
};

// Firebase Storage Service
export const firebaseStorage = {
  uploadFile: async (file: File, path: string = 'uploads') => {
    const fileRef = ref(storage, `${path}/${Date.now()}-${file.name}`);
    const snapshot = await uploadBytesResumable(fileRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return { url, filename: file.name, path: snapshot.ref.fullPath };
  },

  uploadMultiple: async (files: File[], path: string = 'uploads') => {
    return Promise.all(files.map((f) => firebaseStorage.uploadFile(f, path)));
  },

  getDownloadUrl: async (fullPath: string) => {
    return getDownloadURL(ref(storage, fullPath));
  },
};
