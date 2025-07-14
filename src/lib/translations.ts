
export type Locale = 'KR' | 'JP';

const translations = {
    // General
    homePageTitle: { KR: '추니즘 레이팅 계산기', JP: 'チュウニズムレーティング計算機' },
    languageToggleKR: { KR: '한국어', JP: '韓国語' },
    languageToggleJP: { KR: '日本語', JP: '日本語' },

    // Form
    formTitle: { KR: '레이팅 정보 입력', JP: 'レーティング情報入力' },
    formDescription: { KR: 'Chunirec의 닉네임과 현재 레이팅을 입력해주세요.', JP: 'Chunirecのニックネームと現在のレーティングを入力してください。' },
    nicknameLabel: { KR: '닉네임', JP: 'ニックネーム' },
    nicknamePlaceholder: { KR: 'Chunirec 닉네임', JP: 'Chunirec ニックネーム' },
    fetchRatingButton: { KR: '레이팅 정보 가져오기', JP: 'レーティング情報を取得' },
    currentRatingLabel: { KR: '현재 레이팅', JP: '現在のレーティング' },
    currentRatingPlaceholder: { KR: '예: 17.03', JP: '例: 17.03' },
    targetRatingLabel: { KR: '목표 레이팅', JP: '目標レーティング' },
    targetRatingPlaceholder: { KR: '예: 17.10', JP: '例: 17.10' },
    submitButton: { KR: '결과 보기', JP: '結果を見る' },
    
    // Form Toasts
    toastNicknameRequired: { KR: '닉네임을 입력해주세요.', JP: 'ニックネームを入力してください。' },
    toastRatingRequired: { KR: '현재 레이팅을 입력해주세요.', JP: '現在のレーティングを入力してください。' },
    toastInvalidRating: { KR: '유효한 레이팅 값을 입력해주세요. (예: 17.03)', JP: '有効なレーティング値を入力してください。(例: 17.03)' },
    toastTargetRatingRequired: { KR: '목표 레이팅을 입력해주세요.', JP: '目標レーティングを入力してください。' },
    toastInvalidTargetRating: { KR: '유효한 목표 레이팅 값을 입력해주세요. (예: 17.10)', JP: '有効な目標レーティング値を入力してください。(例: 17.10)' },
    toastTargetRatingTooLow: { KR: '목표 레이팅은 현재 레이팅보다 높아야 합니다.', JP: '目標レーティングは現在のレーティングより高い必要があります。' },
    
    // Result Page
    resultPageDefaultPlayerName: { KR: '플레이어', JP: 'プレイヤー' },
    resultPageNotAvailable: { KR: 'N/A', JP: 'N/A' },
    resultPageButtonBackToCalc: { KR: '계산기로 돌아가기', JP: '計算機に戻る' },
    resultPageHeaderCurrent: { KR: '현재', JP: '現在' },
    
    resultPageSyncStatusChecking: { KR: '캐시 확인 중...', JP: 'キャッシュ確認中...' },
    resultPageSyncStatusNoCache: { KR: '새로고침 정보 없음', JP: 'リフレッシュ情報なし' },
    resultPageSyncStatus: { KR: '{0}에 마지막으로 새로고침됨', JP: '{0}に最終更新' },
    
    resultPageRefreshButton: { KR: '데이터 새로고침', JP: 'データ更新' },
    resultPageToastRefreshingDataTitle: { KR: '데이터 새로고침', JP: 'データ更新' },
    resultPageToastSWRRefreshDesc: { KR: '최신 정보를 서버에서 다시 가져옵니다.', JP: '最新情報をサーバーから再取得します。' },
    
    resultPageLoadingSongsTitle: { KR: '데이터 로딩 중...', JP: 'データ読み込み中...' },
    resultPageLoadingCacheCheck: { KR: '캐시된 데이터를 확인하고 있습니다...', JP: 'キャッシュされたデータを確認しています...' },
    resultPageLoadingApiFetch: { KR: 'API로부터 최신 플레이 데이터를 가져오고 있습니다...', JP: 'APIから最新のプレイデータを取得しています...' },
    resultPageLoadingDataStateCheck: { KR: '데이터 상태 확인 중...', JP: 'データ状態確認中...' },

    resultPageErrorLoadingTitle: { KR: '데이터 로딩 오류', JP: 'データ読み込みエラー' },
    resultPageErrorLoadingDesc: { KR: '데이터를 가져오는 중 오류가 발생했습니다. 닉네임이 올바른지, API 서버가 정상인지 확인 후 다시 시도해주세요.', JP: 'データの取得中にエラーが発生しました。ニックネームが正しいか、APIサーバーが正常か確認後、再試行してください。' },
    resultPageNoBest30Data: { KR: 'Best 30 기록이 없습니다.', JP: 'Best 30の記録がありません。' },
    resultPageNoNew20Data: { KR: 'New 20 기록이 없습니다.', JP: 'New 20の記録がありません。' },
    resultPageNoCombinedData: { KR: '표시할 곡 데이터가 없습니다.', JP: '表示する曲データがありません。' },

    resultPageCardTitleBest30: { KR: 'Best 30', JP: 'Best 30' },
    resultPageCardTitleNew20: { KR: 'New 20', JP: 'New 20' },
    resultPageCardTitleCombined: { KR: '상위 50곡 통합', JP: '上位50曲統合' },

    resultPageTabBest30: { KR: 'Best 30', JP: 'Best 30' },
    resultPageTabNew20: { KR: 'New 20', JP: 'New 20' },
    resultPageTabCombined: { KR: '통합', JP: '統合' },
    
    // Song Card
    songCardScoreLabel: { KR: '점수', JP: 'スコア' },
    songCardRatingLabel: { KR: '레이팅', JP: 'レーティング' },
    songCardTargetScoreLabel: { KR: '목표 점수', JP: '目標スコア' },
    songCardTargetRatingLabel: { KR: '목표 레이팅', JP: '目標レーティング' },
    songCardExcluded: { KR: '제외됨', JP: '除外済み' },
    
    // Tooltips
    tooltipResultTabsContent: { KR: 'Best 30, New 20, 그리고 두 목록을 합쳐 레이팅 순으로 정렬한 결과를 볼 수 있습니다.', JP: 'Best 30, New 20, そして両リストを合わせてレーティング順にソートした結果を見ることができます。' },
    tooltipSimulationSearchContent: { KR: '검색창을 통해 시뮬레이션에 추가할 곡을 찾을 수 있습니다.', JP: '検索ボックスでシミュレーションに追加する曲を検索できます。' },
    
    // Advanced Settings
    advancedSettingsTitle: { KR: '고급 설정', JP: '詳細設定' },
    calculationStrategyLabel: { KR: '계산 전략', JP: '計算戦略' },
    strategyB30Focus: { KR: 'Best 30 집중', JP: 'Best 30 集中' },
    strategyN20Focus: { KR: 'New 20 집중', JP: 'New 20 集中' },
    strategyHybridFloor: { KR: '하이브리드 (Floor)', JP: 'ハイブリッド (Floor)' },
    strategyHybridPeak: { KR: '하이브리드 (Peak)', JP: 'ハイブリッド (Peak)' },
    strategyNone: { KR: '선택 안함', JP: '選択しない' },
    
    // Simulation Logic & Status
    resultPageLogSimulationStarting: { KR: '시뮬레이션을 시작합니다...', JP: 'シミュレーションを開始します...' },
    resultPageTargetReachedFmt: { KR: '목표 달성! 최종 레이팅: {0} (B30: {1}, N20: {2})', JP: '目標達成！最終レーティング: {0} (B30: {1}, N20: {2})' },
    resultPageStuckBothBaseFmt: { KR: '더 이상 레이팅을 올릴 수 없습니다. 현재: {0}.', JP: 'これ以上レーティングを上げることはできません。現在: {0}.' },
    resultPageDetailRatingsAvgFmt: { KR: ' (B30 평균: {0}, N20 평균: {1})', JP: ' (B30平均: {0}, N20平均: {1})' },
    
    reachableRatingB30OnlyMessage: { KR: 'B30 곡만으로는 목표 레이팅에 도달할 수 없습니다. 최대 예상 레이팅: {0}', JP: 'B30の曲だけでは目標レーティングに到達できません。最大予想レーティング: {0}' },
    reachableRatingN20OnlyMessage: { KR: 'NEW SONG만으로는 목표 레이팅에 도달할 수 없습니다. 최대 예상 레이팅: {0}', JP: 'NEW SONGだけでは目標レーティングに到達できません。最大予想レーティング: {0}' },
    
    resultPageErrorSimulationGeneric: { KR: '시뮬레이션 중 오류가 발생했습니다: {0}', JP: 'シミュレーション中にエラーが発生しました: {0}' },
    
    // Custom Simulation
    simulationSearchTitle: { KR: "시뮬레이션 대상 악곡 검색", JP: "シミュレーション対象楽曲検索" },
    simulationSearchPlaceholder: { KR: "악곡 제목 검색...", JP: "楽曲名を検索..." },
    simulationTargetSongsTitle: { KR: "시뮬레이션 대상 악곡", JP: "シミュレーション対象楽曲" },
    simulationTargetSongsPlaceholder: { KR: "검색을 통해 시뮬레이션에 포함할 곡을 추가하세요.", JP: "検索してシミュレーションに含める曲を追加してください。" },
    startSimulationButton: { KR: "시뮬레이션 시작", JP: "シミュレーション開始" },
    b30TargetPoolTitle: { KR: "B30 대상 풀", JP: "B30対象プール" },
    n20TargetPoolTitle: { KR: "NEW SONG 대상 풀", JP: "NEW SONG対象プール" },
    noB30TargetPool: { KR: "B30에 추가할 곡이 없습니다.", JP: "B30に追加する曲がありません。" },
    noN20TargetPool: { KR: "NEW SONG에 추가할 곡이 없습니다.", JP: "NEW SONGに追加する曲がありません。" },
    unreachableRatingCustomMessage: { KR: "목표 레이팅까지 약 {0}이(가) 부족합니다.", JP: "目標レートまで約{0}が不足しています。" },
    
    // Fallback
    resultPageSuspenseFallback: { KR: "결과 페이지 로딩 중...", JP: "結果ページを読み込み中..." },
};


export type MessageKey = keyof typeof translations;

export function getTranslation(locale: Locale, key: MessageKey): string {
    const entry = translations[key];
    if (!entry) {
        console.warn(`Translation key "${key}" not found.`);
        return String(key);
    }
    
    if (typeof entry === 'object' && (entry as any)[locale]) {
        return (entry as any)[locale];
    }

    // Fallback for incorrectly structured data during development
    if (typeof entry === 'object' && (entry as any).KR) {
      return (entry as any).KR;
    }
    
    console.warn(`Translation for key "${key}" and locale "${locale}" is not a valid structure.`);
    return String(key);
}
