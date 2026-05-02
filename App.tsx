import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { auth, db } from './src/services/firebase';

export default function App() {
  const authReady = auth !== undefined;
  const dbReady = db !== undefined;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>家族スケジュール管理アプリ</Text>
      <Text style={styles.status}>Firebase Auth: {authReady ? 'OK' : 'NG'}</Text>
      <Text style={styles.status}>Firestore: {dbReady ? 'OK' : 'NG'}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginVertical: 4,
  },
});
