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
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { db } from '@/firebaseConfig';
import { useSyncRutActivo } from '@/hooks/use-sync-rut-activo';

const ENCRYPTION_SALT = 'TUTOR_IMG_V1';

type FotoSeleccionada = {
  base64: string;
  mimeType: string;
  previewUri: string;
  name?: string;
};

type TutorDraft = {
  nombres: string;
  apellidos: string;
  rut: string;
  fechaNacimiento: string;
  edad: string;
  direccion: string;
  rutUsuario: string;
};

export default function AgregarTutorDocumentosScreen() {
  const router = useRouter();
  useSyncRutActivo();

  const [tutorDraft, setTutorDraft] = useState<TutorDraft | null>(null);
  const [frontal, setFrontal] = useState<FotoSeleccionada | null>(null);
  const [trasero, setTrasero] = useState<FotoSeleccionada | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cargarBorrador = async () => {
      try {
        const raw = await AsyncStorage.getItem('nuevoTutorData');
        if (!raw) {
          Alert.alert('Faltan datos', 'Completa primero la información del tutor.');
          router.replace('/(tabs)/apoderado/Agregar_tutor');
          return;
        }
        setTutorDraft(JSON.parse(raw));

        const frontalRaw = await AsyncStorage.getItem('nuevoTutorCIFrontal');
        const traseroRaw = await AsyncStorage.getItem('nuevoTutorCITrasero');
        if (frontalRaw) {
          const parsed = JSON.parse(frontalRaw);
          if (parsed && !parsed.previewUri && parsed.base64 && parsed.mimeType) {
            parsed.previewUri = `data:${parsed.mimeType};base64,${parsed.base64}`;
          }
          setFrontal(parsed);
        }
        if (traseroRaw) {
          const parsed = JSON.parse(traseroRaw);
          if (parsed && !parsed.previewUri && parsed.base64 && parsed.mimeType) {
            parsed.previewUri = `data:${parsed.mimeType};base64,${parsed.base64}`;
          }
          setTrasero(parsed);
        }
      } catch (error) {
        console.error('Error al cargar borrador de tutor:', error);
        Alert.alert('Error', 'No se pudo cargar la información previa.');
        router.replace('/(tabs)/apoderado/Agregar_tutor');
      }
    };

    cargarBorrador();
  }, [router]);

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
        await AsyncStorage.setItem('nuevoTutorCIFrontal', JSON.stringify(seleccionada));
      } else {
        setTrasero(seleccionada);
        await AsyncStorage.setItem('nuevoTutorCITrasero', JSON.stringify(seleccionada));
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Intenta nuevamente.');
    }
  };

  const cifrarImagen = (foto: FotoSeleccionada, rutUsuario: string) => {
    const clave = `${rutUsuario}-${ENCRYPTION_SALT}`;
    return CryptoJS.AES.encrypt(foto.base64, clave).toString();
  };

  const manejarGuardar = async () => {
    if (!tutorDraft) {
      Alert.alert('Faltan datos', 'Completa primero la información del tutor.');
      return;
    }

    if (!frontal || !trasero) {
      Alert.alert('Imágenes faltantes', 'Carga ambas caras del carnet de identidad.');
      return;
    }

    try {
      setLoading(true);
      const [cifradaFrontal, cifradaTrasero] = [
        cifrarImagen(frontal, tutorDraft.rutUsuario),
        cifrarImagen(trasero, tutorDraft.rutUsuario),
      ];

      await addDoc(collection(db, 'Tutores'), {
        nombres: tutorDraft.nombres,
        apellidos: tutorDraft.apellidos,
        rut: tutorDraft.rut,
        fechaNacimiento: tutorDraft.fechaNacimiento,
        edad: tutorDraft.edad,
        direccion: tutorDraft.direccion,
        rutUsuario: tutorDraft.rutUsuario,
        carnetIdentidad: {
          frontal: {
            contenidoCifrado: cifradaFrontal,
            mimeType: frontal.mimeType,
            nombreArchivo: frontal.name || 'carnet-frontal.jpg',
          },
          trasero: {
            contenidoCifrado: cifradaTrasero,
            mimeType: trasero.mimeType,
            nombreArchivo: trasero.name || 'carnet-trasero.jpg',
          },
        },
        creadoEn: serverTimestamp(),
      });

      await AsyncStorage.multiRemove([
        'nuevoTutorData',
        'nuevoTutorCIFrontal',
        'nuevoTutorCITrasero',
      ]);

      Alert.alert('Éxito', 'Tutor agregado correctamente.');
      router.replace('/(tabs)/apoderado/perfil-apoderado');
    } catch (error) {
      console.error('Error al guardar el tutor con documentos:', error);
      Alert.alert('Error', 'No se pudo guardar la información del tutor.');
    } finally {
      setLoading(false);
    }
  };

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
      <Text style={styles.title}>Añadir Tutor</Text>

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

      <Pressable style={[styles.saveButton, loading && styles.saveButtonDisabled]} onPress={manejarGuardar} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Guardar</Text>}
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
});
