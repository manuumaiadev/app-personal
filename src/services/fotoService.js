import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from './firebase';
import * as ImagePicker from 'expo-image-picker';

export async function escolherFoto() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') throw new Error('permissao_negada');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

export async function uploadFotoPerfil(uid, uri) {
  const blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('upload_falhou'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });

  const storageRef = ref(storage, `fotos_perfil/${uid}.jpg`);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, 'users', uid), { fotoUrl: url });
  return url;
}
