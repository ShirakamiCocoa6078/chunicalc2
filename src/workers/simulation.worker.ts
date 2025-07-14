// src/workers/simulation.worker.ts
/* eslint-disable no-restricted-globals */
import {
  calculateAverageAndOverallRating,
  sortSongsByRatingDesc,
  deduplicateAndPrioritizeSongs,
} from '@/lib/rating-utils';
import type { Song, SimulationInput, SimulationOutput, ShowallApiSongEntry, WorkerInput, ConstOverride } from '@/types/result-page';

// --- Constants ---
const MAX_ITERATIONS_PER_LIST = 150;
const MAX_ITERATIONS_HYBRID = 300;
const MAX_SCORE_NORMAL = 1009000;

const difficultyOrder = { 'ULTIMA': 5, 'WORLD\'S END': 5, 'MASTER': 4, 'EXPERT': 3, 'ADVANCED': 2, 'BASIC': 1 };


// --- Worker State ---
let initialData: Omit<SimulationInput, 'targetRating' | 'simulationMode' | 'algorithmPreference' | 'customSongs'> | null = null;
let latestSimulationInput: SimulationInput | null = null; // For debugging

// --- Message Handler ---
self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const message = event.data;

  if (message.type === 'INIT') {
    initialData = message.payload;
    return;
  }

  if (message.type === 'SIMULATE') {
    if (!initialData) {
      self.postMessage({ error: 'Worker not initialized. Send INIT message first.' });
      return;
    }

    const fullSimulationInput: SimulationInput = {
      ...initialData,
      targetRating: message.payload.targetRating,
      simulationMode: message.payload.simulationMode,
      algorithmPreference: message.payload.algorithmPreference,
      customSongs: message.payload.customSongs,
      excludedSongKeys: message.payload.excludedSongKeys,
    };
    latestSimulationInput = fullSimulationInput;

    const result = performSimulation(fullSimulationInput);
    self.postMessage(result);
  }
};

// --- Main Simulation Logic ---
function performSimulation(simulationInput: SimulationInput): SimulationOutput {
  const {
    targetRating,
    simulationMode,
    algorithmPreference,
    customSongs: initialCustomSongs,
    excludedSongKeys,
    isScoreLimitReleased,
    phaseTransitionPoint,
    originalB30Songs,
    originalNew20Songs,
    allPlayedNewSongsPool,
    constOverrides
  } = simulationInput;

  let simulationLog: string[] = [];
  const startTime = performance.now();

  const initializeSongList = (songs: Song[], listName: string): Song[] => {
    simulationLog.push(`Initializing ${listName} list with ${songs.length} songs.`);
    const initialized = JSON.parse(JSON.stringify(songs));
    return initialized.map((s: Song) => ({ ...s, targetScore: s.currentScore, targetRating: s.currentRating }));
  };
  
  const applyConstOverrides = (songs: Song[]): Song[] => {
    if (!constOverrides || constOverrides.length === 0) return songs;
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

  if (simulationMode === 'custom' && initialCustomSongs) {
    const customResult = _performCustomListSimulation(
      initialCustomSongs,
      targetRating,
      simulationLog,
      applyConstOverrides,
      initializeSongList
    );
     const endTime = performance.now();
     customResult.simulationLog.push(`[SYSTEM] Simulation finished in ${(endTime - startTime).toFixed(2)}ms.`);
    return customResult;
  }

  const { best_count, new_20_count } = { best_count: 30, new_20_count: 20 };
  let currentSimulatedB30Songs = applyConstOverrides(initializeSongList(originalB30Songs, "B30"));
  let currentSimulatedNew20Songs = applyConstOverrides(initializeSongList(originalNew20Songs, "N20"));
  
  let { average: currentAverageB30Rating } = calculateAverageAndOverallRating(currentSimulatedB30Songs, best_count, 'targetRating');
  let { average: currentAverageNew20Rating } = calculateAverageAndOverallRating(currentSimulatedNew20Songs, new_20_count, 'targetRating');
  let currentOverallRating = calculateAverageAndOverallRating([], 0, 'currentRating', currentAverageB30Rating, currentAverageNew20Rating, currentSimulatedB30Songs.length, currentSimulatedNew20Songs.length).overallAverage ?? 0;
  
  simulationLog.push(`[WORKER_INITIAL_STATE] Overall: ${currentOverallRating.toFixed(4)}`);
  
  let finalOutcomePhase: SimulationOutput['finalPhase'] = 'simulating';
  let iterations = 0;
  const maxIterations = simulationMode === 'hybrid' ? MAX_ITERATIONS_HYBRID : MAX_ITERATIONS_PER_LIST;

  while (currentOverallRating < targetRating && iterations < maxIterations) {
    iterations++;
    let b30Stuck = true, n20Stuck = true;

    if (simulationMode === 'b30_only' || simulationMode === 'hybrid') {
      const result = _performListSimulationPhase(currentSimulatedB30Songs, simulationInput, simulationLog, 'b30', currentAverageB30Rating);
      currentSimulatedB30Songs = result.updatedSongs;
      b30Stuck = result.stuck;
    }

    if (simulationMode === 'n20_only' || simulationMode === 'hybrid') {
        const result = _performListSimulationPhase(currentSimulatedNew20Songs, simulationInput, simulationLog, 'n20', currentAverageNew20Rating);
        currentSimulatedNew20Songs = result.updatedSongs;
        n20Stuck = result.stuck;
    }

    ({ average: currentAverageB30Rating } = calculateAverageAndOverallRating(currentSimulatedB30Songs, best_count, 'targetRating'));
    ({ average: currentAverageNew20Rating } = calculateAverageAndOverallRating(currentSimulatedNew20Songs, new_20_count, 'targetRating'));
    currentOverallRating = calculateAverageAndOverallRating([], 0, 'currentRating', currentAverageB30Rating, currentAverageNew20Rating, currentSimulatedB30Songs.length, currentSimulatedNew20Songs.length).overallAverage ?? 0;
    
    if (simulationMode === 'b30_only' && b30Stuck) { finalOutcomePhase = 'stuck_b30_no_improvement'; break; }
    if (simulationMode === 'n20_only' && n20Stuck) { finalOutcomePhase = 'stuck_n20_no_improvement'; break; }
    if (simulationMode === 'hybrid' && b30Stuck && n20Stuck) { finalOutcomePhase = 'stuck_both_no_improvement'; break; }
  }

  if (currentOverallRating >= targetRating) {
    finalOutcomePhase = 'target_reached';
  } else if (finalOutcomePhase === 'simulating') {
      finalOutcomePhase = 'stuck_both_no_improvement';
  }
  
  const endTime = performance.now();
  simulationLog.push(`[SYSTEM] Simulation finished in ${(endTime - startTime).toFixed(2)}ms.`);

  return {
    simulatedB30Songs: currentSimulatedB30Songs,
    simulatedNew20Songs: currentSimulatedNew20Songs,
    finalAverageB30Rating: currentAverageB30Rating,
    finalAverageNew20Rating: currentAverageNew20Rating,
    finalOverallRating: currentOverallRating,
    finalPhase: finalOutcomePhase,
    simulationLog,
  };
}


function _performCustomListSimulation(
  customSongs: Song[],
  targetRating: number,
  simulationLog: string[],
  applyConstOverrides: (s: Song[]) => Song[],
  initializeSongList: (s: Song[], n: string) => Song[]
): SimulationOutput {
  simulationLog.push('[커스텀] 커스텀 목록 시뮬레이션을 시작합니다.');

  let processedCustomSongs = applyConstOverrides(initializeSongList(customSongs, "Custom"));
  
  let { average: customAvg } = calculateAverageAndOverallRating(processedCustomSongs, customSongs.length, 'targetRating');
  simulationLog.push(`Custom Mode Initial State: Average Rating: ${customAvg?.toFixed(4) || 'N/A'}`);
  
  let iterations = 0;
  const maxIterations = MAX_ITERATIONS_HYBRID;
  let finalPhase: SimulationOutput['finalPhase'] = 'simulating';

  while ((customAvg === null || customAvg < targetRating) && iterations < maxIterations) {
    const simulationInputForPhase: SimulationInput = {
        originalB30Songs: processedCustomSongs,
        originalNew20Songs: [], allPlayedNewSongsPool: [], allMusicData: [], userPlayHistory: [], newSongsDataTitlesVerse: [], constOverrides: [],
        currentRating: customAvg ?? 0, targetRating, excludedSongKeys: [], algorithmPreference: 'floor', isScoreLimitReleased: true, phaseTransitionPoint: 17.00, simulationMode: 'b30_only'
    };

    const { updatedSongs, stuck } = _performListSimulationPhase(processedCustomSongs, simulationInputForPhase, simulationLog, 'b30', customAvg);
    
    if (stuck) {
        finalPhase = 'stuck_b30_no_improvement';
        break;
    }
    processedCustomSongs = updatedSongs;
    ({ average: customAvg } = calculateAverageAndOverallRating(processedCustomSongs, customSongs.length, 'targetRating'));
    iterations++;
  }

  if (customAvg !== null && customAvg >= targetRating) {
      finalPhase = 'target_reached';
  } else if (finalPhase === 'simulating') {
      finalPhase = 'stuck_both_no_improvement';
  }
  
  return {
      simulatedB30Songs: processedCustomSongs,
      simulatedNew20Songs: [],
      finalAverageB30Rating: customAvg,
      finalAverageNew20Rating: null,
      finalOverallRating: customAvg ?? 0,
      finalPhase: finalPhase,
      simulationLog: simulationLog,
  };
}


function _performListSimulationPhase(
  currentSongsInput: Song[],
  input: SimulationInput,
  log: string[],
  listType: 'b30' | 'n20',
  currentAverageForList: number | null
): { updatedSongs: Song[]; songsChangedCount: number; stuck: boolean } {
  let updatedSongs = JSON.parse(JSON.stringify(currentSongsInput)) as Song[];
  let songsChangedCount = 0;
  let phaseIsStuck = true;

  const listLimit = listType === 'b30' ? 30 : 20;
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
        const songIndex = updatedSongs.findIndex(s => s.uniqueId === songToAttemptLeap.uniqueId);
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
            if (a.targetRating !== b.targetRating) return a.targetRating - a.targetRating;
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
        const songIndex = updatedSongs.findIndex(s => s.uniqueId === candidateSong.uniqueId);
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
  
  if (listType === 'n20' && input.allPlayedNewSongsPool) {
    const poolWithExisting = deduplicateSongList([...updatedSongs, ...input.allPlayedNewSongsPool]);
    let bestCandidatesForReplacement = poolWithExisting.filter(p_song => {
        return !input.excludedSongKeys.includes(p_song.uniqueId) && !updatedSongs.some(us => us.uniqueId === p_song.uniqueId);
    });
    bestCandidatesForReplacement.sort((a, b) => b.currentRating - a.currentRating);
    if (bestCandidatesForReplacement.length > 0 && updatedSongs.length >= listLimit) {
        const worstSongInList = updatedSongs.reduce((min, song) => song.targetRating < min.targetRating ? song : min, updatedSongs[0]);
        const bestCandidate = bestCandidatesForReplacement[0];
        if (bestCandidate.currentRating > worstSongInList.targetRating) {
            const indexToRemove = updatedSongs.findIndex(s => s.uniqueId === worstSongInList.uniqueId);
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


// --- Utility Functions ---

function calculateChunithmSongRating(score: number, chartConstant: number | null): number {
    if (chartConstant === null) return 0;
    let baseRating: number;
    if (score >= 1009000) baseRating = chartConstant + 2.15;
    else if (score >= 1007500) baseRating = chartConstant + 2.00 + (score - 1007500) * 0.0001;
    else if (score >= 1005000) baseRating = chartConstant + 1.50 + (score - 1005000) * 0.0002;
    else if (score >= 1000000) baseRating = chartConstant + 1.00 + (score - 1000000) * 0.0001;
    else if (score >= 975000) baseRating = chartConstant + (score - 975000) * 0.00004;
    else if (score >= 950000) baseRating = chartConstant - 1.50 + (score - 950000) * 0.00006;
    else if (score >= 925000) baseRating = chartConstant - 3.00 + (score - 925000) * 0.00006;
    else if (score >= 900000) baseRating = chartConstant - 5.00 + (score - 900000) * 0.00008;
    else if (score >= 800000) baseRating = chartConstant - 5.00 - (900000 - score) * 0.00003;
    else baseRating = 0;
    return parseFloat(baseRating.toFixed(4));
}

function getNextGradeBoundaryScore(currentScore: number): number | null {
    if (currentScore >= 1009000) return null;
    if (currentScore < 800000) return 800000; if (currentScore < 900000) return 900000;
    if (currentScore < 925000) return 925000; if (currentScore < 950000) return 950000;
    if (currentScore < 975000) return 975000; if (currentScore < 1000000) return 1000000;
    if (currentScore < 1005000) return 1005000; if (currentScore < 1007500) return 1007500;
    if (currentScore < 1009000) return 1009000;
    return null;
}

function findMinScoreForTargetRating(song: Song, targetRating: number, isScoreLimitReleased: boolean): { possible: boolean; score: number; rating: number } {
    if (song.chartConstant === null) return { possible: false, score: 0, rating: 0 };
    const maxScore = isScoreLimitReleased ? 1010000 : MAX_SCORE_NORMAL;
    let minScore = song.targetScore;
    let maxTestScore = maxScore;
    let bestFoundScore = maxScore;
    let found = false;

    for (let s = minScore + 1; s <= maxTestScore; s++) {
        const r = calculateChunithmSongRating(s, song.chartConstant);
        if (r >= targetRating) {
            bestFoundScore = s;
            found = true;
            break;
        }
    }
    if (found) {
        return { possible: true, score: bestFoundScore, rating: calculateChunithmSongRating(bestFoundScore, song.chartConstant) };
    }
    return { possible: false, score: 0, rating: 0 };
}


function isSongHighConstantForFloor(song: Song, currentOverallAverageRatingForList: number | null): boolean {
  if (!song.chartConstant || currentOverallAverageRatingForList === null) return false;
  const thresholdBase = currentOverallAverageRatingForList - 1.8;
  const threshold = Math.floor(thresholdBase * 10) / 10;
  return song.chartConstant > threshold;
};

function deduplicateSongList(songs: Song[]): Song[] {
  const songMap = new Map<string, Song>();
  for (const song of songs) {
    const key = song.uniqueId;
    const existingSong = songMap.get(key);
    if (!existingSong || song.targetRating > existingSong.targetRating || (song.targetRating === existingSong.targetRating && song.targetScore > existingSong.targetScore)) {
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
