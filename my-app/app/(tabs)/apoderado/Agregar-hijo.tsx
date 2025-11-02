import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncRutActivo } from '@/hooks/use-sync-rut-activo';

interface DatosHijoDraft {
  nombres: string;
  apellidos: string;
  rut: string;
  fechaNacimiento: string;
  edad: string;
  rutUsuario: string;
}

export default function AddChildScreen() {
  const router = useRouter();
  useSyncRutActivo();

  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [rut, setRut] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [edad, setEdad] = useState('');
  const [rutUsuario, setRutUsuario] = useState('');
  const [loading, setLoading] = useState(false);

  const [errores, setErrores] = useState({
    nombres: '',
    apellidos: '',
    rut: '',
    fechaNacimiento: '',
    edad: '',
  });

  useEffect(() => {
    const inicializar = async () => {
      try {
        const rutGuardado = await AsyncStorage.getItem('rutUsuario');
        if (rutGuardado) {
          setRutUsuario(rutGuardado);
        } else {
          Alert.alert('Error', 'No se encontr� el RUT del usuario activo.');
        }
        // Limpiar posibles borradores previos
        await AsyncStorage.multiRemove(['nuevoHijoData', 'nuevoHijoHorario', 'nuevoHijoInforme']);
      } catch (error) {
        console.error('Error al preparar el formulario de hijo:', error);
      }
    };

    inicializar();
  }, []);

  const manejarGuardarHijo = async () => {
    const nuevosErrores = {
      nombres: !nombres ? 'Ingresa el nombre del hijo' : '',
      apellidos: !apellidos ? 'Ingresa el apellido' : '',
      rut: !rut ? 'Ingresa el RUT del hijo' : '',
      fechaNacimiento: !fechaNacimiento ? 'Ingresa la fecha de nacimiento' : '',
      edad: !edad ? 'Ingresa la edad' : '',
    };

    setErrores(nuevosErrores);

    if (Object.values(nuevosErrores).some((msg) => msg !== '')) {
      return;
    }

    if (!rutUsuario) {
      Alert.alert('Error', 'No se puede continuar sin el RUT del usuario.');
      return;
    }

    try {
      setLoading(true);

      const payload: DatosHijoDraft = {
        nombres,
        apellidos,
        rut,
        fechaNacimiento,
        edad,
        rutUsuario,
      };

      await AsyncStorage.setItem('nuevoHijoData', JSON.stringify(payload));

      Alert.alert('Datos guardados', 'Ahora agrega el horario del ni�o.');
      router.push('/(tabs)/apoderado/Agregar_Horario_hijo');
    } catch (error) {
      console.error('Error al guardar el borrador del hijo:', error);
      Alert.alert('Error', 'No se pudo guardar la informaci�n localmente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={28} color="#127067" />
      </Pressable>

      <View style={styles.profileImageContainer}>
        <Image
          source={require('@/assets/images/user_icon.png')}
          style={styles.profileImage}
          contentFit="cover"
        />
      </View>

      <Text style={styles.title}>Agregar hijo</Text>

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
        placeholder="RUT del hijo"
        value={rut}
        onChangeText={setRut}
      />
      {errores.rut ? <Text style={styles.errorText}>{errores.rut}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Fecha de nacimiento (dd/mm/aaaa)"
        value={fechaNacimiento}
        onChangeText={setFechaNacimiento}
      />
      {errores.fechaNacimiento ? <Text style={styles.errorText}>{errores.fechaNacimiento}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Edad"
        value={edad}
        keyboardType="numeric"
        onChangeText={setEdad}
      />
      {errores.edad ? <Text style={styles.errorText}>{errores.edad}</Text> : null}

      <Pressable style={styles.button} onPress={manejarGuardarHijo} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continuar</Text>}
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
  profileImageContainer: {
    backgroundColor: '#e6e6e6',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  input: {
    width: '90%',
    borderColor: '#127067',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#127067',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginTop: 10,
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
    marginLeft: 25,
  },
});
