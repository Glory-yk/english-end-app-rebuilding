import { useState, useCallback, useMemo } from 'react';
import { useVocabStore } from '../stores/useVocabStore';
import { QualityButton } from '../utils/srs';

export function useSRS(profileId: string) {
  const {
    reviewQueue,
    currentReviewIndex,
    loading,
    stats,
    fetchReviewQueue,
    submitReview,
    nextCard,
    fetchStats,
  } = useVocabStore();

  const currentCard = useMemo(
    () => reviewQueue[currentReviewIndex] || null,
    [reviewQueue, currentReviewIndex],
  );

  const remaining = useMemo(
    () => Math.max(0, reviewQueue.length - currentReviewIndex),
    [reviewQueue.length, currentReviewIndex],
  );

  const total = reviewQueue.length;
  const completed = currentReviewIndex;
  const isFinished = currentReviewIndex >= reviewQueue.length && reviewQueue.length > 0;

  const handleReview = useCallback(
    async (quality: QualityButton) => {
      if (!currentCard) return;
      await submitReview(currentCard.id, quality);
      nextCard();
    },
    [currentCard, submitReview, nextCard],
  );

  const startReview = useCallback(async () => {
    await fetchReviewQueue(profileId);
  }, [profileId, fetchReviewQueue]);

  const reset = useCallback(async () => {
    await fetchReviewQueue(profileId);
  }, [profileId, fetchReviewQueue]);

  return {
    currentCard,
    remaining,
    total,
    completed,
    isFinished,
    isLoading: loading,
    stats,
    handleReview,
    startReview,
    reset,
    refreshStats: () => fetchStats(profileId),
  };
}
