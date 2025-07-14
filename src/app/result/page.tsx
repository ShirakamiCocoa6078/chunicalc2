
"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import SongCard from "@/components/SongCard";
import { User, Gauge, Target as TargetIconLucide, ArrowLeft, Loader2, AlertTriangle, BarChart3, TrendingUp, TrendingDown, RefreshCw, Info, Settings2, Activity, Zap, Replace, Rocket, Telescope, CheckCircle2, XCircle, Brain, PlaySquare, ListChecks, FilterIcon, DatabaseZap, FileJson, Server, CalendarDays, BarChartHorizontalBig, FileSearch, Shuffle, Hourglass, X, Focus, HelpCircle, PlusCircle, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/lib/translations';
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useChuniResultData } from "@/hooks/useChuniResultData";
import type { CalculationStrategy, Song, ShowallApiSongEntry } from "@/types/result-page";
import { getLocalReferenceApiToken } from '@/lib/get-api-token';
import { LOCAL_STORAGE_PREFIX } from '@/lib/cache';
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { mapApiSongToAppSong } from "@/lib/rating-utils";
import { ScrollArea } from "@/components/ui/scroll-area";


const normalizeForSearch = (str: string): string => {
  // 유니코드 속성 이스케이프를 사용하여 문자(L)와 숫자(N)를 제외한 모든 문자를 제거합니다.
  // 'u' 플래그는 유니코드 패턴에 필수적입니다.
  return str.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
};


function ResultContent() {
  const searchParams = useSearchParams();
  const { locale } = useLanguage();
  const { toast } = useToast();

  const initialUserName = searchParams.get("nickname");
  const initialCurrentRating = searchParams.get("current");

  const [userNameForApi, setUserNameForApi] = useState<string | null>(null);
  const [currentRatingDisplay, setCurrentRatingDisplay] = useState<string | null>(null);
  const [targetRating, setTargetRating] = useState<string>('');

  const [calculationStrategy, setCalculationStrategy] = useState<CalculationStrategy>("none");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [clientHasMounted, setClientHasMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ShowallApiSongEntry[]>([]);
  const [simulationTargetSongs, setSimulationTargetSongs] = useState<Song[]>([]);


  useEffect(() => {
    setClientHasMounted(true);
    setUserNameForApi(initialUserName || getTranslation(locale, 'resultPageDefaultPlayerName'));
    const currentRatingValue = initialCurrentRating ? parseFloat(initialCurrentRating) : NaN;
    setCurrentRatingDisplay(!isNaN(currentRatingValue) ? currentRatingValue.toFixed(2) : getTranslation(locale, 'resultPageNotAvailable'));

    if (initialCurrentRating && !isNaN(currentRatingValue)) {
      const newTargetRating = Math.min(currentRatingValue + 0.01, 18.00);
      setTargetRating(newTargetRating.toFixed(2));
    } else {
      setTargetRating('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserName, initialCurrentRating, locale]);

  const {
    apiPlayerName,
    best30SongsData,
    new20SongsData,
    combinedTopSongs,
    isLoadingSongs,
    errorLoadingSongs,
    lastRefreshed,
    currentPhase,
    simulatedAverageB30Rating,
    simulatedAverageNew20Rating,
    finalOverallSimulatedRating,
    simulationLog,
    preComputationResult,
    excludedSongKeys,
    toggleExcludeSongKey,
    allMusicData,
  } = useChuniResultData({
    userNameForApi,
    currentRatingDisplay,
    targetRatingDisplay: targetRating,
    locale,
    refreshNonce,
    clientHasMounted,
    calculationStrategy,
    simulationTargetSongs,
  });

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const normalizedQuery = normalizeForSearch(searchQuery);
    const filtered = allMusicData.filter(song => 
      normalizeForSearch(song.title).includes(normalizedQuery)
    );
    setSearchResults(filtered.slice(0, 50)); // 검색 결과 50개로 제한
  }, [searchQuery, allMusicData]);

  const addSongToSimulation = (song: ShowallApiSongEntry) => {
    const newSong = mapApiSongToAppSong(song, 0);
    if (!simulationTargetSongs.some(s => s.uniqueId === newSong.uniqueId)) {
      setSimulationTargetSongs(prev => [...prev, newSong]);
    }
  };

  const removeSongFromSimulation = (uniqueId: string) => {
    setSimulationTargetSongs(prev => prev.filter(s => s.uniqueId !== uniqueId));
  };


  const handleRefreshData = useCallback(() => {
    const defaultPlayerName = getTranslation(locale, 'resultPageDefaultPlayerName');
    if (typeof window !== 'undefined' && userNameForApi && userNameForApi !== defaultPlayerName) {
        const profileKey = `${LOCAL_STORAGE_PREFIX}profile_${userNameForApi}`;
        const ratingDataKey = `${LOCAL_STORAGE_PREFIX}rating_data_${userNameForApi}`;
        const userShowallKey = `${LOCAL_STORAGE_PREFIX}showall_${userNameForApi}`;

        localStorage.removeItem(profileKey);
        localStorage.removeItem(ratingDataKey);
        localStorage.removeItem(userShowallKey);
        // Global music data cache is handled by SWR revalidation triggered by mutateGlobalMusic in useChuniResultData
        toast({ title: getTranslation(locale, 'resultPageToastRefreshingDataTitle'), description: getTranslation(locale, 'resultPageToastSWRRefreshDesc')});
    } else {
        toast({ title: getTranslation(locale, 'resultPageToastRefreshingDataTitle'), description: getTranslation(locale, 'resultPageToastSWRRefreshDesc')});
    }
    setCalculationStrategy("none"); // Reset strategy on full refresh
    setRefreshNonce(prev => prev + 1);
  }, [userNameForApi, locale, toast]);


  const best30GridCols = "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

  const renderSimulationStatus = () => {
    let statusText = "";
    let bgColor = "bg-blue-100 dark:bg-blue-900";
    let textColor = "text-blue-700 dark:text-blue-300";
    let IconComponent: React.ElementType = Info;
    let iconShouldSpin = false;

    const b30AvgStr = (typeof simulatedAverageB30Rating === 'number' && !isNaN(simulatedAverageB30Rating))
        ? simulatedAverageB30Rating.toFixed(4)
        : getTranslation(locale, 'resultPageNotAvailable');
    const n20AvgStr = (typeof simulatedAverageNew20Rating === 'number' && !isNaN(simulatedAverageNew20Rating))
        ? simulatedAverageNew20Rating.toFixed(4)
        : getTranslation(locale, 'resultPageNotAvailable');
    const overallRatingStr = (typeof finalOverallSimulatedRating === 'number' && !isNaN(finalOverallSimulatedRating))
        ? finalOverallSimulatedRating.toFixed(4)
        : getTranslation(locale, 'resultPageNotAvailable');


    if (errorLoadingSongs && (currentPhase === 'error_data_fetch' || currentPhase === 'error_simulation_logic')) {
        statusText = getTranslation(locale, 'resultPageErrorLoadingTitle') + `: ${errorLoadingSongs}`;
        bgColor = "bg-red-100 dark:bg-red-900"; textColor = "text-red-700 dark:text-red-300"; IconComponent = AlertTriangle;
    } else if (isLoadingSongs && (currentPhase === 'idle' || currentPhase === 'simulating' || currentPhase !== 'error_data_fetch')) {
      statusText = getTranslation(locale, 'resultPageLoadingSongsTitle');
      IconComponent = Loader2; iconShouldSpin = true;
    } else if (preComputationResult && currentPhase === 'target_unreachable_info' && preComputationResult.messageKey) {
        statusText = getTranslation(locale, preComputationResult.messageKey as any, preComputationResult.reachableRating.toFixed(4));
        bgColor = "bg-orange-100 dark:bg-orange-900"; textColor = "text-orange-700 dark:text-orange-300"; IconComponent = XCircle;
    } else if (calculationStrategy === "none" && currentPhase !== 'error_data_fetch' && !isLoadingSongs) { 
        statusText = getTranslation(locale, 'simulationTargetSongsPlaceholder');
        bgColor = "bg-yellow-100 dark:bg-yellow-900"; textColor = "text-yellow-700 dark:text-yellow-300"; IconComponent = Brain;
    } else { 
        switch (currentPhase) {
          case 'idle': 
            if (currentRatingDisplay && targetRating && parseFloat(currentRatingDisplay) >= parseFloat(targetRating)) {
                statusText = getTranslation(locale, 'resultPageTargetReachedFmt', overallRatingStr, b30AvgStr, n20AvgStr);
                bgColor = "bg-green-100 dark:bg-green-900"; textColor = "text-green-700 dark:text-green-300"; IconComponent = CheckCircle2;
            } else if (calculationStrategy !== "none") {
                 statusText = getTranslation(locale, 'resultPageLogSimulationStarting') + " (전체: " + overallRatingStr + ")";
                 IconComponent = PlaySquare; 
            } else { 
                 statusText = getTranslation(locale, 'simulationTargetSongsPlaceholder');
                 bgColor = "bg-yellow-100 dark:bg-yellow-900"; textColor = "text-yellow-700 dark:text-yellow-300"; IconComponent = Brain;
            }
            break;
          case 'simulating': 
             statusText = getTranslation(locale, 'resultPageLogSimulationStarting') + " (로직 수행 중)";
             IconComponent = Activity; iconShouldSpin = true;
             break;
          case 'target_reached':
            statusText = getTranslation(locale, 'resultPageTargetReachedFmt', overallRatingStr, b30AvgStr, n20AvgStr);
            bgColor = "bg-green-100 dark:bg-green-900"; textColor = "text-green-700 dark:text-green-300"; IconComponent = TargetIconLucide;
            break;
          case 'stuck_b30_no_improvement':
          case 'stuck_n20_no_improvement':
          case 'stuck_both_no_improvement':
            statusText = getTranslation(locale, 'resultPageStuckBothBaseFmt', overallRatingStr) + getTranslation(locale, 'resultPageDetailRatingsAvgFmt', b30AvgStr, n20AvgStr);
            bgColor = (currentPhase === 'stuck_both_no_improvement' ? "bg-orange-100 dark:bg-orange-900" : "bg-yellow-100 dark:bg-yellow-900");
            textColor = (currentPhase === 'stuck_both_no_improvement' ? "text-orange-700 dark:text-orange-300" : "text-yellow-700 dark:text-yellow-300");
            IconComponent = (currentPhase === 'stuck_both_no_improvement' ? XCircle : Replace);
            break;
          case 'target_unreachable_info': 
            statusText = (preComputationResult?.messageKey && preComputationResult?.reachableRating !== undefined)
                ? getTranslation(locale, preComputationResult.messageKey as any, preComputationResult.reachableRating.toFixed(4))
                : getTranslation(locale, 'resultPageErrorSimulationGeneric', "목표 도달 불가 (사전 계산)");
            bgColor = "bg-orange-100 dark:bg-orange-900"; textColor = "text-orange-700 dark:text-orange-300"; IconComponent = XCircle;
            break;
          default:
            if (!isLoadingSongs && calculationStrategy !== "none") { 
              statusText = `알 수 없는 페이즈: ${currentPhase || 'N/A'}. 전체: ${overallRatingStr}`;
              IconComponent = AlertTriangle;
            } else if (!isLoadingSongs){
              statusText = getTranslation(locale, 'simulationTargetSongsPlaceholder');
              bgColor = "bg-yellow-100 dark:bg-yellow-900"; textColor = "text-yellow-700 dark:text-yellow-300"; IconComponent = Brain;
            }
        }
    }

    return (
      <div className={cn("p-3 my-4 rounded-md text-sm flex items-center shadow-md", bgColor, textColor)}>
        <IconComponent className={cn("w-5 h-5 mr-3 shrink-0", iconShouldSpin && "animate-spin")} />
        <p>{statusText}</p>
      </div>
    );
  };


  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <TooltipProvider delayDuration={300}>
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 p-4 bg-card border border-border rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold font-headline">{apiPlayerName || userNameForApi || getTranslation(locale, 'resultPageDefaultPlayerName')}</h1>
                <Link href="/" className="text-sm text-primary hover:underline flex items-center">
                  <ArrowLeft className="w-4 h-4 mr-1" /> {getTranslation(locale, 'resultPageButtonBackToCalc')}
                </Link>
              </div>
            </div>
            <div className="flex flex-col sm:items-end items-stretch gap-2">
              <div className="flex items-center justify-end gap-2 text-sm sm:text-base w-full">
                <div className="flex items-center p-2 bg-secondary rounded-md">
                  <Gauge className="w-5 h-5 mr-2 text-primary" />
                  <span>{getTranslation(locale, 'resultPageHeaderCurrent')} <span className="font-semibold">{currentRatingDisplay}</span></span>
                </div>
                <div className="flex items-center p-2 bg-secondary rounded-md">
                  <TargetIconLucide className="w-5 h-5 mr-2 text-primary" />
                    <Label htmlFor="targetRating" className="whitespace-nowrap mr-2">{getTranslation(locale, 'targetRatingLabel')}</Label>
                    <Input
                        id="targetRating"
                        type="number"
                        step="0.01"
                        min="0"
                        max="17.50"
                        placeholder={getTranslation(locale, 'targetRatingPlaceholder')}
                        value={targetRating}
                        onChange={(e) => setTargetRating(e.target.value)}
                        className="w-24 h-8 text-base font-semibold"
                    />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 w-full">
                  <LanguageToggle />
                  <ThemeToggle />
              </div>
            </div>
          </header>

          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center">
                <FileSearch className="w-6 h-6 mr-3 text-primary" />
                <CardTitle>{getTranslation(locale, 'simulationSearchTitle')}</CardTitle>
              </div>
              <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>{getTranslation(locale, 'tooltipSimulationSearchContent')}</p>
                  </TooltipContent>
                </Tooltip>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder={getTranslation(locale, 'simulationSearchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <ScrollArea className="h-60 mt-4 border rounded-md">
                <div className="p-2 space-y-1">
                  {searchResults.length > 0 ? (
                    searchResults.map(song => (
                      <div key={`${song.id}-${song.diff}`} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                        <div className="truncate">
                          <p className="text-sm font-medium truncate">{song.title}</p>
                          <p className="text-xs text-muted-foreground">{song.diff}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => addSongToSimulation(song)}>
                          <PlusCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    searchQuery && <p className="text-sm text-muted-foreground text-center p-4">No results found.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-2">
              <p className="text-xs text-muted-foreground">
                  {clientHasMounted && lastRefreshed
                      ? lastRefreshed
                      : getTranslation(locale, 'resultPageSyncStatusChecking')}
              </p>
              <Button
                  onClick={handleRefreshData}
                  variant="outline"
                  size="sm"
                  disabled={isLoadingSongs || !userNameForApi || userNameForApi === getTranslation(locale, 'resultPageDefaultPlayerName') || !getLocalReferenceApiToken()}
              >
                  <RefreshCw className={cn("w-4 h-4 mr-2", isLoadingSongs && "animate-spin")} />
                  {getTranslation(locale, 'resultPageRefreshButton')}
              </Button>
          </div>

          {renderSimulationStatus()}

          <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                      <Focus className="w-6 h-6 mr-3 text-primary" />
                      {getTranslation(locale, 'simulationTargetSongsTitle')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                  {simulationTargetSongs.length > 0 ? (
                    <div className={`grid gap-4 ${best30GridCols}`}>
                      {simulationTargetSongs.map(song => (
                        <SongCard
                          key={song.uniqueId}
                          song={song}
                          isExcluded={false} // 시뮬레이션 대상 목록에서는 '제외' 상태를 사용하지 않음
                          onToggleExclude={() => removeSongFromSimulation(song.uniqueId)}
                          locale={locale}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <p>{getTranslation(locale, 'simulationTargetSongsPlaceholder')}</p>
                    </div>
                  )}
                </CardContent>
            </Card>

            <Tabs defaultValue="best30" className="w-full">
               <div className="flex items-start justify-between mb-2">
              <TabsList className="grid w-full max-w-lg grid-cols-3 gap-1 bg-muted p-1 rounded-lg shadow-inner">
                <TabsTrigger value="best30" className="px-2 py-2 text-xs whitespace-nowrap sm:px-3 sm:py-1.5 sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">{getTranslation(locale, 'resultPageTabBest30')}</TabsTrigger>
                <TabsTrigger value="new20" className="px-2 py-2 text-xs whitespace-nowrap sm:px-3 sm:py-1.5 sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">{getTranslation(locale, 'resultPageTabNew20')}</TabsTrigger>
                <TabsTrigger value="combined" className="px-2 py-2 text-xs whitespace-nowrap sm:px-3 sm:py-1.5 sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">{getTranslation(locale, 'resultPageTabCombined')}</TabsTrigger>
              </TabsList>
              <Tooltip>
                <TooltipTrigger asChild>
                    <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help ml-4" />
                </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs sm:max-w-sm">
                  <p>{getTranslation(locale, 'tooltipResultTabsContent')}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Main content display logic */}
              {(isLoadingSongs && currentPhase !== 'error_data_fetch') ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-xl text-muted-foreground">{getTranslation(locale, 'resultPageLoadingSongsTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  { clientHasMounted && userNameForApi && userNameForApi !== getTranslation(locale, 'resultPageDefaultPlayerName')
                    ? ( (localStorage.getItem(`${LOCAL_STORAGE_PREFIX}profile_${userNameForApi}`) || localStorage.getItem(`${LOCAL_STORAGE_PREFIX}rating_data_${userNameForApi}`)) 
                      ? getTranslation(locale, 'resultPageLoadingCacheCheck')
                      : getTranslation(locale, 'resultPageLoadingApiFetch'))
                    : getTranslation(locale, 'resultPageLoadingDataStateCheck')
                  }
                </p>
              </div>
              ) : errorLoadingSongs ? (
               <Card className="border-destructive/50 shadow-lg">
                  <CardHeader className="flex flex-row items-center space-x-2">
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                      <CardTitle className="font-headline text-xl text-destructive">{getTranslation(locale, 'resultPageErrorLoadingTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p>{errorLoadingSongs}</p>
                      <p className="text-sm text-muted-foreground mt-2">{getTranslation(locale, 'resultPageErrorLoadingDesc')}</p>
                  </CardContent>
              </Card>
              ) : (!isLoadingSongs && best30SongsData.length === 0 && new20SongsData.length === 0) ? (
               <Card className="border-orange-500/50 shadow-lg">
                  <CardHeader className="flex flex-row items-center space-x-2">
                      <Info className="w-6 h-6 text-orange-500" />
                      <CardTitle className="font-headline text-xl text-orange-600">{getTranslation(locale, 'resultPageNoBest30Data')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p>{getTranslation(locale, 'resultPageErrorLoadingDesc')}</p>
                       <p className="text-sm mt-1">API 응답에 유효한 Best 30 또는 New 20 곡 데이터가 없습니다. Chunirec 데이터를 확인하거나 새로고침 해보세요.</p>
                  </CardContent>
              </Card>
            ) : (
              <>
                <TabsContent value="best30">
                    <Card>
                    <CardHeader>
                      <CardTitle className="font-headline text-2xl">{getTranslation(locale, 'resultPageCardTitleBest30')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {best30SongsData.length > 0 ? (
                                <div className={`grid gap-4 ${best30GridCols}`}>
                                    {best30SongsData.map((song) => (
                              <SongCard
                                            key={song.uniqueId}
                                song={song}
                                            onToggleExclude={() => toggleExcludeSongKey(song.uniqueId)}
                                            isExcluded={excludedSongKeys.includes(song.uniqueId)}
                                            locale={locale}
                              />
                                    ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">{getTranslation(locale, 'resultPageNoBest30Data')}</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="new20">
                      <Card>
                    <CardHeader>
                      <CardTitle className="font-headline text-2xl">{getTranslation(locale, 'resultPageCardTitleNew20')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {new20SongsData.length > 0 ? (
                                  <div className={`grid gap-4 ${best30GridCols}`}>
                                      {new20SongsData.map((song) => (
                                 <SongCard
                                              key={song.uniqueId}
                                   song={song}
                                              onToggleExclude={() => toggleExcludeSongKey(song.uniqueId)}
                                              isExcluded={excludedSongKeys.includes(song.uniqueId)}
                                              locale={locale}
                                 />
                                      ))}
                           </div>
                         ) : (
                           <p className="text-muted-foreground">{getTranslation(locale, 'resultPageNoNew20Data')}</p>
                         )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="combined">
                      <Card>
                    <CardHeader>
                      <CardTitle className="font-headline text-2xl">{getTranslation(locale, 'resultPageCardTitleCombined')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {combinedTopSongs.length > 0 ? (
                                  <div className={`grid gap-4 ${best30GridCols}`}>
                                      {combinedTopSongs.map((song) => (
                               <SongCard
                                              key={song.uniqueId}
                                 song={song}
                                              onToggleExclude={() => toggleExcludeSongKey(song.uniqueId)}
                                              isExcluded={excludedSongKeys.includes(song.uniqueId)}
                                              locale={locale}
                                              isCombinedView={true}
                               />
                                      ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">{getTranslation(locale, 'resultPageNoCombinedData')}</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
              )}
          </Tabs>
          </div>
        </div>
      </TooltipProvider>
    </main>
  );
}

export default function ResultPage() {
  const { locale } = useLanguage();
  return (
    <Suspense fallback={<div className="flex min-h-screen flex-col items-center justify-center text-xl"><Loader2 className="w-10 h-10 animate-spin mr-2" /> {getTranslation(locale, 'resultPageSuspenseFallback')}</div>}>
      <ResultContent />
    </Suspense>
  );
}

