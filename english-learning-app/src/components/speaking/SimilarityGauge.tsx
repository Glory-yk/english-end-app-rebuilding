import React, { memo, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

interface SimilarityGaugeProps {
  /** 0~100 score */
  score: number;
  label?: string;
}

function getScoreColor(score: number) {
  if (score >= 80) return '#22c55e'; // green
  if (score >= 60) return '#eab308'; // yellow
  if (score >= 40) return '#f97316'; // orange
  return '#ef4444'; // red
}

function getScoreLabel(score: number) {
  if (score >= 90) return '완벽해요!';
  if (score >= 80) return '훌륭해요!';
  if (score >= 60) return '좋아요!';
  if (score >= 40) return '괜찮아요';
  return '다시 도전!';
}

function SimilarityGaugeComponent({ score, label }: SimilarityGaugeProps) {
  const animValue = useRef(new Animated.Value(0)).current;
  const color = getScoreColor(score);

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: score,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const widthInterp = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label || getScoreLabel(score)}</Text>
        <Text style={[styles.score, { color }]}>{Math.round(score)}%</Text>
      </View>
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, { width: widthInterp, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: { color: '#94a3b8', fontSize: 13 },
  score: { fontSize: 24, fontWeight: 'bold' },
  barBg: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default memo(SimilarityGaugeComponent);
