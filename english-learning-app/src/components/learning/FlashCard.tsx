import React, { useCallback } from 'react';
import { View, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  runOnJS,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SWIPE_UP_THRESHOLD = 100;

interface FlashCardProps {
  word: string;
  pronunciation?: string;
  meaning: string;
  exampleEn?: string;
  exampleKo?: string;
  onSwipeLeft?: () => void;  // again
  onSwipeRight?: () => void; // easy
  onSwipeUp?: () => void;    // hard
}

export default function FlashCard({
  word,
  pronunciation,
  meaning,
  exampleEn,
  exampleKo,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
}: FlashCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotateZ = useSharedValue(0);
  const isFlipped = useSharedValue(false);
  const flipProgress = useSharedValue(0);

  const flip = useCallback(() => {
    isFlipped.value = !isFlipped.value;
    flipProgress.value = withTiming(isFlipped.value ? 1 : 0, { duration: 400 });
  }, []);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden' as const,
      position: 'absolute' as const,
      width: '100%',
      height: '100%',
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden' as const,
      position: 'absolute' as const,
      width: '100%',
      height: '100%',
    };
  });

  const cardContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotateZ.value}deg` },
      ],
    };
  });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotateZ.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
        [-15, 0, 15],
        Extrapolation.CLAMP,
      );
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD && onSwipeRight) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5);
        runOnJS(onSwipeRight)();
      } else if (event.translationX < -SWIPE_THRESHOLD && onSwipeLeft) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5);
        runOnJS(onSwipeLeft)();
      } else if (event.translationY < -SWIPE_UP_THRESHOLD && onSwipeUp) {
        translateY.value = withTiming(-600);
        runOnJS(onSwipeUp)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotateZ.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(flip)();
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[{ width: SCREEN_WIDTH - 48, height: 320 }, cardContainerStyle]}
      >
        {/* Front face */}
        <Animated.View style={frontAnimatedStyle}>
          <View className="flex-1 bg-dark-card border border-dark-border rounded-3xl p-8 items-center justify-center">
            <Text className="text-4xl font-bold text-white mb-3">{word}</Text>
            {pronunciation && (
              <Text className="text-lg text-gray-400">[{pronunciation}]</Text>
            )}
            <Text className="text-gray-500 text-sm mt-8">탭하여 뒤집기</Text>
          </View>
        </Animated.View>

        {/* Back face */}
        <Animated.View style={backAnimatedStyle}>
          <View className="flex-1 bg-dark-card border border-primary/30 rounded-3xl p-8 items-center justify-center">
            <Text className="text-2xl font-bold text-primary mb-4">
              {meaning}
            </Text>
            {exampleEn && (
              <View className="mt-4 w-full">
                <Text className="text-white text-sm text-center leading-5">
                  {exampleEn}
                </Text>
                {exampleKo && (
                  <Text className="text-gray-400 text-sm text-center mt-1 leading-5">
                    {exampleKo}
                  </Text>
                )}
              </View>
            )}
            <Text className="text-gray-500 text-sm mt-6">탭하여 뒤집기</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
