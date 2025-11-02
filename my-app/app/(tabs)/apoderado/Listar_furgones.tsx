import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import CryptoJS from 'crypto-js';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { useRouter } from 'expo-router';

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
  rutConductor: string;
  fotoBase64?: string;
  fotoMimeType?: string;
}

const ENCRYPTION_SALT = 'VEHICULO_IMG_V1';

export default function ListaFurgonesScreen() {
  const router = useRouter();
  useSyncRutActivo();

  const [furgones, setFurgones] = useState<Furgon[]>([]);
  const [loading, setLoading] = useState(true);
  const [comunaFiltro, setComunaFiltro] = useState('');

  useEffect(() => {
    const cargarFurgones = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'Furgones'));
        const lista: Furgon[] = await Promise.all(snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data() || {};

          let fotoBase64: string | undefined;
          let fotoMimeType: string | undefined;

          if (data.fotoCifrada && data.rutUsuario) {
            try {
              const clave = `${data.rutUsuario}-${ENCRYPTION_SALT}`;
              const bytes = CryptoJS.AES.decrypt(data.fotoCifrada, clave);
              const decodificado = bytes.toString(CryptoJS.enc.Utf8);
              if (decodificado) {
                fotoBase64 = decodificado;
                fotoMimeType = data.fotoMimeType || 'image/jpeg';
              }
            } catch (error) {
              console.warn('No se pudo descifrar la imagen del furgón:', error);
            }
          }

          if (!fotoBase64 && data.patente) {
            try {
              const vehiculosSnap = await getDocs(
                query(collection(db, 'Vehiculos'), where('patente', '==', data.patente), limit(1)),
              );
              if (!vehiculosSnap.empty) {
                const vehiculoData = vehiculosSnap.docs[0].data() || {};
                if (vehiculoData.fotoCifrada) {
                  const rutReferencia = vehiculoData.rutUsuario || data.rutUsuario || '';
                  if (rutReferencia) {
                    const claveVehiculo = `${rutReferencia}-${ENCRYPTION_SALT}`;
                    const bytesVehiculo = CryptoJS.AES.decrypt(vehiculoData.fotoCifrada, claveVehiculo);
                    const base64Vehiculo = bytesVehiculo.toString(CryptoJS.enc.Utf8);
                    if (base64Vehiculo) {
                      fotoBase64 = base64Vehiculo;
                      fotoMimeType = vehiculoData.fotoMimeType || 'image/jpeg';
                    }
                  }
                }
              }
            } catch (error) {
              console.warn('No se pudo obtener la imagen desde Vehiculos para la patente:', data.patente, error);
            }
          }

          return {
            id: docSnap.id,
            nombre: data.nombre || 'Sin nombre',
            colegio: data.colegio || 'Sin colegio',
            comuna: data.comuna || 'Sin comuna',
            precio: data.precio || 'No definido',
            patente: data.patente || '',
            rutConductor: data.rutUsuario || '',
            fotoBase64,
            fotoMimeType,
          };
        }));

        setFurgones(lista);
      } catch (error) {
        console.error('Error al cargar furgones:', error);
        Alert.alert('Error', 'No se pudieron cargar los furgones.');
      } finally {
        setLoading(false);
      }
    };

    cargarFurgones();
  }, []);

  const furgonesFiltrados = useMemo(
    () =>
      furgones.filter((f) =>
        comunaFiltro === '' ? true : f.comuna.toLowerCase().includes(comunaFiltro.toLowerCase()),
      ),
    [furgones, comunaFiltro],
  );

  const handleInscribirFurgon = (furgon: Furgon) => {
    router.push({
      pathname: '/(tabs)/apoderado/inscribir-furgon',
      params: {
        id: furgon.id,
        nombre: furgon.nombre,
        colegio: furgon.colegio,
        comuna: furgon.comuna,
        precio: furgon.precio,
        patente: furgon.patente,
        rutConductor: furgon.rutConductor,
      },
    });
  };

  const handleVolver = () => {
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace('/(tabs)/apoderado/pagina-principal-apoderado');
    }
  };

  const renderItem = ({ item }: { item: Furgon }) => (
    <Pressable style={styles.card} onPress={() => handleInscribirFurgon(item)}>
      <View style={styles.cardImageWrapper}>
        {item.fotoBase64 ? (
          <Image
            source={{ uri: `data:${item.fotoMimeType || 'image/jpeg'};base64,${item.fotoBase64}` }}
            style={styles.cardImage}
            contentFit="cover"
          />
        ) : (
          <Ionicons name="image-outline" size={28} color="#7f8c8d" />
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.nombre}</Text>
        <Text style={styles.cardSubtitle}>{item.colegio}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={handleVolver}>
        <Ionicons name="arrow-back" size={26} color="#127067" />
      </Pressable>

      <TextInput
        style={styles.searchInput}
        placeholder="Comuna"
        placeholderTextColor="#127067"
        value={comunaFiltro}
        onChangeText={setComunaFiltro}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#127067" />
          <Text style={styles.loadingText}>Cargando furgones...</Text>
        </View>
      ) : furgonesFiltrados.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="sad-outline" size={60} color="#999999" />
          <Text style={styles.emptyText}>No hay furgones disponibles</Text>
        </View>
      ) : (
        <FlatList
          data={furgonesFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  backButton: {
    position: 'absolute',
    top: 36,
    left: 20,
    padding: 6,
    zIndex: 10,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#127067',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
    color: '#127067',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: '#777777',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E4ECEC',
    elevation: 2,
    ...makeShadow(
      '0 4px 8px rgba(0,0,0,0.08)',
      {
        shadowColor: '#000000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
    ),
  },
  cardImageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#127067',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#4F5B5A',
    marginTop: 2,
  },
});
