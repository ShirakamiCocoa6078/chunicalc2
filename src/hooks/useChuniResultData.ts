
// src/hooks/useChuniResultData.ts
"use client";

import { useState, useEffect, useCallback, useReducer, useRef, useMemo } from 'react'; // Ensure useMemo is imported
import { useToast } from "@/hooks/use-toast";
import NewSongsData from '@/data/NewSongs.json';
import constOverridesInternal from '@/data/const-overrides.json';
import { getTranslation, type Locale } from '@/lib/translations';
import { mapApiSongToAppSong, sortSongsByRatingDesc, calculateAverageAndOverallRating, calculateTheoreticalMaxRatingsForList, deduplicateAndPrioritizeSongs } from '@/lib/rating-utils';
import type {
  Song,
  ProfileData,
  RatingApiResponse,
  ShowallApiSongEntry,
  RatingApiSongEntry,
  CalculationStrategy,
  SimulationPhase,
  UserShowallApiResponse,
  SimulationInput,
  SimulationOutput,
  ConstOverride,
} from "@/types/result-page";
import { useProfileData, useUserRatingData, useUserShowallData, useGlobalMusicData } from './useApiData'; // SWR hooks

const BEST_COUNT = 30;
const NEW_20_COUNT = 20;
const MAX_SCORE_ASSUMED_FOR_POTENTIAL = 1009000;

// --- State, Action, Reducer for useReducer ---
interface ResultDataState {
  apiPlayerName: string | null;
  originalB30SongsData: Song[];
  originalNew20SongsData: Song[];
  allPlayedNewSongsPool: Song[];
  allMusicData: ShowallApiSongEntry[];
  userPlayHistory: ShowallApiSongEntry[];

  simulatedB30Songs: Song[];
  simulatedNew20Songs: Song[];
  simulatedAverageB30Rating: number | null;
  simulatedAverageNew20Rating: number | null;
  finalOverallSimulatedRating: number | null;
  simulationLog: string[];
  
  currentPhase: SimulationPhase;
  isLoadingSimulation: boolean;
  simulationError: string | null;
  
  preComputationResult: { reachableRating: number; messageKey: string; theoreticalMaxSongsB30?: Song[], theoreticalMaxSongsN20?: Song[] } | null;
  excludedSongKeys: string[];
  lastRefreshedTimestamp: number | null; // For UI display of refresh time
}

type ResultDataAction =
  | { type: 'SET_INITIAL_DATA_SUCCESS'; payload: { 
      profileName: string | null;
      originalB30: Song[]; 
      originalN20: Song[]; 
      allPlayedPool: Song[]; 
      allMusic: ShowallApiSongEntry[]; 
      userHistory: ShowallApiSongEntry[];
      timestamp: number;
    } }
  | { type: 'START_SIMULATION'; payload: { locale: Locale } }
  | { type: 'SIMULATION_SUCCESS'; payload: SimulationOutput }
  | { type: 'SIMULATION_ERROR'; payload: string }
  | { type: 'TOGGLE_EXCLUDE_SONG'; payload: string }
  | { type: 'RESET_SIMULATION_STATE_FOR_NEW_STRATEGY' }
  | { type: 'SET_PRECOMPUTATION_RESULT'; payload: ResultDataState['preComputationResult'] }
  | { type: 'SET_CURRENT_PHASE'; payload: SimulationPhase };


const initialState: ResultDataState = {
  apiPlayerName: null,
  originalB30SongsData: [],
  originalNew20SongsData: [],
  allPlayedNewSongsPool: [],
  allMusicData: [],
  userPlayHistory: [],
  simulatedB30Songs: [],
  simulatedNew20Songs: [],
  simulatedAverageB30Rating: null,
  simulatedAverageNew20Rating: null,
  finalOverallSimulatedRating: null,
  simulationLog: [],
  currentPhase: 'idle',
  isLoadingSimulation: false,
  simulationError: null,
  preComputationResult: null,
  excludedSongKeys: [],
  lastRefreshedTimestamp: null,
};

function resultDataReducer(state: ResultDataState, action: ResultDataAction): ResultDataState {
  switch (action.type) {
    case 'SET_INITIAL_DATA_SUCCESS':
      return {
        ...state,
        apiPlayerName: action.payload.profileName,
        originalB30SongsData: action.payload.originalB30,
        originalNew20SongsData: action.payload.originalN20,
        allPlayedNewSongsPool: action.payload.allPlayedPool,
        allMusicData: action.payload.allMusic,
        userPlayHistory: action.payload.userHistory,
        lastRefreshedTimestamp: action.payload.timestamp,
        simulatedB30Songs: action.payload.originalB30.map(s => ({ ...s, targetScore: s.currentScore, targetRating: s.currentRating })),
        simulatedNew20Songs: action.payload.originalN20.map(s => ({ ...s, targetScore: s.currentScore, targetRating: s.currentRating })),
        simulatedAverageB30Rating: calculateAverageAndOverallRating(action.payload.originalB30, BEST_COUNT, 'currentRating').average,
        simulatedAverageNew20Rating: calculateAverageAndOverallRating(action.payload.originalN20, NEW_20_COUNT, 'currentRating').average,
        finalOverallSimulatedRating: calculateAverageAndOverallRating([], 0, 'currentRating', calculateAverageAndOverallRating(action.payload.originalB30, BEST_COUNT, 'currentRating').average ?? 0, calculateAverageAndOverallRating(action.payload.originalN20, NEW_20_COUNT, 'currentRating').average ?? 0, action.payload.originalB30.length, action.payload.originalN20.length).overallAverage ?? 0,
        currentPhase: 'idle',
        simulationError: null,
        isLoadingSimulation: false,
        preComputationResult: null,
      };
    case 'START_SIMULATION':
      return { ...state, isLoadingSimulation: true, simulationError: null, currentPhase: 'simulating', simulationLog: [getTranslation(action.payload.locale, 'resultPageLogSimulationStarting')] };
    case 'SIMULATION_SUCCESS':
      return {
        ...state,
        isLoadingSimulation: false,
        simulatedB30Songs: action.payload.simulatedB30Songs,
        simulatedNew20Songs: action.payload.simulatedNew20Songs,
        simulatedAverageB30Rating: action.payload.finalAverageB30Rating,
        simulatedAverageNew20Rating: action.payload.finalAverageNew20Rating,
        finalOverallSimulatedRating: action.payload.finalOverallRating,
        currentPhase: action.payload.finalPhase,
        simulationLog: [...state.simulationLog, ...action.payload.simulationLog],
        simulationError: action.payload.error || null,
      };
    case 'SIMULATION_ERROR':
      return { ...state, isLoadingSimulation: false, simulationError: action.payload, currentPhase: 'error_simulation_logic' };
    case 'TOGGLE_EXCLUDE_SONG':
      const currentExcluded = state.excludedSongKeys;
      const songKey = action.payload;
      const newExcludedKeys = currentExcluded.includes(songKey)
        ? currentExcluded.filter(key => key !== songKey)
        : [...currentExcluded, songKey];
      return { ...state, excludedSongKeys: newExcludedKeys };
    case 'RESET_SIMULATION_STATE_FOR_NEW_STRATEGY':
      return {
        ...state,
        simulatedB30Songs: state.originalB30SongsData.map(s => ({ ...s, targetScore: s.currentScore, targetRating: s.currentRating })),
        simulatedNew20Songs: state.originalNew20SongsData.map(s => ({ ...s, targetScore: s.currentScore, targetRating: s.currentRating })),
        simulatedAverageB30Rating: calculateAverageAndOverallRating(state.originalB30SongsData, BEST_COUNT, 'currentRating').average,
        simulatedAverageNew20Rating: calculateAverageAndOverallRating(state.originalNew20SongsData, NEW_20_COUNT, 'currentRating').average,
        finalOverallSimulatedRating: calculateAverageAndOverallRating([], 0, 'currentRating', calculateAverageAndOverallRating(state.originalB30SongsData, BEST_COUNT, 'currentRating').average ?? 0, calculateAverageAndOverallRating(state.originalNew20SongsData, NEW_20_COUNT, 'currentRating').average ?? 0, state.originalB30SongsData.length, state.originalNew20SongsData.length).overallAverage ?? 0,
        currentPhase: 'idle',
        simulationError: null,
        isLoadingSimulation: false,
        preComputationResult: null,
        simulationLog: [],
      };
    case 'SET_PRECOMPUTATION_RESULT':
        return { ...state, preComputationResult: action.payload, isLoadingSimulation: false };
    case 'SET_CURRENT_PHASE':
        return { ...state, currentPhase: action.payload, isLoadingSimulation: false };
    default:
      return state;
  }
}

const getIsScoreLimitReleased = (): boolean => {
  return false;
};

const flattenGlobalMusicEntry = (rawEntry: any): ShowallApiSongEntry[] => {
    const flattenedEntries: ShowallApiSongEntry[] = [];
    if (rawEntry && rawEntry.meta && rawEntry.data && typeof rawEntry.data === 'object') {
        const meta = rawEntry.meta; const difficulties = rawEntry.data;
        for (const diffKey in difficulties) {
            if (Object.prototype.hasOwnProperty.call(difficulties, diffKey)) {
                const diffData = difficulties[diffKey];
                if (diffData && meta.id && meta.title) {
                    flattenedEntries.push({ uniqueId: `${meta.id}_${diffKey.toUpperCase()}`, id: String(meta.id), title: String(meta.title), genre: String(meta.genre || "N/A"), release: String(meta.release || ""), diff: diffKey.toUpperCase(), level: String(diffData.level || "N/A"), const: (typeof diffData.const === 'number' || diffData.const === null) ? diffData.const : parseFloat(String(diffData.const)), is_const_unknown: diffData.is_const_unknown === true, score: undefined, rating: undefined, is_played: undefined, } as any);
                }
            }
        }
    } else if (rawEntry && rawEntry.id && rawEntry.title && rawEntry.diff) flattenedEntries.push(rawEntry as ShowallApiSongEntry);
    return flattenedEntries;
};


interface UseChuniResultDataProps {
  userNameForApi: string | null;
  currentRatingDisplay: string | null;
  targetRatingDisplay: string | null;
  locale: Locale;
  refreshNonce: number;
  clientHasMounted: boolean;
  calculationStrategy: CalculationStrategy;
}

export function useChuniResultData({
  userNameForApi,
  currentRatingDisplay,
  targetRatingDisplay,
  locale,
  refreshNonce,
  clientHasMounted,
  calculationStrategy,
}: UseChuniResultDataProps) {
  const { toast } = useToast();
  const [state, dispatch] = useReducer(resultDataReducer, initialState);
  const simulationWorkerRef = useRef<Worker | null>(null);

  const defaultPlayerName = getTranslation(locale, 'resultPageDefaultPlayerName');

  const { data: profileData, error: profileError, isLoading: isLoadingProfile, mutate: mutateProfile } = useProfileData(userNameForApi && userNameForApi !== defaultPlayerName ? userNameForApi : null);
  const { data: ratingData, error: ratingError, isLoading: isLoadingRating, mutate: mutateRating } = useUserRatingData(userNameForApi && userNameForApi !== defaultPlayerName ? userNameForApi : null);
  const { data: userShowallData, error: userShowallError, isLoading: isLoadingUserShowall, mutate: mutateUserShowall } = useUserShowallData(userNameForApi && userNameForApi !== defaultPlayerName ? userNameForApi : null);
  const { data: globalMusicRaw, error: globalMusicError, isLoading: isLoadingGlobalMusic, mutate: mutateGlobalMusic } = useGlobalMusicData();

  const isLoadingInitialApiData = isLoadingProfile || isLoadingRating || isLoadingUserShowall || isLoadingGlobalMusic;
  const initialApiError = profileError || ratingError || userShowallError || globalMusicError;

  useEffect(() => {
    simulationWorkerRef.current = new Worker(new URL('@/workers/simulation.worker.ts', import.meta.url));
    simulationWorkerRef.current.onmessage = (event: MessageEvent<SimulationOutput>) => {
      dispatch({ type: 'SIMULATION_SUCCESS', payload: event.data });
    };
    simulationWorkerRef.current.onerror = (error) => {
      console.error("Simulation Worker Error:", error);
      dispatch({ type: 'SIMULATION_ERROR', payload: error.message || 'Unknown worker error' });
    };
    return () => simulationWorkerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (!clientHasMounted || isLoadingInitialApiData || initialApiError || !userNameForApi || userNameForApi === defaultPlayerName) {
        if (initialApiError) {
            console.error("Error fetching initial data via SWR:", initialApiError);
        }
        return;
    }

    if (profileData && ratingData && globalMusicRaw && userShowallData) {
      const processedApiPlayerName = profileData.player_name || userNameForApi;
      
      let tempFlattenedGlobalMusicRecords: ShowallApiSongEntry[] = [];
      const globalMusicRecords = Array.isArray(globalMusicRaw) ? globalMusicRaw : (globalMusicRaw?.records || []);
      globalMusicRecords.forEach(rawEntry => {
          tempFlattenedGlobalMusicRecords.push(...flattenGlobalMusicEntry(rawEntry));
      });

      const overridesToApply = constOverridesInternal as ConstOverride[];
      if (overridesToApply.length > 0 && tempFlattenedGlobalMusicRecords.length > 0) {
        overridesToApply.forEach(override => {
          tempFlattenedGlobalMusicRecords.forEach(globalSong => {
            if (globalSong.title === override.title && globalSong.diff.toUpperCase() === override.diff.toUpperCase()) {
              globalSong.const = typeof override.const === 'string' ? parseFloat(override.const) : override.const;
            }
          });
        });
      }

      const best30FromApi = (ratingData.best?.entries || []).slice(0, BEST_COUNT);
      const b30Songs = best30FromApi.map((song) => mapApiSongToAppSong(song, 0));

      const newSongsDataTyped: { verse: string[]; xverse: string[]; } = NewSongsData.titles;
      const newSongsTitles = [...newSongsDataTyped.verse, ...newSongsDataTyped.xverse];
      
      const userRecords: ShowallApiSongEntry[] = userShowallData.records || [];
      const playedNewSongs = userRecords
        .filter(record => newSongsTitles.includes(record.title))
        .map(record => mapApiSongToAppSong(record, 0))
        .filter(song => song.currentRating > 0);
      
      const n20Songs = sortSongsByRatingDesc(playedNewSongs).slice(0, NEW_20_COUNT);
      const allPlayedPool = sortSongsByRatingDesc(playedNewSongs);

      dispatch({
        type: 'SET_INITIAL_DATA_SUCCESS',
        payload: {
          profileName: processedApiPlayerName,
          originalB30: b30Songs,
          originalN20: n20Songs,
          allPlayedPool: allPlayedPool,
          allMusic: tempFlattenedGlobalMusicRecords,
          userHistory: userRecords,
          timestamp: Date.now(),
        },
      });
    }
  }, [
    profileData, ratingData, globalMusicRaw, userShowallData,
    clientHasMounted, isLoadingInitialApiData, initialApiError, 
    userNameForApi, defaultPlayerName, dispatch
  ]);

  useEffect(() => {
    if (calculationStrategy === 'none' || !clientHasMounted || isLoadingInitialApiData) {
      if (state.currentPhase !== 'idle' && calculationStrategy === 'none') {
        dispatch({ type: 'RESET_SIMULATION_STATE_FOR_NEW_STRATEGY' });
      }
      return;
    }

    const parsedCurrentRating = parseFloat(currentRatingDisplay || '0');
    const parsedTargetRating = parseFloat(targetRatingDisplay || '0');
    
    if (isNaN(parsedTargetRating) || parsedTargetRating <= 0 || isNaN(parsedCurrentRating)) {
      return;
    }
    
    const simulationMode = calculationStrategy === "b30_focus" ? "b30_only"
                           : calculationStrategy === "n20_focus" ? "n20_only"
                           : "hybrid";
    const algorithmPreference = calculationStrategy === "hybrid_peak" ? "peak" : "floor";
    const newSongsDataTyped: { verse: string[]; xverse: string[]; } = NewSongsData.titles;
    const newSongsTitles = [...newSongsDataTyped.verse, ...newSongsDataTyped.xverse];
    const constOverridesTyped: ConstOverride[] = constOverridesInternal;

    dispatch({ type: 'START_SIMULATION', payload: { locale } });
    const simulationInput: SimulationInput = {
      originalB30Songs: state.originalB30SongsData,
      originalNew20Songs: state.originalNew20SongsData,
      allPlayedNewSongsPool: state.allPlayedNewSongsPool,
      allMusicData: state.allMusicData,
      userPlayHistory: state.userPlayHistory,
      newSongsDataTitlesVerse: newSongsTitles,
      constOverrides: constOverridesTyped,
      currentRating: parsedCurrentRating,
      targetRating: parsedTargetRating,
      algorithmPreference: algorithmPreference,
      simulationMode: simulationMode,
      isScoreLimitReleased: getIsScoreLimitReleased(),
      phaseTransitionPoint: 17.00,
      excludedSongKeys: state.excludedSongKeys,
    };
    simulationWorkerRef.current?.postMessage(simulationInput);
  }, [calculationStrategy, targetRatingDisplay, currentRatingDisplay, clientHasMounted, isLoadingInitialApiData, state.originalB30SongsData, state.originalNew20SongsData, state.allPlayedNewSongsPool, state.allMusicData, state.userPlayHistory, state.excludedSongKeys, locale, dispatch, state.currentPhase]);

  useEffect(() => {
    if (!clientHasMounted || isLoadingInitialApiData || !userNameForApi || !state.originalB30SongsData || calculationStrategy === 'none') {
        return;
    }

    if (calculationStrategy === 'b30_focus') {
      const { average: maxB30Avg } = calculateTheoreticalMaxRatingsForList(
          state.originalB30SongsData, BEST_COUNT, MAX_SCORE_ASSUMED_FOR_POTENTIAL, state.excludedSongKeys
      );
      if (maxB30Avg) {
        const n20Avg = state.simulatedAverageNew20Rating ?? 0;
        const potentialOverall = calculateAverageAndOverallRating([], 0, 'currentRating', maxB30Avg, n20Avg, BEST_COUNT, state.originalNew20SongsData.length).overallAverage;
        const target = parseFloat(targetRatingDisplay || '0');
        if (potentialOverall && potentialOverall < target) {
          dispatch({ type: 'SET_PRECOMPUTATION_RESULT', payload: { reachableRating: potentialOverall, messageKey: 'reachableRatingB30OnlyMessage' } });
          return;
        }
      }
    }
    
    if (calculationStrategy === 'n20_focus') {
        const allPotentialNewSongs = deduplicateAndPrioritizeSongs([...state.allPlayedNewSongsPool, ...state.originalNew20SongsData]);
        const { average: maxN20Avg } = calculateTheoreticalMaxRatingsForList(
            allPotentialNewSongs, NEW_20_COUNT, MAX_SCORE_ASSUMED_FOR_POTENTIAL, state.excludedSongKeys
        );
        if (maxN20Avg) {
            const b30Avg = state.simulatedAverageB30Rating ?? 0;
            const potentialOverall = calculateAverageAndOverallRating([], 0, 'currentRating', b30Avg, maxN20Avg, state.originalB30SongsData.length, NEW_20_COUNT).overallAverage;
            const target = parseFloat(targetRatingDisplay || '0');
            if (potentialOverall && potentialOverall < target) {
                dispatch({ type: 'SET_PRECOMPUTATION_RESULT', payload: { reachableRating: potentialOverall, messageKey: 'reachableRatingN20OnlyMessage' } });
                return;
            }
        }
    }

    if (state.preComputationResult) {
      dispatch({ type: 'RESET_SIMULATION_STATE_FOR_NEW_STRATEGY' });
    }
  }, [
    calculationStrategy, state.originalB30SongsData, state.originalNew20SongsData,
    state.allPlayedNewSongsPool, state.excludedSongKeys, targetRatingDisplay, 
    clientHasMounted, isLoadingInitialApiData, userNameForApi,
    state.simulatedAverageB30Rating, state.simulatedAverageNew20Rating,
    state.preComputationResult, dispatch
  ]);

  const lastRefreshed = useMemo(() => {
      if (!clientHasMounted || !state.lastRefreshedTimestamp) return getTranslation(locale, 'resultPageSyncStatusNoCache');
      const date = new Date(state.lastRefreshedTimestamp);
      return getTranslation(locale, 'resultPageSyncStatus', date.toLocaleString(locale === 'KR' ? 'ko-KR' : 'ja-JP'));
  }, [state.lastRefreshedTimestamp, locale, clientHasMounted]);
  
  const toggleExcludeSongKey = useCallback((songKey: string) => {
    dispatch({ type: 'TOGGLE_EXCLUDE_SONG', payload: songKey });
  }, []);

  return {
    apiPlayerName: state.apiPlayerName,
    best30SongsData: state.simulatedB30Songs,
    new20SongsData: state.simulatedNew20Songs,
    combinedTopSongs: sortSongsByRatingDesc([...state.simulatedB30Songs, ...state.simulatedNew20Songs]),
    isLoadingSongs: isLoadingInitialApiData || state.isLoadingSimulation,
    errorLoadingSongs: initialApiError?.message || state.simulationError,
    lastRefreshed,
    currentPhase: state.currentPhase,
    simulatedAverageB30Rating: state.simulatedAverageB30Rating,
    simulatedAverageNew20Rating: state.simulatedAverageNew20Rating,
    finalOverallSimulatedRating: state.finalOverallSimulatedRating,
    simulationLog: state.simulationLog,
    preComputationResult: state.preComputationResult,
    excludedSongKeys: state.excludedSongKeys,
    toggleExcludeSongKey,
    allMusicData: state.allMusicData,
  };
}

    