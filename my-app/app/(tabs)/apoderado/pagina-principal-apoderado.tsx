import { db } from '@/firebaseConfig';
import { useSyncRutActivo } from '@/hooks/use-sync-rut-activo';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useRouter } from 'expo-router';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { makeShadow } from '@/utils/shadow';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from 'react-native';
// Import using a relative path so Metro resolver finds the file immediately
import DriverMap from '../../../components/DriverMap';
import MapboxDriver from '../../../components/MapboxDriver';

interface Hijo {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  edad: number | string;
  fechaNacimiento: string;
}

interface Alerta {
  id: string;
  tipo: string;
  descripcion: string;
  rutaDestino?: string;
  parametros?: Record<string, any>;
  patenteFurgon?: string;
  fecha?: Date | null;
}

export default function PaginaPrincipal() {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [alertasVisible, setAlertasVisible] = useState(false);
  const [rutUsuario, setRutUsuario] = useState<string>('');
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [hijoSeleccionado, setHijoSeleccionado] = useState<Hijo | null>(null);
  const [loadingHijos, setLoadingHijos] = useState(true);
  const [listaHijosVisible, setListaHijosVisible] = useState(false);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [patentesAsignadas, setPatentesAsignadas] = useState<string[]>([]);
  const [ultimaRevisionAlertas, setUltimaRevisionAlertas] = useState<number | null>(null);
  useSyncRutActivo();

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [rutGuardado, rutHijoPrevio] = await Promise.all([
          AsyncStorage.getItem('rutUsuario'),
          AsyncStorage.getItem('rutHijoSeleccionado'),
        ]);
        if (!rutGuardado) {
          Alert.alert('Error', 'No se encontró el RUT del usuario activo.');
          setLoadingHijos(false);
          return;
        }
        setRutUsuario(rutGuardado);

        const hijosRef = collection(db, 'Hijos');
        const q = query(hijosRef, where('rutUsuario', '==', rutGuardado));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const listaHijos: Hijo[] = querySnapshot.docs.map((doc) => {
            const data = doc.data() || {};
            return {
              id: doc.id,
              nombres: data.nombres || 'Sin nombre',
              apellidos: data.apellidos || 'Sin apellido',
              rut: data.rut || 'Sin RUT',
              edad: data.edad !== undefined ? data.edad : '-',
              fechaNacimiento: data.fechaNacimiento || 'No disponible',
            };
          });
          setHijos(listaHijos);
          if (listaHijos.length > 0) {
            const hijoInicial = rutHijoPrevio
              ? listaHijos.find((hijo) => hijo.rut === rutHijoPrevio) ?? listaHijos[0]
              : listaHijos[0];
            setHijoSeleccionado(hijoInicial);
            AsyncStorage.setItem('rutHijoSeleccionado', hijoInicial.rut).catch((error) => {
              console.error('No se pudo guardar el RUT del hijo seleccionado:', error);
            });
          } else {
            AsyncStorage.removeItem('rutHijoSeleccionado').catch((error) => {
              console.error('No se pudo eliminar el RUT del hijo seleccionado:', error);
            });
          }
        }

        const patentesSet = new Set<string>();
        try {
          const listaPasajerosRef = collection(db, 'lista_pasajeros');
          const listaPasajerosSnap = await getDocs(
            query(listaPasajerosRef, where('rutApoderado', '==', rutGuardado)),
          );
          listaPasajerosSnap.forEach((docSnap) => {
            const data = docSnap.data() || {};
            const patente = (data.patenteFurgon || '').toString().trim();
            if (patente) {
              patentesSet.add(patente);
            }
          });
        } catch (errorPatentes) {
          console.error('No se pudieron obtener los furgones asignados al apoderado:', errorPatentes);
        }
        const patentesLista = Array.from(patentesSet);
        setPatentesAsignadas(patentesLista);

        // Cargar alertas desde Firebase
        const alertasRef = collection(db, 'Alertas');
        let alertasSnapshot;
        try {
          const alertasQuery = query(
            alertasRef,
            where('rutDestinatario', '==', rutGuardado),
            orderBy('creadoEn', 'desc'),
            limit(10),
          );
          alertasSnapshot = await getDocs(alertasQuery);
        } catch (errorConsulta) {
          const alertaFallbackQuery = query(alertasRef, where('rutDestinatario', '==', rutGuardado), limit(10));
          alertasSnapshot = await getDocs(alertaFallbackQuery);
        }
        const listaAlertas: Alerta[] = alertasSnapshot.docs
            .map((docSnap) => {
              const data = docSnap.data() || {};
              const fecha =
                data.creadoEn && typeof data.creadoEn.toDate === 'function'
                  ? data.creadoEn.toDate()
                  : data.fecha
                  ? new Date(data.fecha)
                  : null;
              return {
                id: docSnap.id,
                tipo: data.tipoAlerta || 'Alerta',
                descripcion: data.descripcion || 'Sin descripcion',
                rutaDestino: data.rutaDestino,
                parametros: data.parametros,
                patenteFurgon: (data.patenteFurgon || '').toString().trim(),
                fecha,
              };
            })
            .filter((alerta) => {
              if (!patentesLista.length) return false;
              if (!alerta.patenteFurgon) return false;
              return patentesSet.has(alerta.patenteFurgon);
            })
            .sort((a, b) => {
              const fechaA = a.fecha ? a.fecha.getTime() : 0;
              const fechaB = b.fecha ? b.fecha.getTime() : 0;
              return fechaB - fechaA;
            })
            .slice(0, 10);
          setAlertas(listaAlertas);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        Alert.alert('Error', 'No se pudieron cargar los datos.');
      } finally {
        setLoadingHijos(false);
      }
    };

    cargarDatos();
  }, []);

  const alertasMostradas = alertas.slice(0, 10);
  const hayAlertasSinRevisar = useMemo(() => {
    if (alertasMostradas.length === 0) return false;
    if (!ultimaRevisionAlertas) return true;
    const masReciente = alertasMostradas[0]?.fecha;
    return masReciente ? masReciente.getTime() > ultimaRevisionAlertas : false;
  }, [alertasMostradas, ultimaRevisionAlertas]);

  const toggleAlertas = () => {
    setAlertasVisible((prev) => {
      const next = !prev;
      if (next) {
        setListaHijosVisible(false);
      } else {
        setUltimaRevisionAlertas(Date.now());
      }
      return next;
    });
  };

  const toggleListaHijos = () => {
    setListaHijosVisible((prev) => {
      const next = !prev;
      if (next) {
        setAlertasVisible(false);
      }
      return next;
    });
  };

  const handleAlertaPress = (alerta: Alerta) => {
    setAlertasVisible(false);
    const params =
      alerta.parametros && typeof alerta.parametros === 'object'
        ? Object.fromEntries(
            Object.entries(alerta.parametros).map(([key, value]) => [key, value != null ? String(value) : '']),
          )
        : {};

    if (alerta.tipo.toLowerCase() === 'urgencia') {
      router.push({ pathname: '/chat-urgencia', params });
      return;
    }

    if (alerta.rutaDestino && typeof alerta.rutaDestino === 'string') {
      router.push({ pathname: alerta.rutaDestino as any, params });
    }
  };

  const seleccionarHijo = (hijo: Hijo) => {
    setHijoSeleccionado(hijo);
    setListaHijosVisible(false);
    AsyncStorage.setItem('rutHijoSeleccionado', hijo.rut).catch((error) => {
      console.error('No se pudo guardar el RUT del hijo seleccionado:', error);
    });
  };

  return (
    <View style={styles.container}>
      {/* Barra verde superior */}
      <View style={styles.greenHeader}>
        <Pressable onPress={() => setMenuVisible(!menuVisible)} style={styles.iconButton}>
          <Ionicons name="menu" size={28} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter} />
        <Pressable onPress={toggleAlertas} style={styles.iconButton}>
          <View style={styles.notificationWrapper}>
            <Ionicons
              name="notifications-outline"
              size={28}
              color={alertasVisible ? '#1dbb7f' : '#fff'}
            />
            {hayAlertasSinRevisar && !alertasVisible ? <View style={styles.notificationDot} /> : null}
          </View>
        </Pressable>
      </View>

      {/* Selector de hijo + alertas */}
      <View style={styles.selectorWrapper}>
        <View style={styles.hijoSelectorContainer}>
          <Pressable style={styles.hijoSelector} onPress={toggleListaHijos}>
            <Text style={styles.hijoSelectorText}>
              {loadingHijos
                ? 'Cargando...'
                : hijoSeleccionado
                ? `${hijoSeleccionado.nombres} ${hijoSeleccionado.apellidos}`
                : 'Seleccionar hijo'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#127067" />
          </Pressable>

          {listaHijosVisible && hijos.length > 0 && (
            <View style={styles.listaHijos}>
              {hijos.map((hijo) => (
                <Pressable key={hijo.id} style={styles.hijoOption} onPress={() => seleccionarHijo(hijo)}>
                  <Text style={styles.hijoOptionText}>
                    {hijo.nombres} {hijo.apellidos}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {alertasVisible && (
          <View style={styles.alertas}>
            <Text style={styles.alertasTitle}>Alertas</Text>
            {alertasMostradas.length === 0 ? (
              <Text style={styles.noAlertasText}>No hay alertas nuevas</Text>
            ) : (
              <ScrollView
                style={styles.alertasScroll}
                contentContainerStyle={styles.alertasScrollContent}
                showsVerticalScrollIndicator
              >
                {alertasMostradas.map((alerta) => {
                  const esUrgente = alerta.tipo.toLowerCase() === 'urgencia';
                  const iconColor = esUrgente ? '#a94442' : '#f39c12';
                  const iconName = esUrgente ? 'alert' : 'alert-circle';
                  return (
                    <Pressable key={alerta.id} style={styles.alertaItem} onPress={() => handleAlertaPress(alerta)}>
                      <Ionicons name={iconName} size={20} color={iconColor} />
                      <View style={styles.alertaTexts}>
                        <Text style={[styles.alertaTipo, esUrgente && styles.alertaTipoUrgente]}>{alerta.tipo}</Text>
                        <Text style={styles.alertaDescripcion}>{alerta.descripcion}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Menú lateral */}
      {menuVisible && (
        <View style={styles.menu}>
          <Link href="/apoderado/perfil-apoderado" asChild>
            <TouchableHighlight underlayColor="#127067" style={styles.menuButton}>
              <Text style={styles.menuButtonText}>Perfil</Text>
            </TouchableHighlight>
          </Link>
          <Link href="/historial-viajes" asChild>
            <TouchableHighlight underlayColor="#127067" style={styles.menuButton}>
              <Text style={styles.menuButtonText}>Historial de viajes</Text>
            </TouchableHighlight>
          </Link>
          <Link href="/apoderado/Listar_furgones" asChild>
            <TouchableHighlight underlayColor="#127067" style={styles.menuButton}>
              <Text style={styles.menuButtonText}>Inscribir Furgon</Text>
            </TouchableHighlight>
          </Link>
          <Link href="/chat-furgon" asChild>
            <TouchableHighlight underlayColor="#127067" style={styles.menuButton}>
              <Text style={styles.menuButtonText}>Chat de furgon</Text>
            </TouchableHighlight>
          </Link>
        </View>
      )}

      {/* Mapa del conductor (DriverMap) */}
      <View style={styles.mapaContainer} pointerEvents={listaHijosVisible ? 'none' : 'auto'}>
        {/* MapboxDriver: usa Mapbox en web/native. Pasa accessToken o configura via env. */}
        <MapboxDriver
          accessToken={undefined} /* reemplaza con tu token: process.env.MAPBOX_TOKEN */
          simulatedPath={[
            { latitude: -33.4495, longitude: -70.667 },
            { latitude: -33.4498, longitude: -70.6665 },
            { latitude: -33.4502, longitude: -70.6660 },
            { latitude: -33.4506, longitude: -70.6655 },
          ]}
        />
      </View>
    </View>
  );
}

const surfaceShadow = makeShadow(
  '0 12px 24px rgba(0,0,0,0.15)',
  {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F8',
  },
  greenHeader: {
    backgroundColor: '#127067',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 15,
    height: 80,
  },
  iconButton: {
    padding: 8,
  },
  notificationWrapper: {
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff5a5f',
  },
  headerCenter: {
    flex: 1,
  },
  hijoSelectorContainer: {
    zIndex: 100,
    position: 'relative',
    elevation: 12,
  },
  hijoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#127067',
  },
  hijoSelectorText: {
    fontSize: 16,
    color: '#127067',
    fontWeight: '600',
  },
  listaHijos: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#127067',
    elevation: 16,
    zIndex: 200,
    ...surfaceShadow,
  },
  hijoOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  hijoOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectorWrapper: {
    position: 'relative',
    marginHorizontal: 20,
    marginTop: 20,
    zIndex: 200,
  },
  menu: {
    position: 'absolute',
    top: 90,
    left: 16,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 8,
    elevation: 5,
    width: 180,
    zIndex: 300,
    ...surfaceShadow,
  },
  menuButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 6,
    backgroundColor: '#127067',
    borderRadius: 20,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  alertas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 16,
    zIndex: 400,
    overflow: 'hidden',
    ...surfaceShadow,
  },
  alertasTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#127067',
  },
  noAlertasText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  alertaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  alertasScroll: {
    maxHeight: 240,
  },
  alertasScrollContent: {
    paddingBottom: 4,
  },
  alertaTexts: {
    flex: 1,
  },
  alertaTipo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#127067',
  },
  alertaTipoUrgente: {
    color: '#a94442',
  },
  alertaDescripcion: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  mapaContainer: {
    flex: 1,
    margin: 20,
    marginTop: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  mapaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
});
