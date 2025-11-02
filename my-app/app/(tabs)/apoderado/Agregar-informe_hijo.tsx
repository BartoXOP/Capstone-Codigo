import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from '@/utils/read-file';
import CryptoJS from 'crypto-js';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as Linking from 'expo-linking';
import { db } from '@/firebaseConfig';
import { useSyncRutActivo } from '@/hooks/use-sync-rut-activo';

interface DatosHijoDraft {
  nombres: string;
  apellidos: string;
  rut: string;
  fechaNacimiento: string;
  edad: string;
  rutUsuario: string;
}

interface HorarioDia {
  id: string;
  etiqueta: string;
  asiste: boolean;
  horaEntrada: string;
  horaSalida: string;
}

const ENCRYPTION_SALT = 'RUTA_SEGURA_V1';
const FICHA_MEDICA_URL = 'https://drive.google.com/uc?export=download&id=1Q0zpJelx0Qg7eSefuSXppc6_X77RzIbd';

export default function AgregarInformeHijoScreen() {
  const router = useRouter();
  useSyncRutActivo();

  const [datosHijo, setDatosHijo] = useState<DatosHijoDraft | null>(null);
  const [horario, setHorario] = useState<HorarioDia[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [pdfNombre, setPdfNombre] = useState('');
  const [pdfCifrado, setPdfCifrado] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cargarBorradores = async () => {
      try {
        const hijoDraftRaw = await AsyncStorage.getItem('nuevoHijoData');
        if (!hijoDraftRaw) {
          Alert.alert('Faltan datos', 'Registra primero los datos del niño.');
          router.replace('/(tabs)/apoderado/Agregar-hijo');
          return;
        }
        const horarioDraftRaw = await AsyncStorage.getItem('nuevoHijoHorario');
        if (!horarioDraftRaw) {
          Alert.alert('Faltan datos', 'Debes ingresar el horario del niño.');
          router.replace('/(tabs)/apoderado/Agregar_Horario_hijo');
          return;
        }

        setDatosHijo(JSON.parse(hijoDraftRaw));
        setHorario(JSON.parse(horarioDraftRaw));
      } catch (error) {
        console.error('Error al cargar borradores para el informe:', error);
        Alert.alert('Error', 'No se pudieron cargar los datos previos.');
        router.replace('/(tabs)/apoderado/Agregar-hijo');
      }
    };

    cargarBorradores();
  }, [router]);

  const seleccionarPdf = async () => {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (resultado.canceled || !resultado.assets?.length) {
        return;
      }

      const asset = resultado.assets[0];
      const fileCopyUri = (asset as any)?.fileCopyUri as string | undefined;
      const uri = fileCopyUri ?? asset.uri ?? null;

      if (!uri) {
        Alert.alert('Error', 'No se pudo acceder al archivo seleccionado.');
        return;
      }

      let base64: string;
      try {
        base64 = await readAsStringAsync(uri, {
          encoding: 'base64',
        });
      } catch (error) {
        console.error('No se pudo leer el archivo seleccionado:', error);
        Alert.alert('Error', 'No se pudo leer el archivo, intenta nuevamente.');
        return;
      }

      if (!datosHijo) {
        Alert.alert('Faltan datos', 'Registra primero la información del niño.');
        return;
      }

      const clave = `${datosHijo.rutUsuario || 'RUT'}-${ENCRYPTION_SALT}`;
      const cifrado = CryptoJS.AES.encrypt(base64, clave).toString();

      setPdfNombre(asset.name || 'informe.pdf');
      setPdfCifrado(cifrado);
      Alert.alert('Documento listo', 'El PDF se cifró correctamente.');
    } catch (error) {
      console.error('Error al seleccionar o cifrar el PDF:', error);
      Alert.alert('Error', 'No se pudo preparar el PDF.');
    }
  };

  const manejarGuardarInforme = async () => {
    if (!datosHijo) {
      Alert.alert('Error', 'No se encontraron los datos del niño.');
      return;
    }

    if (!pdfCifrado) {
      Alert.alert('Documento faltante', 'Selecciona y cifra la ficha médica.');
      return;
    }

    try {
      setLoading(true);

      const horarioSeleccionado = horario.filter((dia) => dia.asiste);

      const datosActualizados = {
        nombres: datosHijo.nombres,
        apellidos: datosHijo.apellidos,
        rut: datosHijo.rut,
        fechaNacimiento: datosHijo.fechaNacimiento,
        edad: datosHijo.edad,
        rutUsuario: datosHijo.rutUsuario,
        descripcionFichaMedica: descripcion,
        horarioAsistencia: horarioSeleccionado,
        fichaMedica: {
          nombreArchivo: pdfNombre,
          contenidoCifrado: pdfCifrado,
        },
        actualizadoEn: serverTimestamp(),
      };

      await setDoc(doc(db, 'Hijos', datosHijo.rut), datosActualizados, { merge: true });

      await AsyncStorage.multiRemove(['nuevoHijoData', 'nuevoHijoHorario', 'nuevoHijoInforme']);

      Alert.alert('Éxito', 'El informe se guardó correctamente.');
      router.replace('/(tabs)/apoderado/perfil-apoderado');
    } catch (error) {
      console.error('Error al guardar el informe del niño:', error);
      Alert.alert('Error', 'No se pudo guardar el informe en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const manejarDescargarFicha = async () => {
    try {
      const canOpen = await Linking.canOpenURL(FICHA_MEDICA_URL);
      if (!canOpen) {
        Alert.alert('Error', 'No se pudo abrir el enlace de la ficha.');
        return;
      }
      await Linking.openURL(FICHA_MEDICA_URL);
    } catch (error) {
      console.error('Error al intentar descargar la ficha médica:', error);
      Alert.alert('Error', 'No se pudo iniciar la descarga.');
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

      <Text style={styles.title}>Modificar hijo</Text>

      <Pressable style={styles.uploadArea} onPress={seleccionarPdf}>
        <Text style={styles.uploadText}>
          {pdfNombre ? pdfNombre : 'Cargar ficha médica'}
        </Text>
      </Pressable>

      <TextInput
        style={styles.input}
        placeholder="Observaciones opcionales"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
        numberOfLines={3}
      />

      <View style={styles.actionsContainer}>
        <Pressable style={styles.secondaryButton} onPress={manejarDescargarFicha}>
          <Text style={styles.secondaryButtonText}>Descargar ficha</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={manejarGuardarInforme}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Guardar</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 6,
    zIndex: 10,
  },
  avatarContainer: {
    alignSelf: 'center',
    backgroundColor: '#e6e6e6',
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
  uploadArea: {
    borderWidth: 2,
    borderColor: '#127067',
    borderRadius: 12,
    paddingVertical: 60,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fbfb',
    marginBottom: 20,
  },
  uploadText: {
    color: '#127067',
    fontSize: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#127067',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 30,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  actionsContainer: {
    alignItems: 'center',
    gap: 16,
  },
  secondaryButton: {
    backgroundColor: '#127067',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 24,
    width: 200,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#127067',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 24,
    width: 200,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
});
