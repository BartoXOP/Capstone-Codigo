import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CryptoJS from 'crypto-js';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { db } from '@/firebaseConfig';
import { useSyncRutActivo } from '@/hooks/use-sync-rut-activo';

const ENCRYPTION_SALT = 'TUTOR_IMG_V1';

type FotoSeleccionada = {
  base64: string;
  mimeType: string;
  previewUri: string;
  name?: string;
};

export default function EditarTutorDocumentosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  useSyncRutActivo();

  const [rutUsuario, setRutUsuario] = useState('');
  const [frontal, setFrontal] = useState<FotoSeleccionada | null>(null);
  const [trasero, setTrasero] = useState<FotoSeleccionada | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const tutorId = params.id?.toString() || '';
  const rutParam = params.rut?.toString() || '';

  useEffect(() => {
    const cargarDocumentos = async () => {
      if (!tutorId) {
        Alert.alert('Error', 'No se recibió el identificador del tutor.');
        router.back();
        return;
      }

      try {
        const docRef = doc(db, 'Tutores', tutorId);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) {
          Alert.alert('Error', 'No se encontró el tutor solicitado.');
          router.back();
          return;
        }

        const data = snapshot.data() || {};
        const rutDoc = data.rutUsuario || rutParam;
        setRutUsuario(rutDoc || '');

        const frontalData = data.carnetIdentidad?.frontal;
        if (frontalData?.contenidoCifrado && rutDoc) {
          try {
            const clave = `${rutDoc}-${ENCRYPTION_SALT}`;
            const bytes = CryptoJS.AES.decrypt(frontalData.contenidoCifrado, clave);
            const base64 = bytes.toString(CryptoJS.enc.Utf8);
            if (base64) {
              setFrontal({
                base64,
                mimeType: frontalData.mimeType || 'image/jpeg',
                previewUri: `data:${frontalData.mimeType || 'image/jpeg'};base64,${base64}`,
                name: frontalData.nombreArchivo || '',
              });
            }
          } catch (error) {
            console.warn('No se pudo descifrar la imagen frontal del tutor:', error);
          }
        }

        const traseroData = data.carnetIdentidad?.trasero;
        if (traseroData?.contenidoCifrado && rutDoc) {
          try {
            const clave = `${rutDoc}-${ENCRYPTION_SALT}`;
            const bytes = CryptoJS.AES.decrypt(traseroData.contenidoCifrado, clave);
            const base64 = bytes.toString(CryptoJS.enc.Utf8);
            if (base64) {
              setTrasero({
                base64,
                mimeType: traseroData.mimeType || 'image/jpeg',
                previewUri: `data:${traseroData.mimeType || 'image/jpeg'};base64,${base64}`,
                name: traseroData.nombreArchivo || '',
              });
            }
          } catch (error) {
            console.warn('No se pudo descifrar la imagen trasera del tutor:', error);
          }
        }
      } catch (error) {
        console.error('Error al cargar documentos del tutor:', error);
        Alert.alert('Error', 'No se pudieron cargar los documentos del tutor.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    cargarDocumentos();
  }, [router, tutorId, rutParam]);

  const seleccionarImagen = async (tipo: 'frontal' | 'trasero') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== ImagePicker.PermissionStatus.GRANTED) {
        Alert.alert('Permiso requerido', 'Otorga acceso a tu galería para cargar la imagen.');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (resultado.canceled || !resultado.assets?.length) {
        return;
      }

      const asset = resultado.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'No se pudo leer la imagen seleccionada.');
        return;
      }

      const mimeType = asset.mimeType || 'image/jpeg';
      const previewUri = `data:${mimeType};base64,${asset.base64}`;
      const seleccionada: FotoSeleccionada = {
        base64: asset.base64,
        mimeType,
        previewUri,
        name: asset.fileName || asset.uri?.split('/')?.pop() || '',
      };

      if (tipo === 'frontal') {
        setFrontal(seleccionada);
      } else {
        setTrasero(seleccionada);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Intenta nuevamente.');
    }
  };

  const cifrarImagen = (foto: FotoSeleccionada, rut: string) => {
    const clave = `${rut}-${ENCRYPTION_SALT}`;
    return CryptoJS.AES.encrypt(foto.base64, clave).toString();
  };

  const manejarGuardar = async () => {
    if (!tutorId) {
      Alert.alert('Error', 'No se identificó el tutor a actualizar.');
      return;
    }
    if (!rutUsuario) {
      Alert.alert('Error', 'No se encontró el RUT asociado al tutor.');
      return;
    }
    if (!frontal || !trasero) {
      Alert.alert('Imágenes faltantes', 'Debes cargar ambas caras del carnet.');
      return;
    }

    try {
      setSaving(true);
      const frontalCifrada = cifrarImagen(frontal, rutUsuario);
      const traseraCifrada = cifrarImagen(trasero, rutUsuario);

      await updateDoc(doc(db, 'Tutores', tutorId), {
        carnetIdentidad: {
          frontal: {
            contenidoCifrado: frontalCifrada,
            mimeType: frontal.mimeType,
            nombreArchivo: frontal.name || 'carnet-frontal.jpg',
          },
          trasero: {
            contenidoCifrado: traseraCifrada,
            mimeType: trasero.mimeType,
            nombreArchivo: trasero.name || 'carnet-trasero.jpg',
          },
        },
        actualizadoEn: serverTimestamp(),
      });

      Alert.alert('Éxito', 'Documentos actualizados correctamente.');
      router.back();
    } catch (error) {
      console.error('Error al actualizar documentos del tutor:', error);
      Alert.alert('Error', 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.feedbackContainer}>
        <ActivityIndicator color="#127067" />
        <Text style={styles.feedbackText}>Cargando documentos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={28} color="#127067" />
      </Pressable>

      <View style={styles.avatarContainer}>
        <Image
          source={require('@/assets/images/user_icon.png')}
          style={styles.avatar}
          contentFit="cover"
        />
      </View>
      <Text style={styles.title}>Editar tutor</Text>

      <Pressable style={styles.uploadBox} onPress={() => seleccionarImagen('frontal')}>
        {frontal?.previewUri ? (
          <Image source={{ uri: frontal.previewUri }} style={styles.uploadPreview} contentFit="cover" />
        ) : (
          <Text style={styles.uploadText}>Cargar Carnet de identidad frontal</Text>
        )}
      </Pressable>

      <Pressable style={styles.uploadBox} onPress={() => seleccionarImagen('trasero')}>
        {trasero?.previewUri ? (
          <Image source={{ uri: trasero.previewUri }} style={styles.uploadPreview} contentFit="cover" />
        ) : (
          <Text style={styles.uploadText}>Cargar Carnet de identidad trasero</Text>
        )}
      </Pressable>

      <Pressable
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={manejarGuardar}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Guardar</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 70,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 5,
  },
  avatarContainer: {
    backgroundColor: '#e6e6e6',
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#127067',
    textAlign: 'center',
    marginBottom: 30,
  },
  uploadBox: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#127067',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 18,
    backgroundColor: '#F8FBFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: '#127067',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  uploadPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  saveButton: {
    backgroundColor: '#127067',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 22,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  feedbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
  },
  feedbackText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
});
