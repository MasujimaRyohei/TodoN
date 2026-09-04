import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useAuthContext } from '../auth-context';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'JoinInvite'>;

export default function JoinInviteScreen({ navigation }: Props) {
  const { client } = useAuthContext();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  async function onAccept() {
    const t = token.trim();
    if (t.length < 8) {
      Alert.alert('招待トークンを貼り付けてください');
      return;
    }

    setLoading(true);
    try {
      const team = await client.acceptInvite({ token: t });
      navigation.replace('TeamDetail', { teamId: team.id });
    } catch (error) {
      Alert.alert('参加できませんでした', error instanceof Error ? error.message : '');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>
        招待メールのリンクに含まれるトークン、または管理者から共有された文字列を貼り付けます。
      </Text>
      <Text style={styles.label}>トークン</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="ここに貼り付け"
        placeholderTextColor="#78716c"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        multiline
      />

      <TouchableOpacity
        style={[styles.button, loading ? styles.disabled : undefined]}
        disabled={loading}
        onPress={() => void onAccept()}
      >
        <Text style={styles.buttonLabel}>{loading ? '処理中…' : 'チームに参加'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelLabel}>戻る</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff8f0', padding: 20 },
  intro: { color: '#78716c', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  label: { color: '#7c3aed', fontWeight: '600', fontSize: 12 },
  input: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3730a399',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 14, android: 10 }),
    fontSize: 14,
    color: '#3f2f2a',
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  button: {
    marginTop: 20,
    backgroundColor: '#c084fc',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonLabel: { color: '#ffffff', fontWeight: '700' },
  disabled: { opacity: 0.65 },
  cancel: {
    marginTop: 14,
    alignItems: 'center',
  },
  cancelLabel: { color: '#78716c', fontWeight: '600' },
});
