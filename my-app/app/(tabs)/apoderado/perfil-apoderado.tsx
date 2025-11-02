import { useSyncRutActivo } from '@/hooks/use-sync-rut-activo';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableHighlight, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  useSyncRutActivo();

  const handleLogout = async () => {
    try {
      // Limpiar todos los datos de sesión
      await AsyncStorage.clear();
      // Redirigir al login
      router.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const name = await AsyncStorage.getItem('userName');
        if (name && name.trim() !== '') setUserName(name);
        else setUserName('Usuario');
      } catch (error) {
        setUserName('Usuario');
      }
    };
    loadUserData();
  }, []);

  return (
    <View style={styles.container}>
      {/* Botón de volver */}
      <Pressable
        style={styles.backButton}
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/apoderado/pagina-principal-apoderado');
          }
        }}
      >
        <Ionicons name="arrow-back" size={28} color="#127067" />
      </Pressable>

      {/* Icono de usuario */}
      <View style={styles.profileImageContainer}>
        <Image
          source={require('@/assets/images/user_icon.png')}
          style={styles.profileImage}
          contentFit="cover"
        />
      </View>

      {/* Nombre dinámico */}
      <Text style={styles.userName}>{userName}</Text>

      {/* Botones */}
      <Link href="/apoderado/Editar_datos_apoderado" asChild>
        <TouchableHighlight style={styles.button} underlayColor="#0e5b52">
          <Text style={styles.buttonText}>Editar datos</Text>
        </TouchableHighlight>
      </Link>

      <Link href="/apoderado/Agregar-hijo" asChild>
        <TouchableHighlight style={styles.button} underlayColor="#0e5b52">
          <Text style={styles.buttonText}>Añadir hijo</Text>
        </TouchableHighlight>
      </Link>

      <Link href="/apoderado/lista-hijos" asChild>
        <TouchableHighlight style={styles.button} underlayColor="#0e5b52">
          <Text style={styles.buttonText}>Editar hijo</Text>
        </TouchableHighlight>
      </Link>

      <Link href="/apoderado/Agregar_tutor" asChild>
        <TouchableHighlight style={styles.button} underlayColor="#0e5b52">
          <Text style={styles.buttonText}>Añadir tutor</Text>
        </TouchableHighlight>
      </Link>

      <Link href="/apoderado/lista-tutores" asChild>
        <TouchableHighlight style={styles.button} underlayColor="#0e5b52">
          <Text style={styles.buttonText}>Editar tutor</Text>
        </TouchableHighlight>
      </Link>

      <TouchableHighlight 
        style={[styles.button, styles.logoutButton]} 
        underlayColor="#b33d3d"
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </TouchableHighlight>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  profileImageContainer: {
    backgroundColor: '#e6e6e6',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 30,
  },
  profileImage: {
    width: 50,
    height: 50,
  },
  userName: {
    fontSize: 20,
    color: '#333333',
    marginBottom: 30,
    textTransform: 'capitalize',
  },
  button: {
    backgroundColor: '#127067',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginVertical: 8,
    width: 180,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
  },
});
