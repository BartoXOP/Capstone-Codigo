import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../firebaseConfig';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Switch,
  Pressable,
  Alert,
} from 'react-native';
import Checkbox from 'expo-checkbox';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSyncRutActivo } from '@/hooks/use-sync-rut-activo';

export default function RegisterScreen() {
  const router = useRouter();
  useSyncRutActivo();

  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [repetirContrasena, setRepetirContrasena] = useState('');
  const [rut, setRut] = useState('');
  const [esConductor, setEsConductor] = useState(false);
  const [aceptaCondiciones, setAceptaCondiciones] = useState(false);

  // Mensajes de error
  const [errores, setErrores] = useState({
    nombres: '',
    apellidos: '',
    correo: '',
    contrasena: '',
    repetirContrasena: '',
    rut: '',
    aceptaCondiciones: '',
  });

  const validarEmail = (email: string) => email.includes('@');

  const validarContrasena = (password: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(password);
  };

  const manejarRegistro = async () => {
    let nuevosErrores = {
      nombres: '',
      apellidos: '',
      correo: '',
      contrasena: '',
      repetirContrasena: '',
      rut: '',
      aceptaCondiciones: '',
    };

    if (!nombres) nuevosErrores.nombres = 'Debes ingresar tu nombre';
    if (!apellidos) nuevosErrores.apellidos = 'Debes ingresar tu apellido';
    if (!validarEmail(correo)) nuevosErrores.correo = 'El correo debe contener un "@"';
    if (!validarContrasena(contrasena))
      nuevosErrores.contrasena =
        'Debe tener al menos 8 caracteres, incluyendo mayúscula, minúscula, número y carácter especial.';
    if (contrasena !== repetirContrasena)
      nuevosErrores.repetirContrasena = 'Las contraseñas no coinciden';
    if (!rut) nuevosErrores.rut = 'Debes ingresar tu RUT';
    if (!aceptaCondiciones)
      nuevosErrores.aceptaCondiciones = 'Debes aceptar los términos y condiciones para continuar.';

    setErrores(nuevosErrores);

    if (Object.values(nuevosErrores).some((msg) => msg !== '')) return;

    try {
      // Verificar si el correo ya existe en Firestore
      const usuariosRef = collection(db, 'usuarios');
      const q = query(usuariosRef, where('correo', '==', correo));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setErrores((prev) => ({ ...prev, correo: 'Este correo ya está registrado.' }));
        return;
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo verificar el correo. Intenta de nuevo.');
      return;
    }

    const usuario = {
      nombres,
      apellidos,
      correo,
      contrasena,
      rut,
      rol: esConductor ? 'Conductor' : 'Apoderado',
    };

    try {
      await addDoc(collection(db, 'usuarios'), usuario);
      Alert.alert('¡Registro exitoso!', `Bienvenido, ${nombres}`);
      router.push('/(tabs)/login');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el usuario en la nube. Intenta de nuevo.');
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.push('/')}>
        <Ionicons name="arrow-back" size={28} color="#127067" />
      </Pressable>
      <Image
        source={require('@/assets/images/Furgo_Truck.png')}
        style={styles.logo}
        contentFit="contain"
      />

      <Text style={styles.title}>Registro</Text>

      <TextInput
        style={styles.input}
        placeholder="Nombres"
        value={nombres}
        onChangeText={setNombres}
      />
      {errores.nombres ? <Text style={styles.errorText}>{errores.nombres}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Apellidos"
        value={apellidos}
        onChangeText={setApellidos}
      />
      {errores.apellidos ? <Text style={styles.errorText}>{errores.apellidos}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Correo"
        keyboardType="email-address"
        autoCapitalize="none"
        value={correo}
        onChangeText={setCorreo}
      />
      {errores.correo ? <Text style={styles.errorText}>{errores.correo}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={contrasena}
        onChangeText={setContrasena}
      />
      {errores.contrasena ? <Text style={styles.errorText}>{errores.contrasena}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Repetir Contraseña"
        secureTextEntry
        value={repetirContrasena}
        onChangeText={setRepetirContrasena}
      />
      {errores.repetirContrasena ? <Text style={styles.errorText}>{errores.repetirContrasena}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="RUT"
        value={rut}
        onChangeText={setRut}
      />
      {errores.rut ? <Text style={styles.errorText}>{errores.rut}</Text> : null}

      <View style={styles.switchContainer}>
        <Text>Conductor de furgón</Text>
        <Switch
          value={esConductor}
          onValueChange={setEsConductor}
          thumbColor={esConductor ? '#127067' : '#ccc'}
          trackColor={{ false: '#ccc', true: '#85d7c0' }}
        />
      </View>

      <View style={styles.checkboxContainer}>
        <Checkbox
          value={aceptaCondiciones}
          onValueChange={setAceptaCondiciones}
          color={aceptaCondiciones ? '#127067' : undefined}
        />
        <Text style={styles.checkboxLabel}>Acepto condiciones de uso y servicio</Text>
      </View>
      {errores.aceptaCondiciones ? <Text style={styles.errorText}>{errores.aceptaCondiciones}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: aceptaCondiciones ? '#127067' : '#ccc' }]}
        onPress={manejarRegistro}
        disabled={!aceptaCondiciones}
      >
        <Text style={styles.buttonText}>Regístrate</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    padding: 5,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: '600',
  },
  input: {
    width: '90%',
    borderColor: '#127067',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 10,
    marginBottom: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    flexWrap: 'wrap',
    width: '90%',
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 14,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 6,
    marginTop: 20,
    width: 150,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 13,
    marginBottom: 5,
    alignSelf: 'flex-start',
    marginLeft: 20,
  },
});
