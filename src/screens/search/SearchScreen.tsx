import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AppStackParamList } from '../../navigation/types';
import { supabase } from '../../services/api/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';

type SearchResult = {
  id: string;
  cleaned_name: string;
  price: number;
  category_name: string;
  receipt_id: string;
  receipt: {
    store_name: string | null;
    purchase_date: string | null;
    currency: string;
  } | null;
};

type Props = NativeStackScreenProps<AppStackParamList, 'Search'>;

export function SearchScreen({ navigation }: Props) {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    const trimmed = query.trim();
    if (!userId || trimmed.length < 2) return;
    setLoading(true);
    const { data } = await supabase
      .from('receipt_items')
      .select('id, cleaned_name, price, category_name, receipt_id, receipt:receipts(store_name, purchase_date, currency)')
      .eq('user_id', userId)
      .ilike('cleaned_name', `%${trimmed}%`)
      .order('created_at', { ascending: false })
      .limit(50);
    setResults((data as unknown as SearchResult[]) ?? []);
    setLoading(false);
    setSearched(true);
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.textPrimary} size={22} />
        </Pressable>
        <Text style={styles.topTitle}>Поиск</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Например, рис или кофе..."
          placeholderTextColor={colors.textSecondary}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        <Pressable style={styles.searchButton} onPress={handleSearch}>
          <SearchIcon color={colors.background} size={18} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.resultRow}
              onPress={() => navigation.navigate('ReceiptDetail', { receiptId: item.receipt_id })}
            >
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.cleaned_name}</Text>
                <Text style={styles.resultSub}>
                  {[item.receipt?.store_name, item.receipt?.purchase_date, item.category_name]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Text style={styles.resultPrice}>
                {item.price.toFixed(2)} {item.receipt?.currency ?? ''}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            searched ? (
              <Text style={styles.emptyText}>Ничего не найдено. Попробуйте другое название.</Text>
            ) : (
              <Text style={styles.emptyText}>Ищите по названию товара из ваших чеков.</Text>
            )
          }
        />
      )}
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginTop: 32,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  resultSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  resultPrice: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 32,
  },
}));
