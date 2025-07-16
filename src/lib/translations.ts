/**
 * @file translations.ts
 * @description 이 파일은 애플리케이션에서 사용되는 모든 텍스트의 번역을 관리합니다.
 * 새로운 텍스트를 추가할 때는 이 파일에 KR (한국어) 및 JP (일본어) 번역을 모두 포함해야 합니다.
 * 키 이름은 일관성을 위해 camelCase로 작성합니다.
 */

// 사용 가능한 로케일 정의
export type Locale = 'KR' | 'JP';

// 번역 객체
const translations = {
    // General
    homePageTitle: { KR: 'ChuniCalc', JP: 'ChuniCalc' },
    languageToggleKR: { KR: '한국어', JP: '韓国語' },
    languageToggleJP: { KR: '日本語', JP: '日本語' },

    // Form
    formTitle: { KR: '레이팅 정보 입력', JP: 'レーティング情報入力' },
    formDescription: { KR: 'Chunirec의 유저명과 현재 레이팅을 입력해주세요.', JP: 'Chunirecのユーザーネームと現在のレーティングを入力してください。' },
    nicknameLabel: { KR: '유저명', JP: 'ユーザーネーム' },
    nicknamePlaceholder: { KR: 'Chunirec 유저명', JP: 'Chunirec ユーザーネーム' },
    nicknameHelp: { KR: '레이팅 정보를 가져오려면 Chunirec 유저명이 필요합니다.', JP: 'レーティング情報を取得するにはChunirecのユーザーネームが必要です。' },
    fetchRatingButton: { KR: '레이팅 정보 가져오기', JP: 'レーティング情報を取得' },
    currentRatingLabel: { KR: '현재 레이팅', JP: '現在のレーティング' },
    currentRatingPlaceholder: { KR: '예: 17.03', JP: '例: 17.03' },
    targetRatingLabel: { KR: '목표 레이팅', JP: '目標レーティング' },
    targetRatingPlaceholder: { KR: '예: 17.10', JP: '例: 17.10' },
    calculateButton: { KR: '계산하기', JP: '計算する' },
    
    // Form Toasts
    toastErrorNicknameNeeded: { KR: '유저명을 입력해주세요.', JP: 'ユーザーネームを入力してください。' },
    toastErrorNicknameNeededDesc: { KR: 'Chunirec 유저명을 입력해야 레이팅 정보를 가져올 수 있습니다.', JP: 'Chunirecのユーザーネームを入力して、レーティング情報を取得してください。' },
    toastRatingRequired: { KR: '현재 레이팅을 입력해주세요.', JP: '現在のレーティングを入力してください。' },
    toastInvalidRating: { KR: '유효한 레이팅 값을 입력해주세요. (예: 17.03)', JP: '有効なレーティング値を入力してください。(例: 17.03)' },
    toastTargetRatingRequired: { KR: '목표 레이팅을 입력해주세요.', JP: '目標レーティングを入力してください。' },
    toastInvalidTargetRating: { KR: '유효한 목표 레이팅 값을 입력해주세요. (예: 17.10)', JP: '有効な目標レーティング値を入力してください。(例: 17.10)' },
    toastTargetRatingTooLow: { KR: '목표 레이팅은 현재 레이팅보다 높아야 합니다.', JP: '目標レーティングは現在のレーティングより高い必要があります。' },
    toastErrorUserNotFound: { KR: '사용자를 찾을 수 없습니다.', JP: 'ユーザーが見つかりません。' },
    toastErrorUserNotFoundDesc: { KR: '{0} 유저명의 사용자가 Chunirec에 존재하지 않습니다.', JP: '{0}というユーザーネームのユーザーがChunirecに存在しません。' },
    toastErrorAccessDenied: { KR: '접근이 거부되었습니다.', JP: 'アクセスが拒否されました。' },
    toastErrorAccessDeniedDesc: { KR: '{0} 사용자의 데이터는 비공개이거나 존재하지 않습니다. (오류 코드: {1})', JP: '{0}ユーザーのデータは非公開か、存在しません。(エラーコード: {1})' },
    toastErrorApiKeyNotSet: { KR: 'API 키가 설정되지 않았습니다.', JP: 'APIキーが設定されていません。' },
    toastErrorApiRequestFailed: { KR: 'API 요청 실패', JP: 'APIリクエスト失敗' },
    toastErrorApiRequestFailedDesc: { KR: 'API 요청 실패 (HTTP {0}): {1}', JP: 'APIリクエスト失敗 (HTTP {0}): {1}' },
    toastErrorApiLogicalError: { KR: 'API 로직 오류', JP: 'APIロジックエラー' },
    toastErrorApiLogicalErrorDesc: { KR: 'API 서버에서 오류가 발생했습니다: {0}', JP: 'APIサーバーでエラーが発生しました: {0}' },
    toastSuccessRatingFetched: { KR: '레이팅 정보 로딩 성공', JP: 'レーティング情報ロード成功' },
    toastSuccessRatingFetchedDesc: { KR: '{0}님의 현재 레이팅은 {1}입니다.', JP: '{0}さんの現在のレーティングは{1}です。' },
    toastErrorInvalidRatingData: { KR: '잘못된 레이팅 데이터', JP: '不正なレーティングデータ' },
    toastErrorInvalidRatingDataDesc: { KR: '서버에서 받은 레이팅 데이터가 올바르지 않습니다.', JP: 'サーバーから受信したレーティングデータが正しくありません。' },
    toastErrorRatingFetchFailed: { KR: '레이팅 정보 로딩 실패', JP: 'レーティング情報ロード失敗' },
    toastErrorRatingFetchFailedDesc: { KR: '오류: {0}', JP: 'エラー: {0}' },
    toastErrorMissingInfo: { KR: '정보 부족', JP: '情報不足' },
    toastErrorMissingInfoDesc: { KR: '유저명과 현재 레이팅을 모두 입력해야 합니다.', JP: 'ユーザーネームと現在のレーティングを両方入力する必要があります。' },
    toastErrorInvalidInput: { KR: '잘못된 입력', JP: '不正な入力' },
    toastErrorInvalidInputDesc: { KR: '입력값이 올바르지 않습니다. 숫자만 입력해주세요.', JP: '入力値が正しくありません。数字のみ入力してください。' },
    toastErrorRatingInvalidStep: { KR: '현재 레이팅은 0.01 단위로 입력해야 합니다.', JP: '現在のレーティングは0.01単位で入力してください。' },
    toastErrorCurrentRatingTooLow: { KR: '현재 레이팅은 {0}보다 작을 수 없습니다.', JP: '現在のレーティングは{0}より小さくすることはできません。' },
    toastErrorCurrentRatingTooHighForm: { KR: '현재 레이팅은 {0}을 초과할 수 없습니다.', JP: '現在のレーティングは{0}を超えることはできません。' },
    toastErrorCurrentRatingTooHigh: { KR: '현재 레이팅이 너무 높습니다.', JP: '現在のレーティングが高すぎます。' },
    toastErrorCurrentRatingTooHighDesc: { KR: '현재 레이팅이 최고 레이팅보다 높게 설정되었습니다.', JP: '現在のレーティングが最高レーティングより高く設定されています。' },
    
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
    resultPageErrorLoadingDesc: { KR: '데이터를 가져오는 중 오류가 발생했습니다. 유저명이 올바른지, API 서버가 정상인지 확인 후 다시 시도해주세요.', JP: 'データの取得中にエラーが発生しました。ユーザーネームが正しいか、APIサーバーが正常か確認後、再試行してください。' },
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
    tooltipChunirecNicknameContent: { KR: 'Chunirec에 등록된 유저명을 정확히 입력해주세요.', JP: 'Chunirecに登録されたユーザーネームを正確に入力してください。' },
    tooltipResultTabsContent: { KR: 'Best 30, New 20, 그리고 두 목록을 합쳐 레이팅 순으로 정렬한 결과를 볼 수 있습니다.', JP: 'Best 30, New 20, そして両リストを合わせてレーティング順にソートした結果を見ることができます。' },
    tooltipSimulationSearchContent: { KR: '검색창을 통해 시뮬레이션에 추가할 곡을 찾을 수 있습니다.', JP: '検索ボックスでシミュレーションに追加する曲を検索できます。' },
    tooltipLocalApiKeyContent: { KR: 'Chunirec 서버에 직접 요청을 보내려면 개인 API 키가 필요합니다. 로컬에만 저장되며 외부로 전송되지 않습니다.', JP: 'Chunirecサーバーに直接リクエストを送信するには、個人APIキーが必要です。ローカルにのみ保存され、外部には送信されません。' },
    
    // Advanced Settings
    advancedSettingsTitle: { KR: '고급 설정', JP: '詳細設定' },
    advancedSettingsDesc: { KR: '개발자 도구 및 데이터 관리 등 고급 기능을 설정합니다.', JP: '開発者ツールやデータ管理など、高度な機能設定を行います。' },
    calculationStrategyLabel: { KR: '계산 전략', JP: '計算戦略' },
    strategyB30Focus: { KR: 'Best 30 집중', JP: 'Best 30 集中' },
    strategyN20Focus: { KR: 'New 20 집중', JP: 'New 20 集中' },
    strategyHybridFloor: { KR: '하이브리드 (Floor)', JP: 'ハイブリッド (Floor)' },
    strategyHybridPeak: { KR: '하이브리드 (Peak)', JP: 'ハイブリッド (Peak)' },
    strategyNone: { KR: '선택 안함', JP: '選択しない' },
    localApiKeyLabel: { KR: '로컬 API 키', JP: 'ローカルAPIキー' },
    localApiKeyPlaceholder: { KR: '개인 API 키 입력', JP: '個人APIキーを入力' },
    saveApiKeyButton: { KR: 'API 키 저장', JP: 'APIキーを保存' },
    localApiKeyHelpUpdated: { KR: '마지막 업데이트: {0}', JP: '最終更新: {0}' },
    contactInfoLabel: { KR: '문의 및 버그 리포트', JP: 'お問い合わせ＆バグレポート' },
    contactInfoBugReport: { KR: '버그 및 개선사항은 X(트위터)로 연락주세요:', JP: 'バグや改善点はX(Twitter)までご連絡ください:' },
    appVersion: { KR: '앱 버전: {0}', JP: 'アプリバージョン: {0}' },
    adminNameLabel: { KR: '관리자 이름', JP: '管理者名' },
    adminNamePlaceholder: { KR: '관리자 이름 입력', JP: '管理者名を入力' },
    adminPasswordLabel: { KR: '관리자 비밀번호', JP: '管理者パスワード' },
    adminPasswordPlaceholder: { KR: '관리자 비밀번호 입력', JP: '管理者パスワードを入力' },
    authenticateButton: { KR: '인증', JP: '認証' },
    developerSectionTitle: { KR: '개발자 도구', JP: '開発者ツール' },
    developerToolsToggleHide: { KR: '개발자 도구 숨기기', JP: '開発者ツールを隠す' },
    developerToolsToggleShow: { KR: '개발자 도구 보이기', JP: '開発者ツールを表示' },
    goToApiTestPageButton: { KR: 'API 테스트 페이지로 이동', JP: 'APIテストページへ移動' },
    goToSimulationTestPageButton: { KR: '시뮬레이션 테스트 페이지로 이동', JP: 'シミュレーションテストページへ移動' },
    manualCachingLabel: { KR: '수동 캐싱', JP: '手動キャッシング' },
    cacheGlobalMusicButton: { KR: '전체 악곡 정보 캐싱', JP: '全楽曲情報キャッシング' },
    cacheUserNicknameLabel: { KR: '캐싱할 유저 유저명', JP: 'キャッシュするユーザー名' },
    cacheUserNicknamePlaceholder: { KR: 'Chunirec 유저명', JP: 'Chunirec ユーザーネーム' },
    cacheUserRecordsButton: { KR: '사용자 기록 캐싱', JP: 'ユーザー記録をキャッシュ' },
    deleteSpecificUserDataLabel: { KR: '특정 사용자 데이터 삭제', JP: '特定ユーザーデータ削除' },
    deleteSpecificUserDataDesc: { KR: '입력한 유저명의 캐시된 기록만 삭제합니다.', JP: '入力されたユーザーネームのキャッシュ記録のみ削除します。' },
    deleteUserNicknameLabel: { KR: '삭제할 유저 유저명', JP: '削除するユーザー名' },
    deleteUserNicknamePlaceholder: { KR: 'Chunirec 유저명', JP: 'Chunirec ユーザーネーム' },
    deleteUserDataButton: { KR: '사용자 데이터 삭제', JP: 'ユーザーデータを削除' },
    clearLocalDataButton: { KR: '모든 로컬 데이터 삭제', JP: '全ローカルデータ削除' },
    clearLocalDataHelp: { KR: '캐싱된 모든 악곡 정보 및 사용자 기록을 삭제합니다.', JP: 'キャッシュされた全ての楽曲情報及びユーザー記録を削除します。' },
    developerModeActiveMessage: { KR: '개발자 모드가 활성화되었습니다.', JP: '開発者モードが有効になりました。' },

    // Advanced Settings Toasts
    toastSuccessLocalApiKeyRemoved: { KR: 'API 키가 로컬 저장소에서 삭제되었습니다.', JP: 'APIキーがローカルストレージから削除されました。' },
    toastSuccessLocalApiKeyRemovedDesc: { KR: '이제부터는 공개 API를 사용합니다.', JP: 'これからは公開APIを使用します。' },
    toastSuccessLocalApiKeySaved: { KR: 'API 키가 로컬에 저장되었습니다.', JP: 'APIキーがローカルに保存されました。' },
    toastSuccessLocalApiKeySavedDesc: { KR: '이제부터는 개인 API 키를 사용하여 요청합니다.', JP: 'これからは個人APIキーを使用してリクエストします。' },
    authenticationSuccessToast: { KR: '관리자 인증에 성공했습니다.', JP: '管理者認証に成功しました。' },
    authenticationFailedToast: { KR: '관리자 인증에 실패했습니다.', JP: '管理者認証に失敗しました。' },
    toastSuccessLocalDataCleared: { KR: '로컬 캐시 데이터가 삭제되었습니다.', JP: 'ローカルキャッシュデータが削除されました。' },
    toastSuccessLocalDataClearedDesc: { KR: '{0}개의 캐시 항목이 삭제되었습니다.', JP: '{0}個のキャッシュ項目が削除されました。' },
    toastErrorNicknameToDeleteNeeded: { KR: '삭제할 사용자의 유저명을 입력해주세요.', JP: '削除するユーザーのユーザーネームを入力してください。' },
    toastErrorNicknameToDeleteNeededDesc: { KR: '정확한 유저명을 입력해야 해당 사용자의 데이터를 삭제할 수 있습니다.', JP: '正確なユーザーネームを入力すると、そのユーザーのデータを削除できます。' },
    toastSuccessUserDataDeleted: { KR: '사용자 데이터가 삭제되었습니다.', JP: 'ユーザーデータが削除されました。' },
    toastSuccessUserDataDeletedDesc: { KR: '{0}님의 데이터 중 {1}개의 항목이 삭제되었습니다.', JP: '{0}さんのデータの中から{1}個の項目が削除されました。' },
    toastInfoNoUserDataFound: { KR: '삭제할 사용자 데이터가 없습니다.', JP: '削除するユーザーデータがありません。' },
    toastInfoNoUserDataFoundDesc: { KR: '{0}님의 캐시된 데이터를 찾을 수 없습니다.', JP: '{0}さんのキャッシュされたデータが見つかりません。' },
    toastInfoCachingStarted: { KR: '캐싱 시작됨', JP: 'キャッシング開始' },
    toastInfoCachingStartedDesc: { KR: '{0} 데이터 캐싱을 시작합니다.', JP: 'データのキャッシングを開始します。' },
    toastSuccessGlobalMusicCached: { KR: '전체 악곡 정보 캐싱 성공', JP: '全楽曲情報キャッシング成功' },
    toastSuccessGlobalMusicCachedDesc: { KR: '이제 모든 악곡 정보를 로컬에서 바로 읽어옵니다.', JP: 'これから全ての楽曲情報をローカルから直接読み込みます。' },
    toastErrorGlobalMusicCacheFailed: { KR: '전체 악곡 정보 캐싱 실패', JP: '全楽曲情報キャッシング失敗' },
    toastErrorGlobalMusicCacheFailedDesc: { KR: '오류: {0}', JP: 'エラー: {0}' },
    toastSuccessUserRecordsCached: { KR: '사용자 기록 캐싱 성공', JP: 'ユーザー記録のキャッシング成功' },
    toastSuccessUserRecordsCachedDesc: { KR: '{0}님의 플레이 기록을 성공적으로 캐싱했습니다.', JP: '{0}さんのプレイ記録を正常にキャッシングしました。' },
    toastErrorUserRecordsCacheFailed: { KR: '사용자 기록 캐싱 실패', JP: 'ユーザー記録のキャッシング失敗' },
    toastErrorUserRecordsCacheFailedDesc: { KR: '사용자 기록 캐싱 실패: {0}', JP: 'ユーザー記録のキャッシング失敗: {0}' },
    
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

/**
 * 로케일과 키에 해당하는 번역 문자열을 반환합니다.
 * @param locale - 대상 로케일 ('KR' 또는 'JP').
 * @param key - 번역할 메시지의 키.
 * @returns 번역된 문자열. 키를 찾지 못하면 키 자체를 반환합니다.
 */
export function getTranslation(locale: Locale, key: MessageKey): string {
    const entry = translations[key];
    if (!entry) {
        console.warn(`Translation key "${key}" not found.`);
        return String(key);
    }
    
    // 로케일에 맞는 번역이 있는지 확인
    if (typeof entry === 'object' && (entry as any)[locale]) {
        return (entry as any)[locale];
    }

    // 개발 중 잘못된 구조에 대한 폴백 처리
    if (typeof entry === 'object' && (entry as any).KR) {
        return (entry as any).KR;
    }
    
    console.warn(`Translation for key "${key}" and locale "${locale}" is not a valid structure.`);
    return String(key);
}