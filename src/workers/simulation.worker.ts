// src/workers/simulation.worker.ts
/* eslint-disable no-restricted-globals */
import {
  calculatePotentialRating,
  calculateAverageAndOverallRating,
  sortSongsByRatingDesc,
  deduplicateAndPrioritizeSongs,
} from '@/lib/rating-utils';
import type { Song, SimulationInput, SimulationOutput, ShowallApiSongEntry, WorkerInput } from '@/types/result-page';

// --- 전역 상태 ---
// 이 변수들은 워커의 생명주기 동안 데이터를 저장합니다.
let initialData: Omit<SimulationInput, 'targetRating' | 'simulationMode' | 'algorithmPreference' | 'customSongs'> | null = null;
let latestSimulationInput: SimulationInput | null = null;

// --- 메시지 핸들러 ---
self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const message = event.data;

  if (message.type === 'INIT') {
    // INIT 메시지를 받으면, 기본적인 데이터를 워커의 전역 상태에 저장합니다.
    initialData = message.payload;
    // console.log("Worker initialized with base data.");
    return; // 초기화 후에는 시뮬레이션을 실행하지 않고 종료합니다.
  }

  if (message.type === 'SIMULATE') {
    if (!initialData) {
      // 초기화되지 않았다면 에러를 보내고 종료합니다.
      self.postMessage({ error: 'Worker not initialized. Send INIT message first.' });
      return;
    }

    // SIMULATE 메시지를 받으면, 저장된 initialData와 새로운 payload를 결합하여
    // 전체 SimulationInput 객체를 재구성합니다.
    const fullSimulationInput: SimulationInput = {
      ...initialData,
      targetRating: message.payload.targetRating,
      simulationMode: message.payload.simulationMode,
      algorithmPreference: message.payload.algorithmPreference,
      customSongs: message.payload.customSongs,
      excludedSongKeys: message.payload.excludedSongKeys,
    };
    latestSimulationInput = fullSimulationInput; // 디버깅 및 상태 추적용

    // 재구성된 입력으로 시뮬레이션을 실행합니다.
    const result = performSimulation(fullSimulationInput);
    self.postMessage(result);
  }
};


// 기존의 onmessage 핸들러는 이제 performSimulation 함수로 대체됩니다.
// 이 함수는 전체 SimulationInput을 인자로 받습니다.
function performSimulation(simulationInput: SimulationInput): SimulationOutput {
  const {
    targetRating,
    simulationMode,
    algorithmPreference,
    customSongs,
    excludedSongKeys,
    isScoreLimitReleased,
    phaseTransitionPoint,
    excludedSongKeys,
    customSongs,
  } = simulationInput;


  let simulationLog: string[] = [];
  const startTime = performance.now();

  const initializeSongList = (songs: Song[], listName: string): Song[] => {
      simulationLog.push(`Initializing ${listName} list with ${songs.length} songs.`);
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

  if (simulationMode === 'custom' && customSongs) {
      let customSongs = applyConstOverrides(initializeSongList(customSongs, "Custom"));
      let customAvg = calculateAverageRating(customSongs, customSongs.length, false);
      simulationLog.push(`Custom Mode Initial State: Average Rating: ${customAvg?.toFixed(4) || 'N/A'}`);
      
      let iterations = 0;
      const maxIterations = MAX_ITERATIONS_HYBRID;
      let finalPhase: SimulationPhase = 'simulating';

      while ((customAvg === null || customAvg < targetRating) && iterations < maxIterations) {
          const { updatedSongs, stuck } = _performCustomListSimulation(customSongs, input, log);
          if (stuck) {
              finalPhase = 'stuck_b30_no_improvement';
              break;
          }
          customSongs = updatedSongs;
          customAvg = calculateAverageRating(customSongs, customSongs.length, true);
          iterations++;
      }

      if (customAvg !== null && customAvg >= targetRating) {
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
  
  simulationLog.push(`[WORKER_INITIAL_STATE] Overall: ${currentOverallRating.toFixed(4)}`);
  
  let finalOutcomePhase: SimulationPhase = 'simulating';
  let iterations = 0;
  const maxIterations = input.simulationMode === 'hybrid' ? MAX_ITERATIONS_HYBRID : MAX_ITERATIONS_PER_LIST;

  while (currentOverallRating < targetRating && iterations < maxIterations) {
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

  if (currentOverallRating >= targetRating) {
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


function _performCustomListSimulation(
  customSongs: Song[],
  currentB30: Song[],
  currentN20: Song[],
  targetRating: number,
  simulationLog: string[]
): Omit<SimulationOutput, 'finalPhase' | 'error' | 'simulationLog'> {
  simulationLog.push('[커스텀] 커스텀 목록 시뮬레이션을 시작합니다.');

  // customSongs 목록 내에서 점수를 1,010,000으로 설정했을 때의 잠재 레이팅을 계산합니다.
  const potentialCustomSongs = customSongs.map(song => ({
    uniqueId: `${song.id}_${song.diff}`,
    id: song.id, diff: song.diff, title: song.title, chartConstant: song.chartConstant,
    currentScore: song.currentScore, currentRating: song.currentRating, targetScore: 1010000, targetRating: song.targetRating,
    genre: song.genre, level: 'level' in song ? song.level : undefined,
  }));

  const { finalB30, finalN20, finalB30Avg, finalN20Avg, finalOverall, finalPhase } = _performListSimulationPhase(
    potentialCustomSongs,
    {
      targetRating: targetRating,
      simulationMode: 'custom',
      algorithmPreference: 'floor',
      customSongs: customSongs,
      excludedSongKeys: [],
      isScoreLimitReleased: true,
      phaseTransitionPoint: 0,
      constOverrides: [],
      originalB30Songs: [],
      originalNew20Songs: [],
    },
    simulationLog,
    'b30',
    null,
    currentN20,
    false
  );

  simulationLog.push(`[커스텀] 커스텀 목록 시뮬레이션 완료. 최종 평균: ${finalB30Avg?.toFixed(4) || 'N/A'}`);
  return {
    simulatedB30Songs: finalB30,
    simulatedNew20Songs: finalN20,
    finalAverageB30Rating: finalB30Avg,
    finalAverageNew20Rating: finalN20Avg,
    finalOverallRating: finalOverall,
    finalPhase,
  };
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

function isSongHighConstantForFloor(song: Song, currentOverallAverageRatingForList: number | null): boolean => {
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
