import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuthContext } from '../auth-context';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { client, applyAuth, baseUrl } = useAuthContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!baseUrl) {
      Alert.alert(
        '構成エラー',
        'app.json の expo.extra.apiUrl か EXPO_PUBLIC_API_URL を設定してください。',
      );

      return;
    }

    setLoading(true);

    try {
      const auth = await client.register({
        email,
        password,
        name: name || undefined,
      });

      if (auth.needsEmailConfirmation || !auth.token) {
        Alert.alert('確認メールを送信しました', 'メールのリンクを開いてからログインしてください。');
        navigation.navigate('Login');
        return;
      }

      await applyAuth(auth);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '登録に失敗しました。条件を確認するか時間をおいて再度お試しください。';

      Alert.alert('登録できませんでした', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.brand}>
          <Text style={styles.title}>アカウント作成</Text>
          <Text style={styles.sub}>Web と同じ API にユーザー登録します</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>表示名（任意）</Text>
          <TextInput
            style={styles.input}
            placeholder="山田太郎"
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.label, styles.labelSpacing]}>メール</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[styles.label, styles.labelSpacing]}>パスワード（8文字以上）</Text>
          <TextInput
            secureTextEntry
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.button, loading ? styles.disabled : undefined]}
            disabled={loading || !email || password.length < 8}
            onPress={() => void onSubmit()}
          >
            <Text style={styles.buttonLabel}>{loading ? '送信中…' : '作成して進む'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>ログインへ戻る</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8f0',
  },
  inner: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  brand: {
    marginBottom: 28,
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#3f2f2a',
    fontSize: 26,
    fontWeight: '600',
  },
  sub: {
    color: '#78716c',
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  label: {
    color: '#78716c',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  labelSpacing: {
    marginTop: 16,
  },
  input: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 14, android: 10 }),
    color: '#3f2f2a',
    fontSize: 16,
    backgroundColor: '#fff8f0',
  },
  button: {
    marginTop: 24,
    borderRadius: 10,
    backgroundColor: '#f97316',
    paddingVertical: 14,
  },
  buttonLabel: {
    textAlign: 'center',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.55,
  },
  linkRow: {
    marginTop: 18,
    alignItems: 'center',
  },
  linkText: {
    color: '#fb923c',
    fontSize: 14,
    fontWeight: '600',
  },
});
