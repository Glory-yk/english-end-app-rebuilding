import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Badge from '../ui/Badge';
import type { Quiz, QuizType } from '../../types/quiz';

interface QuizCardProps {
  quiz: Quiz;
  onAnswer: (selectedAnswer: string) => void;
}

const quizTypeLabel: Record<QuizType, string> = {
  multiple_choice: '객관식',
  fill_blank: '빈칸 채우기',
  listening: '듣기',
  speaking: '말하기',
  matching: '매칭',
};

export default function QuizCard({ quiz, onAnswer }: QuizCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (answer: string) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);

    // Delay to show feedback before moving on
    setTimeout(() => {
      onAnswer(answer);
      setSelectedAnswer(null);
      setShowResult(false);
    }, 1500);
  };

  const getOptionStyle = (option: string) => {
    if (!showResult) {
      return 'bg-dark-bg border-dark-border';
    }
    if (option === quiz.correctAnswer) {
      return 'bg-success/20 border-success';
    }
    if (option === selectedAnswer && option !== quiz.correctAnswer) {
      return 'bg-danger/20 border-danger';
    }
    return 'bg-dark-bg border-dark-border opacity-50';
  };

  const getOptionTextColor = (option: string) => {
    if (!showResult) return 'text-white';
    if (option === quiz.correctAnswer) return 'text-success';
    if (option === selectedAnswer && option !== quiz.correctAnswer) return 'text-danger';
    return 'text-gray-500';
  };

  const renderFillBlank = () => {
    // Replace ___ in question with a blank indicator
    const parts = quiz.question.split('___');
    return (
      <Text className="text-white text-lg leading-7 text-center mb-6">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <Text className="text-primary font-bold"> _____ </Text>
            )}
          </React.Fragment>
        ))}
      </Text>
    );
  };

  const renderListening = () => {
    return (
      <View className="items-center mb-6">
        <TouchableOpacity className="bg-primary/20 p-4 rounded-full mb-3">
          <Ionicons name="volume-high" size={32} color="#3b82f6" />
        </TouchableOpacity>
        <Text className="text-white text-lg text-center">{quiz.question}</Text>
      </View>
    );
  };

  return (
    <View className="bg-dark-card border border-dark-border rounded-2xl p-5">
      {/* Quiz type badge */}
      <View className="mb-4">
        <Badge
          label={quizTypeLabel[quiz.type] || quiz.type}
          color="primary"
          size="sm"
        />
      </View>

      {/* Question */}
      {quiz.type === 'fill_blank' ? (
        renderFillBlank()
      ) : quiz.type === 'listening' ? (
        renderListening()
      ) : (
        <Text className="text-white text-lg leading-7 text-center mb-6">
          {quiz.question}
        </Text>
      )}

      {/* Options */}
      {quiz.options && (
        <View className="gap-3">
          {quiz.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleSelect(option)}
              disabled={showResult}
              activeOpacity={0.7}
              className={`border rounded-xl p-4 flex-row items-center ${getOptionStyle(option)}`}
            >
              <View className="w-7 h-7 rounded-full border border-gray-600 items-center justify-center mr-3">
                <Text className="text-gray-400 text-xs font-semibold">
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text className={`flex-1 text-base ${getOptionTextColor(option)}`}>
                {option}
              </Text>
              {showResult && option === quiz.correctAnswer && (
                <Ionicons name="checkmark-circle" size={22} color="#10b981" />
              )}
              {showResult &&
                option === selectedAnswer &&
                option !== quiz.correctAnswer && (
                  <Ionicons name="close-circle" size={22} color="#ef4444" />
                )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Explanation */}
      {showResult && quiz.explanation && (
        <View className="bg-primary/10 rounded-xl p-4 mt-4">
          <Text className="text-primary text-sm font-semibold mb-1">
            해설
          </Text>
          <Text className="text-gray-300 text-sm leading-5">
            {quiz.explanation}
          </Text>
        </View>
      )}
    </View>
  );
}
