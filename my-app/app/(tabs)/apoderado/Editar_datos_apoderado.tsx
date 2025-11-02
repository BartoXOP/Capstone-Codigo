import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { db } from '@/firebaseConfig';
import { collection, doc, getDocs, query, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncRutActivo } from '@/hooks/use-sync-rut-activo';
import { makeShadow } from '@/utils/shadow';

export default function EditarDatosApoderadoScreen() {
  const router = useRouter();
  useSyncRutActivo();

  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [rut, setRut] = useState('');
  const [direccion, setDireccion] = useState('');
  const [rutUsuario, setRutUsuario] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [errores, setErrores] = useState({
    nombres: '',
    apellidos: '',
    correo: '',
    rut: '',
    direccion: '',
  });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const rutGuardado = await AsyncStorage.getItem('rutUsuario');
        if (!rutGuardado) {
          Alert.alert('Error', 'No se encontró el RUT del usuario activo.');
          setCargando(false);
          return;
        }
        setRutUsuario(rutGuardado);

        const usuariosRef = collection(db, 'usuarios');
        const q = query(usuariosRef, where('rut', '==', rutGuardado));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          Alert.alert('Error', 'No se encontraron datos del apoderado.');
          setCargando(false);
          return;
        }

        const docUsuario = snapshot.docs[0];
        const data = docUsuario.data() || {};

        setUserId(docUsuario.id);
        setNombres(data.nombres || '');
        setApellidos(data.apellidos || '');
        setCorreo(data.correo || '');
        setRut(data.rut || '');
        setDireccion(data.direccion || '');
      } catch (error) {
        console.error('Error al cargar datos del apoderado:', error);
        Alert.alert('Error', 'No se pudieron cargar los datos del apoderado.');
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  const validarEmail = (email: string) => email.includes('@');

  const manejarActualizar = async () => {
    const nuevosErrores = {
      nombres: !nombres ? 'Debes ingresar tu nombre' : '',
      apellidos: !apellidos ? 'Debes ingresar tu apellido' : '',
      correo: !validarEmail(correo) ? 'El correo debe contener un "@"' : '',
      rut: !rut ? 'Debes ingresar tu RUT' : '',
      direccion: !direccion ? 'Debes ingresar tu dirección' : '',
    };

    setErrores(nuevosErrores);

    if (Object.values(nuevosErrores).some((msg) => msg !== '')) return;

    if (!rutUsuario || !userId) {
      Alert.alert('Error', 'No se puede actualizar el apoderado sin los datos necesarios.');
      return;
    }

    try {
      setLoading(true);
      const usuarioRef = doc(db, 'usuarios', userId);
      await updateDoc(usuarioRef, {
        nombres,
        apellidos,
        correo,
        rut,
        direccion,
        rol: 'Apoderado',
        actualizadoEn: serverTimestamp(),
      });

      await AsyncStorage.setItem('userName', `${nombres} ${apellidos}`);

      Alert.alert('Éxito', 'Datos actualizados correctamente.');
      router.back();
    } catch (error) {
      console.error('Error al actualizar apoderado:', error);
      Alert.alert('Error', 'No se pudo actualizar la información.');
    } finally {
      setLoading(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#127067" />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={28} color="#127067" />
      </Pressable>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileImageContainer}>
          <Image
            source={require('@/assets/images/user_icon.png')}
            style={styles.profileImage}
            contentFit="cover"
          />
        </View>

        <Text style={styles.title}>Editar datos del apoderado</Text>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombres</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tus nombres"
              value={nombres}
              onChangeText={setNombres}
            />
            {errores.nombres ? <Text style={styles.errorText}>{errores.nombres}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Apellidos</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tus apellidos"
              value={apellidos}
              onChangeText={setApellidos}
            />
            {errores.apellidos ? <Text style={styles.errorText}>{errores.apellidos}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu correo"
              value={correo}
              onChangeText={setCorreo}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errores.correo ? <Text style={styles.errorText}>{errores.correo}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>RUT</Text>
            <TextInput style={styles.input} placeholder="Ingresa tu RUT" value={rut} onChangeText={setRut} />
            {errores.rut ? <Text style={styles.errorText}>{errores.rut}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu dirección"
              value={direccion}
              onChangeText={setDireccion}
            />
            {errores.direccion ? <Text style={styles.errorText}>{errores.direccion}</Text> : null}
          </View>
        </View>

        <Pressable style={styles.button} onPress={manejarActualizar} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Actualizar</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    padding: 5,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    paddingTop: 40,
  },
  profileImageContainer: {
    backgroundColor: '#e6e6e6',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  inputGroup: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginLeft: 5,
  },
  input: {
    width: '100%',
    borderColor: '#127067',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 15,
    backgroundColor: '#F5F7F8',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#127067',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginTop: 20,
    marginBottom: 30,
    width: 200,
    alignItems: 'center',
    elevation: 3,
    ...makeShadow(
      '0 4px 8px rgba(0,0,0,0.12)',
      {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
    ),
    alignSelf: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    fontSize: 13,
    marginTop: 5,
    marginLeft: 5,
  },
});
