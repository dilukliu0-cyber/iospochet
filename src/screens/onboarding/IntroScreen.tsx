import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppStackParamList, OnboardingStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { themedStyles } from '../../theme/themedStyles';
import { haptics } from '../../utils/haptics';
import {
  ChartIllustration,
  FamilyIllustration,
  LimitsIllustration,
  ScanIllustration,
} from './IntroIllustrations';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Intro'>;

type Slide = {
  title: string;
  description: string;
  Illustration: (props: { active: boolean }) => React.ReactElement;
};

const SLIDES: Slide[] = [
  {
    title: 'Сфотографируй чек — остальное сделает ИИ',
    description:
      'Наведи камеру на чек: магазин, товары, цены и категории распознаются автоматически за секунды.',
    Illustration: ScanIllustration,
  },
  {
    title: 'Видно, куда уходят деньги',
    description:
      'Диаграмма по категориям, календарь трат по дням и динамика месяца — без ручного ввода таблиц.',
    Illustration: ChartIllustration,
  },
  {
    title: 'Лимиты и советы от ИИ',
    description:
      'Задай бюджет по категориям — приложение предупредит у порога и подскажет, на чём сэкономить.',
    Illustration: LimitsIllustration,
  },
  {
    title: 'Общий бюджет с семьёй',
    description:
      'Пригласи близких по ID: общие чеки, статистика кто сколько тратит и один список покупок на всех.',
    Illustration: FamilyIllustration,
  },
];

// Сама карусель без привязки к навигатору: в онбординге onFinish ведёт
// к выбору языка, при просмотре из настроек — просто закрывает экран.
function IntroSlides({ onFinish, finishLabel }: { onFinish: () => void; finishLabel: string }) {
  const insets = useSafeAreaInsets();
  // Живая ширина окна, а не Dimensions при загрузке модуля: на web окно
  // меняет размер, и со статичной шириной пейджинг «уезжает» не на тот слайд.
  const { width: screenW } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<Animated.FlatList<Slide>>(null);
  const [page, setPage] = useState(0);

  const isLast = page === SLIDES.length - 1;

  function goNext() {
    haptics.light();
    if (isLast) {
      onFinish();
      return;
    }
    listRef.current?.scrollToOffset({ offset: (page + 1) * screenW, animated: true });
  }

  function skip() {
    haptics.selection();
    onFinish();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>ИИ-финансы</Text>
        {!isLast && (
          <Pressable onPress={skip} hitSlop={10}>
            <Text style={styles.skip}>Пропустить</Text>
          </Pressable>
        )}
      </View>

      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: true,
            listener: (e: { nativeEvent: { contentOffset: { x: number } } }) => {
              const p = Math.round(e.nativeEvent.contentOffset.x / screenW);
              if (p !== page) setPage(p);
            },
          },
        )}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          const inputRange = [(index - 1) * screenW, index * screenW, (index + 1) * screenW];
          // Параллакс: текст уезжает быстрее иконки, слайд слегка тает по краям.
          const textTranslate = scrollX.interpolate({
            inputRange,
            outputRange: [screenW * 0.25, 0, -screenW * 0.25],
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.25, 1, 0.25],
          });
          const Illustration = item.Illustration;
          return (
            <Animated.View style={[styles.slide, { width: screenW, opacity }]}>
              <Illustration active={page === index} />
              <Animated.View style={{ transform: [{ translateX: textTranslate }] }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </Animated.View>
            </Animated.View>
          );
        }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * screenW, i * screenW, (i + 1) * screenW];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>

        <Pressable style={styles.nextButton} onPress={goNext}>
          <Text style={styles.nextLabel}>{isLast ? finishLabel : 'Далее'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Первый шаг онбординга: после гайда — выбор языка.
export function IntroScreen({ navigation }: Props) {
  return <IntroSlides onFinish={() => navigation.navigate('Language')} finishLabel="Начать" />;
}

// Просмотр гайда из Настроек: кнопки просто возвращают назад.
export function IntroPreviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  return <IntroSlides onFinish={() => navigation.goBack()} finishLabel="Закрыть" />;
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
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  skip: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  slide: {
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 33,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 24,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  nextButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextLabel: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
}));
