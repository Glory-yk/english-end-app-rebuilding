import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';

interface WaveformViewProps {
  /** Array of amplitude values 0~1 */
  data: number[];
  color: string;
  height?: number;
  barWidth?: number;
  barGap?: number;
}

function WaveformViewComponent({ data, color, height = 60, barWidth = 3, barGap = 1 }: WaveformViewProps) {
  const maxBars = Math.floor(280 / (barWidth + barGap));
  const displayData = data.length > maxBars ? data.slice(-maxBars) : data;

  return (
    <View style={[styles.container, { height }]}>
      {displayData.map((amp, i) => {
        const barHeight = Math.max(2, amp * height * 0.9);
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: barHeight,
              backgroundColor: color,
              borderRadius: barWidth / 2,
              marginHorizontal: barGap / 2,
              opacity: 0.4 + amp * 0.6,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default memo(WaveformViewComponent);
