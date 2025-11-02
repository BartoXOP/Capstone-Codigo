import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSyncRutActivo } from '@/hooks/use-sync-rut-activo';

export default function ChatFurgon() {
  useSyncRutActivo();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Chat de furgón en construcción.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7F8',
    padding: 16,
  },
  text: {
    fontSize: 16,
    color: '#127067',
  },
});
