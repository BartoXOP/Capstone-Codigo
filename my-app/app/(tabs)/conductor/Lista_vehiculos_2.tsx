import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, FlatList, TouchableOpacity, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useSyncRutActivo } from '@/hooks/use-sync-rut-activo';
import { makeShadow } from '@/utils/shadow';

interface Vehiculo {
  id: string;
  patente: string;
  modelo: string;
  colegio?: string;
  comuna?: string;
  precio?: string;
}

export default function ListaVehiculosRedirectScreen() {
  const router = useRouter();
  useSyncRutActivo();
  const [estado, setEstado] = useState<'cargando' | 'sinVehiculos' | 'listo'>('cargando');
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [rutUsuario, setRutUsuario] = useState<string>('');

  const cargarVehiculos = useCallback(async () => {
    setEstado('cargando');
    try {
      const rutGuardado = await AsyncStorage.getItem('rutUsuario');
      if (!rutGuardado) {
        Alert.alert('Error', 'No se encontró el RUT del usuario activo.');
        setVehiculos([]);
        setEstado('sinVehiculos');
        return;
      }
      setRutUsuario(rutGuardado);

      const vehiculosRef = collection(db, 'Vehiculos');
      const q = query(vehiculosRef, where('rutUsuario', '==', rutGuardado));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setVehiculos([]);
        setEstado('sinVehiculos');
        return;
      }

      const listaVehiculos = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() || {};
          const patente = data.patente?.toString().trim() || '';
          if (!patente) {
            return null;
          }
          return {
            id: docSnap.id,
            patente,
            modelo: data.modelo?.toString() || 'Furgon',
            colegio: data.colegio?.toString() || '',
            comuna: data.comuna?.toString() || '',
            precio: data.precio?.toString() || '',
          } as Vehiculo;
        })
        .filter(Boolean) as Vehiculo[];

      if (listaVehiculos.length === 0) {
        setVehiculos([]);
        setEstado('sinVehiculos');
        return;
      }

      setVehiculos(listaVehiculos);
      setEstado('listo');
    } catch (error) {
      console.error('Error al obtener la lista de vehículos:', error);
      Alert.alert('Error', 'No se pudo obtener la lista de vehículos.');
      setVehiculos([]);
      setEstado('sinVehiculos');
    }
  }, []);

  useEffect(() => {
    cargarVehiculos();
  }, [cargarVehiculos]);

  useFocusEffect(
    useCallback(() => {
      cargarVehiculos();
    }, [cargarVehiculos]),
  );

  const handleAbrirLista = (vehiculo: Vehiculo) => {
    router.push({
      pathname: '/(tabs)/conductor/lista-pasajeros',
      params: {
        patente: vehiculo.patente,
        nombre: vehiculo.modelo || 'Furgon',
        colegio: vehiculo.colegio || '',
        comuna: vehiculo.comuna || '',
        precio: vehiculo.precio || '',
        rutConductor: rutUsuario,
      },
    });
  };

  if (estado === 'cargando') {
    return (
      <View style={styles.feedbackContainer}>
        <ActivityIndicator size="large" color="#127067" />
        <Text style={styles.feedbackText}>Cargando vehículos…</Text>
      </View>
    );
  }

  if (estado === 'listo') {
    return (
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Pressable style={styles.backButton} onPress={() => router.replace('/(tabs)/conductor/pagina-principal-conductor')}>
            <Ionicons name="arrow-back" size={26} color="#127067" />
          </Pressable>
          <Text style={styles.title}>Selecciona un furgon</Text>
        </View>
        <FlatList
          data={vehiculos}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.vehicleCard} onPress={() => handleAbrirLista(item)}>
              <View style={styles.vehicleHeader}>
                <Ionicons name="bus" size={28} color="#127067" />
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>{item.modelo}</Text>
                  <Text style={styles.vehiclePatente}>Patente: {item.patente}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#555" />
              </View>
              {(item.colegio || item.comuna || item.precio) && (
                <View style={styles.vehicleDetails}>
                  {item.colegio ? <Text style={styles.detailText}>Colegio: {item.colegio}</Text> : null}
                  {item.comuna ? <Text style={styles.detailText}>Comuna: {item.comuna}</Text> : null}
                  {item.precio ? <Text style={styles.detailText}>Tarifa: {item.precio}</Text> : null}
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.feedbackContainer}>
      <Ionicons name="bus-outline" size={64} color="#999" />
      <Text style={styles.feedbackText}>
        No encontramos vehiculos registrados para mostrar ninos asociados.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    backgroundColor: '#F5F7F8',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 6,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#127067',
    flex: 1,
    textAlign: 'center',
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    ...makeShadow(
      '0 3px 6px rgba(0,0,0,0.1)',
      {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
    ),
  },
  separator: {
    height: 16,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#172b2a',
  },
  vehiclePatente: {
    fontSize: 14,
    color: '#4f5b5a',
    marginTop: 2,
  },
  vehicleDetails: {
    marginTop: 12,
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
  },
  feedbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7F8',
    paddingHorizontal: 24,
  },
  feedbackText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});
