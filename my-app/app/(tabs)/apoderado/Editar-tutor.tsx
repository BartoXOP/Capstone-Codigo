import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncRutActivo } from '@/hooks/use-sync-rut-activo';
import { makeShadow } from '@/utils/shadow';

export default function EditarTutorScreen() {
  const router = useRouter();
  useSyncRutActivo();
  const params = useLocalSearchParams();

  const [nombres, setNombres] = useState(params.nombres?.toString() || '');
  const [apellidos, setApellidos] = useState(params.apellidos?.toString() || '');
  const [rut, setRut] = useState(params.rut?.toString() || '');
  const [fechaNacimiento, setFechaNacimiento] = useState(params.fechaNacimiento?.toString() || '');
  const [edad, setEdad] = useState(params.edad?.toString() || '');
  const [direccion, setDireccion] = useState(params.direccion?.toString() || '');
  const [rutUsuario, setRutUsuario] = useState('');
  const [loading, setLoading] = useState(false);

  const [errores, setErrores] = useState({
    nombres: '',
    apellidos: '',
    rut: '',
    fechaNacimiento: '',
    edad: '',
    direccion: '',
  });

  // 🔹 Obtener el rut del usuario desde AsyncStorage
  useEffect(() => {
    const obtenerRutUsuario = async () => {
      try {
        const rutGuardado = await AsyncStorage.getItem('rutUsuario');
        if (rutGuardado) {
          setRutUsuario(rutGuardado);
          console.log('✅ RUT del usuario cargado:', rutGuardado);
        } else {
          Alert.alert('Error', 'No se encontró el RUT del usuario activo.');
        }
      } catch (error) {
        console.error('❌ Error al obtener el RUT del usuario:', error);
      }
    };

    obtenerRutUsuario();
  }, []);

  // 🔹 Actualizar tutor en Firestore
  const manejarActualizarTutor = async () => {
    const nuevosErrores = {
      nombres: !nombres ? 'Ingresa el nombre del tutor' : '',
      apellidos: !apellidos ? 'Ingresa el apellido' : '',
      rut: !rut ? 'Ingresa el RUT del tutor' : '',
      fechaNacimiento: !fechaNacimiento ? 'Ingresa la fecha de nacimiento' : '',
      edad: !edad ? 'Ingresa la edad' : '',
      direccion: !direccion ? 'Ingresa la dirección' : '',
    };

    setErrores(nuevosErrores);

    if (Object.values(nuevosErrores).some((msg) => msg !== '')) return;

    if (!rutUsuario) {
      Alert.alert('Error', 'No se puede actualizar el tutor sin el RUT del usuario.');
      return;
    }

    try {
      setLoading(true);

      const tutorRef = doc(db, 'Tutores', params.id?.toString() || '');
      
      await updateDoc(tutorRef, {
        nombres,
        apellidos,
        rut,
        fechaNacimiento,
        edad,
        direccion,
        rutUsuario,
        actualizadoEn: serverTimestamp(),
      });

      Alert.alert('✅ Éxito', 'Tutor actualizado correctamente.');
      router.back();
    } catch (error) {
      console.error('❌ Error al actualizar en Firebase:', error);
      Alert.alert('Error', 'No se pudo actualizar la información.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Botón de volver */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={28} color="#127067" />
      </Pressable>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Imagen de perfil */}
        <View style={styles.profileImageContainer}>
          <Image
            source={require('@/assets/images/user_icon.png')}
            style={styles.profileImage}
            contentFit="cover"
          />
        </View>

        <Text style={styles.title}>Editar tutor</Text>

        {/* Campos del formulario */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombres</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa los nombres"
              value={nombres}
              onChangeText={setNombres}
            />
            {errores.nombres ? <Text style={styles.errorText}>{errores.nombres}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Apellidos</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa los apellidos"
              value={apellidos}
              onChangeText={setApellidos}
            />
            {errores.apellidos ? <Text style={styles.errorText}>{errores.apellidos}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rut</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa el RUT"
              value={rut}
              onChangeText={setRut}
            />
            {errores.rut ? <Text style={styles.errorText}>{errores.rut}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fecha de nacimiento</Text>
            <TextInput
              style={styles.input}
              placeholder="dd/mm/aaaa"
              value={fechaNacimiento}
              onChangeText={setFechaNacimiento}
            />
            {errores.fechaNacimiento ? (
              <Text style={styles.errorText}>{errores.fechaNacimiento}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Edad</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa la edad"
              value={edad}
              keyboardType="numeric"
              onChangeText={setEdad}
            />
            {errores.edad ? <Text style={styles.errorText}>{errores.edad}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa la dirección"
              value={direccion}
              onChangeText={setDireccion}
            />
            {errores.direccion ? <Text style={styles.errorText}>{errores.direccion}</Text> : null}
          </View>
        </View>

        <Pressable
          style={styles.button}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/apoderado/Editar_tutor_documentos',
              params: {
                id: params.id?.toString() || '',
                rut: rut || params.rut?.toString() || '',
              },
            })
          }
        >
          <Text style={styles.buttonText}>Editar documentos</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  header: {
    width: '100%',
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#127067',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  profileImageContainer: {
    backgroundColor: '#e6e6e6',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  profileImage: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 22,
    marginBottom: 30,
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
  secondaryButton: {
    marginTop: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 13,
    marginTop: 5,
    marginLeft: 5,
  },
});

