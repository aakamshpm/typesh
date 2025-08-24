import { Keystroke } from "../../models/TypingModel";

export function calculateConsistencyScore(keystrokes: Keystroke[]): number {
  if (keystrokes.length < 2) return 100;

  const intervals: number[] = [];
  for (let i = 1; i < keystrokes.length; i++) {
    const interval = keystrokes[i].timestamp - keystrokes[i - 1].timestamp;
    intervals.push(interval);
  }

  if (intervals.length === 0) return 100;

  const avgInterval =
    intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

  const variance =
    intervals.reduce((sum, interval) => {
      const diff = interval - avgInterval;
      return sum + diff * diff;
    }, 0) / intervals.length;

  const stdDev = Math.sqrt(variance);
  const cv = avgInterval > 0 ? stdDev / avgInterval : 0;

  const consistencyScore = Math.max(0, 100 - cv * 100);
  return Math.round(consistencyScore);
}

export function calculatePureRhythmConsistency(
  keystrokes: Keystroke[]
): number {
  if (keystrokes.length < 3) return 100;

  let rhythmScore = 0;
  const intervals: number[] = [];

  for (let i = 1; i < keystrokes.length; i++) {
    intervals.push(keystrokes[i].timestamp - keystrokes[i - 1].timestamp);
  }

  if (intervals.length < 2) return 100;

  const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
  let consistentPairs = 0;

  for (let i = 1; i < intervals.length; i++) {
    const diff = Math.abs(intervals[i] - intervals[i - 1]);
    const tolerance = avgInterval * 0.3;

    if (diff <= tolerance) {
      consistentPairs++;
    }
  }

  rhythmScore = (consistentPairs / (intervals.length - 1)) * 100;
  return Math.round(rhythmScore);
}

export function calculateHesitationPenalty(keystrokes: Keystroke[]): number {
  if (keystrokes.length < 2) return 0;

  const intervals: number[] = [];
  for (let i = 1; i < keystrokes.length; i++) {
    intervals.push(keystrokes[i].timestamp - keystrokes[i - 1].timestamp);
  }

  const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
  const hesitationThreshold = avgInterval * 2.5;

  let hesitations = 0;
  intervals.forEach((interval) => {
    if (interval > hesitationThreshold) {
      hesitations++;
    }
  });

  return Math.round((hesitations / intervals.length) * 100);
}

export function calculatePausePenalty(keystrokes: Keystroke[]): number {
  if (keystrokes.length < 2) return 0;

  let totalPauseTime = 0;
  const pauseThreshold = 1000;

  for (let i = 1; i < keystrokes.length; i++) {
    const interval = keystrokes[i].timestamp - keystrokes[i - 1].timestamp;
    if (interval > pauseThreshold) {
      totalPauseTime += interval - pauseThreshold;
    }
  }

  const totalTypingTime =
    keystrokes[keystrokes.length - 1].timestamp - keystrokes[0].timestamp;
  const pausePercentage =
    totalTypingTime > 0 ? (totalPauseTime / totalTypingTime) * 100 : 0;

  return Math.round(pausePercentage);
}
