// src/workers/simulation.worker.ts
/* eslint-disable no-restricted-globals */
import type {
  Song,
  ShowallApiSongEntry,
  SimulationInput,
  SimulationOutput,
  SimulationPhase,
  ConstOverride,
} from '@/types/result-page';
// Note: Direct import of rating-utils might be tricky in a worker depending on build setup.
// For simplicity, relevant functions from rating-utils are duplicated or adapted here.
// If rating-utils becomes complex, consider a more robust bundling strategy for workers.

const BEST_COUNT = 30;
const NEW_20_COUNT = 20;
const MAX_SCORE_NORMAL = 1009000; // SSS+
const MAX_ITERATIONS_PER_LIST = 200;
const MAX_ITERATIONS_HYBRID = 400;

// --- Duplicated/Adapted functions from rating-utils.ts ---
const difficultyOrder: { [key: string]: number } = {
  ULT: 5, MAS: 4, EXP: 3, ADV: 2, BAS: 1,
};

const calculateChunithmSongRating = (score: number, chartConstant: number | undefined | null): number => {
  if (typeof chartConstant !== 'number' || chartConstant <= 0) return 0;
  let ratingValue = 0;
  if (score >= 1009000) ratingValue = chartConstant + 2.15;
  else if (score >= 1007500) {
    ratingValue = chartConstant + 2.00 + Math.floor(Math.max(0, score - 1007500) / 100) * 0.01;
    ratingValue = Math.min(chartConstant + 2.15, ratingValue);
  } else if (score >= 1005000) {
    ratingValue = chartConstant + 1.50 + Math.floor(Math.max(0, score - 1005000) / 50) * 0.01;
    ratingValue = Math.min(chartConstant + 2.00, ratingValue);
  } else if (score >= 1000000) {
    ratingValue = chartConstant + 1.00 + Math.floor(Math.max(0, score - 1000000) / 100) * 0.01;
    ratingValue = Math.min(chartConstant + 1.50, ratingValue);
  } else if (score >= 975000) {
    ratingValue = chartConstant + 0.00 + Math.floor(Math.max(0, score - 975000) / 250) * 0.01;
    ratingValue = Math.min(chartConstant + 1.00, ratingValue);
  } else if (score >= 950000) ratingValue = chartConstant - 1.50;
  else if (score >= 925000) ratingValue = chartConstant - 3.00;
  else if (score >= 900000) ratingValue = chartConstant - 5.00;
  else if (score >= 800000) ratingValue = (chartConstant - 5.00) / 2.0;
  else ratingValue = 0;
  if (score >= 1007500 && ratingValue > chartConstant + 2.15) ratingValue = chartConstant + 2.15;
  return Math.max(0, parseFloat(ratingValue.toFixed(4)));
};

// This function is defined but not used in the provided snippet.
// It's assumed to be used by the main logic that calls this worker.
const mapApiSongToAppSong = (apiSong: ShowallApiSongEntry, _index: number, chartConstantOverride?: number): Song => {
  const score = typeof apiSong.score === 'number' ? apiSong.score : 0;
  let effectiveChartConstant: number | null = null;
  if (typeof chartConstantOverride === 'number' && chartConstantOverride > 0) effectiveChartConstant = chartConstantOverride;
  else {
    if (typeof apiSong.const === 'number' && apiSong.const > 0) effectiveChartConstant = apiSong.const;
    else if (apiSong.const === 0) {
      if ((typeof apiSong.level === 'string' || typeof apiSong.level === 'number') && String(apiSong.level).trim() !== "") {
        const parsedLevel = parseFloat(String(apiSong.level));
        if (!isNaN(parsedLevel) && parsedLevel > 0) {
          const isInteger = parsedLevel % 1 === 0;
          const isXpoint5 = Math.abs((parsedLevel * 10) % 10) === 5;
          if (isInteger || isXpoint5) effectiveChartConstant = parsedLevel;
        }
      }
    } else if (effectiveChartConstant === null && apiSong.is_const_unknown &&
             (typeof apiSong.level === 'string' || typeof apiSong.level === 'number') && String(apiSong.level).trim() !== "") {
      const parsedLevel = parseFloat(String(apiSong.level));
      if (!isNaN(parsedLevel) && parsedLevel > 0) effectiveChartConstant = parsedLevel;
    }
  }
  let calculatedCurrentRating: number;
  if (typeof effectiveChartConstant === 'number' && effectiveChartConstant > 0 && score > 0) calculatedCurrentRating = calculateChunithmSongRating(score, effectiveChartConstant);
  else calculatedCurrentRating = typeof apiSong.rating === 'number' ? apiSong.rating : 0;
  const currentRating = parseFloat(calculatedCurrentRating.toFixed(4));
  const baseSong: Song = {
    uniqueId: `${apiSong.id}_${apiSong.diff}`,
    id: apiSong.id, diff: apiSong.diff, title: apiSong.title, chartConstant: effectiveChartConstant,
    currentScore: score, currentRating: currentRating, targetScore: score, targetRating: currentRating,
    genre: apiSong.genre, level: 'level' in apiSong ? apiSong.level : undefined,
  };
  if ('release' in apiSong) baseSong.release = apiSong.release;
  if ('is_played' in apiSong) baseSong.is_played = apiSong.is_played;
  if ('is_clear' in apiSong) baseSong.is_clear = apiSong.is_clear;
  if ('is_fullcombo' in apiSong) baseSong.is_fullcombo = apiSong.is_fullcombo;
  if ('is_alljustice' in apiSong) baseSong.is_alljustice = apiSong.is_alljustice;
  if ('is_const_unknown' in apiSong) baseSong.is_const_unknown = apiSong.is_const_unknown;
  return baseSong;
};

const findMinScoreForTargetRating = (currentSong: Song, absoluteTargetRating: number, isLimitReleasedLocal: boolean): { score: number; rating: number; possible: boolean } => {
  if (typeof currentSong.chartConstant !== 'number' || currentSong.chartConstant <= 0) return { score: currentSong.currentScore, rating: currentSong.currentRating, possible: false };
  const maxScore = isLimitReleasedLocal ? 1010000 : MAX_SCORE_NORMAL;
  if (currentSong.currentRating >= absoluteTargetRating && currentSong.currentScore > 0) return { score: currentSong.currentScore, rating: currentSong.currentRating, possible: true };
  const startingScore = currentSong.currentScore > 0 ? currentSong.currentScore + 1 : 1;
  for (let scoreAttempt = startingScore; scoreAttempt <= maxScore; scoreAttempt += 1) {
    const calculatedRating = calculateChunithmSongRating(scoreAttempt, currentSong.chartConstant);
    if (calculatedRating >= absoluteTargetRating) return { score: scoreAttempt, rating: parseFloat(calculatedRating.toFixed(4)), possible: true };
  }
  const ratingAtMaxScore = calculateChunithmSongRating(maxScore, currentSong.chartConstant);
  return { score: maxScore, rating: parseFloat(ratingAtMaxScore.toFixed(4)), possible: ratingAtMaxScore >= absoluteTargetRating };
};

const getNextGradeBoundaryScore = (currentScore: number): number | null => {
    if (currentScore >= 1009000) return null;
    if (currentScore < 975000) return 975000;
    if (currentScore < 1000000) return 1000000;
    if (currentScore < 1005000) return 1005000;
    if (currentScore < 1007500) return 1007500;
    if (currentScore < 1009000) return 1009000;
    return null;
};
// --- End of Duplicated/Adapted functions ---

const isSongHighConstantForFloor = (song: Song, currentOverallAverageRatingForList: number | null): boolean => {
  if (!song.chartConstant || currentOverallAverageRatingForList === null) return false;
  const thresholdBase = currentOverallAverageRatingForList - 1.8;
  const threshold = Math.floor(thresholdBase * 10) / 10;
  return song.chartConstant > threshold;
};

function deduplicateSongList(songs: Song[]): Song[] {
  const songMap = new Map<string, Song>();
  for (const song of songs) {
    const key = `${song.id}_${song.diff}`;
    const existingSong = songMap.get(key);
    if (
      !existingSong ||
      song.targetRating > existingSong.targetRating ||
      (song.targetRating === existingSong.targetRating && song.targetScore > existingSong.targetScore)
    ) {
      songMap.set(key, song);
    }
  }
  return Array.from(songMap.values());
}

function sortAndSlice(songs: Song[], limit: number): Song[] {
    const songsToSort = songs.map(s => ({ ...s }));
    songsToSort.sort((a, b) => {
        if (b.targetRating !== a.targetRating) return b.targetRating - a.targetRating;
        if (b.targetScore !== a.targetScore) return b.targetScore - a.targetScore;
        const diffAOrderVal = difficultyOrder[String(a.diff || '').toUpperCase() as keyof typeof difficultyOrder] || 0;
        const diffBOrderVal = difficultyOrder[String(b.diff || '').toUpperCase() as keyof typeof difficultyOrder] || 0;
        if (diffBOrderVal !== diffAOrderVal) return diffBOrderVal - diffAOrderVal;
        return (a.title || '').localeCompare(b.title || '');
    });
    return songsToSort.slice(0, limit);
}

function calculateAverageRating(songs: Song[], count: number, isSimulatingThisList: boolean): number | null {
  if (!songs || songs.length === 0) return null;
  const songsForAverage = songs.map(s => ({
      ...s,
      ratingToConsider: isSimulatingThisList ? s.targetRating : s.currentRating
  }));
  const topSongs = [...songsForAverage].sort((a, b) => b.ratingToConsider - a.ratingToConsider).slice(0, count);
  if (topSongs.length === 0) return 0;
  const sum = topSongs.reduce((acc, s) => acc + s.ratingToConsider, 0);
  return parseFloat((sum / topSongs.length).toFixed(4));
}

function calculateOverallRating(avgB30: number | null, avgN20: number | null, actualB30Count: number, actualN20Count: number): number {
  const effectiveB30Count = Math.min(actualB30Count, BEST_COUNT);
  const b30Sum = (avgB30 ?? 0) * effectiveB30Count;
  const effectiveN20Count = Math.min(actualN20Count, NEW_20_COUNT);
  const n20Sum = (avgN20 ?? 0) * effectiveN20Count;
  const totalEffectiveSongs = effectiveB30Count + effectiveN20Count;
  if (totalEffectiveSongs === 0) return 0;
  return parseFloat(((b30Sum + n20Sum) / totalEffectiveSongs).toFixed(4));
}

function _performCustomListSimulation(
  currentSongsInput: Song[],
  input: SimulationInput,
  log: string[]
): { updatedSongs: Song[]; songsChangedCount: number; stuck: boolean } {
  let updatedSongs = JSON.parse(JSON.stringify(currentSongsInput)) as Song[];
  let songsChangedCount = 0;
  let phaseIsStuck = true;

  const scoreCap = input.isScoreLimitReleased ? 1010000 : MAX_SCORE_NORMAL;
  
  let updatableSongs = updatedSongs.filter(song => !input.excludedSongKeys.includes(song.uniqueId) && song.targetScore < scoreCap && song.chartConstant !== null && song.chartConstant > 0);
  
  if (input.algorithmPreference === 'floor') {
    updatableSongs.sort((a, b) => a.targetRating - b.targetRating || a.targetScore - b.targetScore);
  } else { // peak
    updatableSongs.sort((a, b) => b.targetRating - a.targetRating || b.targetScore - b.targetScore);
  }
  
  if (updatableSongs.length > 0) {
    const songToImprove = updatableSongs[0];
    const songIndex = updatedSongs.findIndex(s => s.uniqueId === songToImprove.uniqueId);
    if (songIndex !== -1) {
      const nextGradeScore = getNextGradeBoundaryScore(songToImprove.targetScore);
      let improvementMade = false;
      
      if (nextGradeScore && nextGradeScore <= scoreCap && songToImprove.chartConstant) {
        const potentialRating = calculateChunithmSongRating(nextGradeScore, songToImprove.chartConstant);
        if (potentialRating > songToImprove.targetRating) {
          updatedSongs[songIndex].targetScore = nextGradeScore;
          updatedSongs[songIndex].targetRating = parseFloat(potentialRating.toFixed(4));
          improvementMade = true;
        }
      }
      
      if (!improvementMade) {
        const microTuneTarget = songToImprove.targetRating + 0.0001;
        const { score, rating, possible } = findMinScoreForTargetRating(songToImprove, microTuneTarget, input.isScoreLimitReleased);
        if (possible && score > songToImprove.targetScore && score <= scoreCap) {
          updatedSongs[songIndex].targetScore = score;
          updatedSongs[songIndex].targetRating = rating;
          improvementMade = true;
        }
      }
      
      if (improvementMade) {
        songsChangedCount++;
        phaseIsStuck = false;
      }
    }
  }

  return { updatedSongs, songsChangedCount, stuck: phaseIsStuck };
}

function _performListSimulationPhase(
  currentSongsInput: Song[],
  input: SimulationInput,
  log: string[],
  listType: 'b30' | 'n20',
  currentAverageForList: number | null,
  otherListSongs: Song[] = [],
  isHybridReplaceContext: boolean = false
): { updatedSongs: Song[]; songsChangedCount: number; stuck: boolean } {
  let updatedSongs = JSON.parse(JSON.stringify(currentSongsInput)) as Song[];
  let songsChangedCount = 0;
  let phaseIsStuck = true;

  const listLimit = listType === 'b30' ? BEST_COUNT : NEW_20_COUNT;
  const scoreCap = input.isScoreLimitReleased ? 1010000 : MAX_SCORE_NORMAL;

  let updatableSongsForLeap = updatedSongs.filter(song => !input.excludedSongKeys.includes(song.uniqueId) && song.targetScore < scoreCap && song.chartConstant !== null && song.chartConstant > 0);
  if (input.algorithmPreference === 'floor') {
    updatableSongsForLeap.sort((a, b) => {
      const aIsHighConst = isSongHighConstantForFloor(a, currentAverageForList);
      const bIsHighConst = isSongHighConstantForFloor(b, currentAverageForList);
      if (aIsHighConst !== bIsHighConst) return aIsHighConst ? 1 : -1;
      const constA = a.chartConstant ?? Infinity; const constB = b.chartConstant ?? Infinity;
      if (constA !== constB) return constA - constB;
      if (a.targetRating !== b.targetRating) return a.targetRating - b.targetRating;
      return a.targetScore - b.targetScore;
    });
  } else {
    updatableSongsForLeap.sort((a, b) => {
      if (b.targetRating !== a.targetRating) return b.targetRating - a.targetRating;
      return b.targetScore - b.targetScore;
    });
  }

  if (updatableSongsForLeap.length > 0) {
    const songToAttemptLeap = updatableSongsForLeap[0];
    const nextGradeScore = getNextGradeBoundaryScore(songToAttemptLeap.targetScore);
    if (nextGradeScore && songToAttemptLeap.chartConstant && songToAttemptLeap.targetScore < nextGradeScore && nextGradeScore <= scoreCap) {
      const potentialRatingAtNextGrade = calculateChunithmSongRating(nextGradeScore, songToAttemptLeap.chartConstant);
      if (potentialRatingAtNextGrade > songToAttemptLeap.targetRating + 0.00005) {
        const songIndex = updatedSongs.findIndex(s => s.id === songToAttemptLeap.id && s.diff === songToAttemptLeap.diff);
        if (songIndex !== -1) {
          updatedSongs[songIndex] = { ...songToAttemptLeap, targetScore: nextGradeScore, targetRating: parseFloat(potentialRatingAtNextGrade.toFixed(4)) };
          songsChangedCount++; phaseIsStuck = false;
          return { updatedSongs: sortAndSlice(deduplicateSongList(updatedSongs), listLimit), songsChangedCount, stuck: phaseIsStuck };
        }
      }
    }
  }

  let updatableSongsForFineTune = updatedSongs.filter(song => !input.excludedSongKeys.includes(song.uniqueId) && song.targetScore < scoreCap && song.chartConstant !== null && song.chartConstant > 0);
    if (input.algorithmPreference === 'floor') {
        updatableSongsForFineTune.sort((a, b) => {
            const aIsHighConst = isSongHighConstantForFloor(a, currentAverageForList);
            const bIsHighConst = isSongHighConstantForFloor(b, currentAverageForList);
            if (aIsHighConst !== bIsHighConst) return aIsHighConst ? 1 : -1;
            const constA = a.chartConstant ?? Infinity; const constB = b.chartConstant ?? Infinity;
            if (constA !== constB) return constA - constB;
            if (a.targetRating !== b.targetRating) return a.targetRating - b.targetRating;
            return a.targetScore - a.targetScore;
        });
    } else {
        updatableSongsForFineTune.sort((a, b) => {
            if (b.targetRating !== a.targetRating) return b.targetRating - a.targetRating;
            return b.targetScore - b.targetScore;
        });
    }

  if (updatableSongsForFineTune.length > 0) {
    for (const candidateSong of updatableSongsForFineTune) {
        const songIndex = updatedSongs.findIndex(s => s.id === candidateSong.id && s.diff === candidateSong.diff);
        if (songIndex === -1) continue;
        let currentSongInSim = updatedSongs[songIndex];
        if (currentSongInSim.targetScore < scoreCap && currentSongInSim.chartConstant) {
            const targetMicroTuneRating = currentSongInSim.targetRating + 0.0001;
            const minScoreInfo = findMinScoreForTargetRating(currentSongInSim, targetMicroTuneRating, input.isScoreLimitReleased);
            if (minScoreInfo.possible && minScoreInfo.score > currentSongInSim.targetScore && minScoreInfo.score <= scoreCap) {
                updatedSongs[songIndex] = { ...currentSongInSim, targetScore: minScoreInfo.score, targetRating: minScoreInfo.rating };
                songsChangedCount++;
                phaseIsStuck = false;
                break;
            }
        }
    }
  }
  
  if (isHybridReplaceContext || listType === 'n20') {
    const poolWithExisting = deduplicateSongList([...updatedSongs, ...input.allPlayedNewSongsPool]);
    let bestCandidatesForReplacement = poolWithExisting.filter(p_song => {
        const key = `${p_song.id}_${p_song.diff}`;
        return !input.excludedSongKeys.includes(key) && !updatedSongs.some(us => us.id === p_song.id && us.diff === p_song.diff);
    });
    bestCandidatesForReplacement.sort((a, b) => b.currentRating - a.currentRating);
    if (bestCandidatesForReplacement.length > 0 && updatedSongs.length >= listLimit) {
        const worstSongInList = updatedSongs.reduce((min, song) => song.targetRating < min.targetRating ? song : min, updatedSongs[0]);
        const bestCandidate = bestCandidatesForReplacement[0];
        if (bestCandidate.currentRating > worstSongInList.targetRating) {
            const indexToRemove = updatedSongs.findIndex(s => s.id === worstSongInList.id && s.diff === worstSongInList.diff);
            if (indexToRemove !== -1) {
                updatedSongs.splice(indexToRemove, 1, bestCandidate);
                songsChangedCount++;
                phaseIsStuck = false;
            }
        }
    }
  }

  return { updatedSongs: sortAndSlice(deduplicateSongList(updatedSongs), listLimit), songsChangedCount, stuck: phaseIsStuck };
}


function runFullSimulation(input: SimulationInput): SimulationOutput {
  const log: string[] = [];

  const initializeSongList = (songs: Song[], listName: string): Song[] => {
      log.push(`Initializing ${listName} list with ${songs.length} songs.`);
      const initialized = JSON.parse(JSON.stringify(songs));
      return initialized.map((s: Song) => ({...s, targetScore: s.currentScore, targetRating: s.currentRating }));
  };
  
  const constOverrides: ConstOverride[] = input.constOverrides || [];
  const applyConstOverrides = (songs: Song[]): Song[] => {
      if (constOverrides.length === 0) return songs;
      return songs.map(song => {
          const override = constOverrides.find(o => o.title === song.title && o.diff === song.diff);
          if (override) {
              const newConst = typeof override.const === 'string' ? parseFloat(override.const) : override.const;
              const newRating = calculateChunithmSongRating(song.currentScore, newConst);
              return { ...song, chartConstant: newConst, currentRating: newRating, targetRating: newRating };
          }
          return song;
      });
  };

  if (input.simulationMode === 'custom' && input.customSongs) {
      let customSongs = applyConstOverrides(initializeSongList(input.customSongs, "Custom"));
      let customAvg = calculateAverageRating(customSongs, customSongs.length, false);
      log.push(`Custom Mode Initial State: Average Rating: ${customAvg?.toFixed(4) || 'N/A'}`);
      
      let iterations = 0;
      const maxIterations = MAX_ITERATIONS_HYBRID;
      let finalPhase: SimulationPhase = 'simulating';

      while ((customAvg === null || customAvg < input.targetRating) && iterations < maxIterations) {
          const { updatedSongs, stuck } = _performCustomListSimulation(customSongs, input, log);
          if (stuck) {
              finalPhase = 'stuck_b30_no_improvement';
              break;
          }
          customSongs = updatedSongs;
          customAvg = calculateAverageRating(customSongs, customSongs.length, true);
          iterations++;
      }

      if (customAvg !== null && customAvg >= input.targetRating) {
          finalPhase = 'target_reached';
      } else if (finalPhase === 'simulating') {
          finalPhase = 'stuck_b30_no_improvement';
      }
      
      return {
          simulatedB30Songs: customSongs,
          simulatedNew20Songs: [],
          finalAverageB30Rating: customAvg,
          finalAverageNew20Rating: null,
          finalOverallRating: customAvg ?? 0,
          finalPhase: finalPhase,
          simulationLog: log,
      };
  }

  // --- Existing B30/N20/Hybrid Logic ---
  let currentSimulatedB30Songs = applyConstOverrides(initializeSongList(input.originalB30Songs, "B30"));
  let currentSimulatedNew20Songs = applyConstOverrides(initializeSongList(input.originalNew20Songs, "N20"));
  
  let currentAverageB30Rating = calculateAverageRating(currentSimulatedB30Songs, BEST_COUNT, true);
  let currentAverageNew20Rating = calculateAverageRating(currentSimulatedNew20Songs, NEW_20_COUNT, true);
  let currentOverallRating = calculateOverallRating(currentAverageB30Rating, currentAverageNew20Rating, currentSimulatedB30Songs.length, currentSimulatedNew20Songs.length);
  
  log.push(`[WORKER_INITIAL_STATE] Overall: ${currentOverallRating.toFixed(4)}`);
  
  let finalOutcomePhase: SimulationPhase = 'simulating';
  let iterations = 0;
  const maxIterations = input.simulationMode === 'hybrid' ? MAX_ITERATIONS_HYBRID : MAX_ITERATIONS_PER_LIST;

  while (currentOverallRating < input.targetRating && iterations < maxIterations) {
    iterations++;
    let b30Changed = 0, n20Changed = 0;
    let b30Stuck = true, n20Stuck = true;

    if (input.simulationMode === 'b30_only' || input.simulationMode === 'hybrid') {
      const result = _performListSimulationPhase(currentSimulatedB30Songs, input, log, 'b30', currentAverageB30Rating, currentSimulatedNew20Songs);
      currentSimulatedB30Songs = result.updatedSongs;
      b30Changed = result.songsChangedCount;
      b30Stuck = result.stuck;
    }

    if (input.simulationMode === 'n20_only' || input.simulationMode === 'hybrid') {
        const result = _performListSimulationPhase(currentSimulatedNew20Songs, input, log, 'n20', currentAverageNew20Rating, currentSimulatedB30Songs, true);
        currentSimulatedNew20Songs = result.updatedSongs;
        n20Changed = result.songsChangedCount;
        n20Stuck = result.stuck;
    }

    currentAverageB30Rating = calculateAverageRating(currentSimulatedB30Songs, BEST_COUNT, true);
    currentAverageNew20Rating = calculateAverageRating(currentSimulatedNew20Songs, NEW_20_COUNT, true);
    currentOverallRating = calculateOverallRating(currentAverageB30Rating, currentAverageNew20Rating, currentSimulatedB30Songs.length, currentSimulatedNew20Songs.length);
    
    if (input.simulationMode === 'b30_only' && b30Stuck) { finalOutcomePhase = 'stuck_b30_no_improvement'; break; }
    if (input.simulationMode === 'n20_only' && n20Stuck) { finalOutcomePhase = 'stuck_n20_no_improvement'; break; }
    if (input.simulationMode === 'hybrid' && b30Stuck && n20Stuck) { finalOutcomePhase = 'stuck_both_no_improvement'; break; }
  }

  if (currentOverallRating >= input.targetRating) {
    finalOutcomePhase = 'target_reached';
  } else if (finalOutcomePhase === 'simulating') {
      finalOutcomePhase = 'stuck_both_no_improvement';
  }

  return {
    simulatedB30Songs: currentSimulatedB30Songs,
    simulatedNew20Songs: currentSimulatedNew20Songs,
    finalAverageB30Rating: currentAverageB30Rating,
    finalAverageNew20Rating: currentAverageNew20Rating,
    finalOverallRating: currentOverallRating,
    finalPhase: finalOutcomePhase,
    simulationLog: log,
  };
}


self.onmessage = (event: MessageEvent<SimulationInput>) => {
  try {
    const output = runFullSimulation(event.data);
    self.postMessage(output);
  } catch (error) {
    console.error("Error in simulation worker:", error);
    const errorOutput: SimulationOutput = {
      simulatedB30Songs: [],
      simulatedNew20Songs: [],
      finalAverageB30Rating: null,
      finalAverageNew20Rating: null,
      finalOverallRating: 0,
      finalPhase: 'error_simulation_logic',
      simulationLog: ['Worker execution failed.'],
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(errorOutput);
  }
};
