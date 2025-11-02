import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useSyncRutActivo } from '@/hooks/use-sync-rut-activo';
import { makeShadow } from '@/utils/shadow';

interface Furgon {
  id: string;
  nombre: string;
  colegio: string;
  comuna: string;
  precio: string;
  patente: string;
}

export default function ListaFurgonesConductorScreen() {
  const router = useRouter();
  useSyncRutActivo();
  const [furgones, setFurgones] = useState<Furgon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [rutUsuario, setRutUsuario] = useState<string>('');

  useEffect(() => {
    const cargarFurgonesPropios = async () => {
      try {
        const rutGuardado = await AsyncStorage.getItem('rutUsuario');
        if (!rutGuardado) {
          Alert.alert('Error', 'No se encontró el RUT del usuario activo.');
          setLoading(false);
          return;
        }
        setRutUsuario(rutGuardado);

        const furgonesRef = collection(db, 'Furgones');
        const q = query(furgonesRef, where('rutUsuario', '==', rutGuardado));
        const snapshot = await getDocs(q);

        const lista: Furgon[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};
          return {
            id: docSnap.id,
            nombre: data.nombre || 'Sin nombre',
            colegio: data.colegio || 'Sin colegio',
            comuna: data.comuna || 'Sin comuna',
            precio: data.precio || 'No definido',
            patente: data.patente || 'Sin patente',
          };
        });

        setFurgones(lista);
      } catch (error) {
        console.error('Error al cargar furgones del conductor:', error);
        Alert.alert('Error', 'No se pudieron cargar los furgones.');
      } finally {
        setLoading(false);
      }
    };

    cargarFurgonesPropios();
  }, []);

  const handleVerPasajeros = (furgon: Furgon) => {
    if (!furgon.patente) {
      Alert.alert('Sin patente', 'El furgón seleccionado no tiene una patente registrada.');
      return;
    }

    router.push({
      pathname: '/(tabs)/conductor/lista-pasajeros',
      params: {
        patente: furgon.patente,
        nombre: furgon.nombre,
        colegio: furgon.colegio,
        comuna: furgon.comuna,
        precio: furgon.precio,
        rutConductor: rutUsuario,
      },
    });
  };

  const renderItem = ({ item }: { item: Furgon }) => (
    <Pressable onPress={() => handleVerPasajeros(item)} style={styles.card}>
      <View style={styles.headerCard}>
        <Ionicons name="bus-outline" size={32} color="#127067" />
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{item.nombre}</Text>
          <Text style={styles.subInfo}>{item.colegio}</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.info}>Patente: {item.patente}</Text>
        <Text style={styles.info}>Comuna: {item.comuna}</Text>
      </View>
      <Text style={styles.price}>Precio mensual: ${item.precio} CLP</Text>
      <Text style={styles.tapHint}>Toca para ver postulantes aceptados</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.feedbackContainer}>
        <ActivityIndicator size="large" color="#127067" />
        <Text style={styles.feedbackText}>Cargando furgones...</Text>
      </View>
    );
  }

  if (furgones.length === 0) {
    return (
      <View style={styles.feedbackContainer}>
        <Ionicons name="bus-outline" size={60} color="#999" />
        <Text style={styles.feedbackText}>Aún no registras furgones publicados</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="people-circle-outline" size={32} color="#127067" />
        <Text style={styles.title}>Selecciona un furgón</Text>
      </View>

      <FlatList
        data={furgones}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F8',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  feedbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7F8',
  },
  feedbackText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    ...makeShadow(
      '0 3px 6px rgba(0,0,0,0.1)',
      {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      },
    ),
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoContainer: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#127067',
  },
  subInfo: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  info: {
    fontSize: 14,
    color: '#555',
  },
  price: {
    fontSize: 14,
    color: '#333',
    marginTop: 6,
  },
  tapHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#127067',
    fontWeight: '600',
  },
});
