import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useSyncRutActivo } from '@/hooks/use-sync-rut-activo';
import { makeShadow } from '@/utils/shadow';

interface Pasajero {
  id: string;
  nombreHijo: string;
  colegio: string;
  nombreApoderado: string;
  rutHijo: string;
  rutApoderado: string;
}

export default function ListaPasajerosScreen() {
  useSyncRutActivo();
  const router = useRouter();
  const params = useLocalSearchParams();

  const patenteParam = (params.patente as string) || '';
  const nombreFurgon = (params.nombre as string) || 'Furgón';
  const colegioFurgon = (params.colegio as string) || '';

  const [pasajeros, setPasajeros] = useState<Pasajero[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [rutConductorActual, setRutConductorActual] = useState<string>('');

  const cargarPasajeros = useCallback(async () => {
    if (!patenteParam) {
      Alert.alert('Error', 'No se recibió la patente del furgón.');
      setPasajeros([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rutConductor = await AsyncStorage.getItem('rutUsuario');
      if (!rutConductor) {
        Alert.alert('Error', 'No se encontró el RUT del conductor activo.');
        setPasajeros([]);
        setLoading(false);
        return;
      }
      setRutConductorActual(rutConductor);

      const listaRef = collection(db, 'lista_pasajeros');
      const q = query(
        listaRef,
        where('patenteFurgon', '==', patenteParam),
        where('rutConductor', '==', rutConductor),
      );
      const snapshot = await getDocs(q);

      const pasajerosConColegio: Pasajero[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() || {};
        let colegio = data.colegio || '';

        if (!colegio && data.idPostulacion) {
          try {
            const postulacionSnap = await getDoc(doc(db, 'Postulaciones', data.idPostulacion));
            if (postulacionSnap.exists()) {
              const postulacionData = postulacionSnap.data() as any;
              colegio = postulacionData?.colegio || '';
            }
          } catch (error) {
            console.error('No se pudo obtener el colegio desde la postulacion:', error);
          }
        }

        pasajerosConColegio.push({
          id: docSnap.id,
          nombreHijo: data.nombreHijo || 'Sin nombre',
          colegio,
          nombreApoderado: data.nombreApoderado || 'Apoderado no informado',
          rutHijo: data.rutHijo || '',
          rutApoderado: data.rutApoderado || '',
        });
      }

      setPasajeros(pasajerosConColegio);
    } catch (error) {
      console.error('Error al cargar la lista de pasajeros:', error);
      Alert.alert('Error', 'No se pudo obtener la lista de niños aceptados.');
      setPasajeros([]);
    } finally {
      setLoading(false);
    }
  }, [patenteParam]);

  useEffect(() => {
    cargarPasajeros();
  }, [cargarPasajeros]);

  useFocusEffect(
    useCallback(() => {
      cargarPasajeros();
    }, [cargarPasajeros]),
  );

  const handleVolver = () => {
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace('/(tabs)/conductor/pagina-principal-conductor');
    }
  };

  const handleVerDetalleNino = (item: Pasajero) => {
    router.push({
      pathname: '/(tabs)/conductor/detalle_nino',
      params: {
        listaPasajeroId: item.id,
        rut: item.rutHijo,
        rutApoderado: item.rutApoderado,
        rutConductor: rutConductorActual,
        nombre: item.nombreHijo,
        patenteFurgon: patenteParam,
        nombreFurgon,
      },
    });
  };

  const renderPasajero = ({ item }: { item: Pasajero }) => (
    <Pressable style={styles.card} onPress={() => handleVerDetalleNino(item)}>
      <Ionicons name="person-circle-outline" size={48} color="#127067" style={styles.avatar} />
      <View style={styles.cardText}>
        <Text style={styles.childName}>{item.nombreHijo}</Text>
        <Text style={styles.schoolText}>
          {item.colegio ? `Colegio ${item.colegio}` : 'Colegio no informado'}
        </Text>
        <Text style={styles.guardianText}>Apoderado: {item.nombreApoderado}</Text>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.feedbackContainer}>
        <ActivityIndicator size="large" color="#127067" />
        <Text style={styles.feedbackText}>Buscando niños aceptados...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={handleVolver} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="#127067" />
        </Pressable>
        <Ionicons name="alert-circle-outline" size={26} color="#127067" />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Lista de niños</Text>
        <Text style={styles.subtitle}>
          {nombreFurgon}
          {colegioFurgon ? ` · ${colegioFurgon}` : ''}
        </Text>
        <Text style={styles.patenteText}>Patente: {patenteParam}</Text>
      </View>

      {pasajeros.length === 0 ? (
        <View style={styles.feedbackContainer}>
          <Ionicons name="sad-outline" size={60} color="#999" />
          <Text style={styles.feedbackText}>Aún no hay niños aceptados para este furgón.</Text>
        </View>
      ) : (
        <FlatList
          data={pasajeros}
          keyExtractor={(item) => item.id}
          renderItem={renderPasajero}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 2,
    ...makeShadow(
      '0 2px 4px rgba(0,0,0,0.1)',
      {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
      },
    ),
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#127067',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginTop: 6,
  },
  patenteText: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  feedbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  feedbackText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
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
  avatar: {
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  schoolText: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  guardianText: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
});
