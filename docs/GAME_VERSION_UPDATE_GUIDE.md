# 🎮 CHUNITHM Calculator 2 - 게임 버전 업데이트 가이드

## 📋 신곡 목록 업데이트 방법

게임이 업데이트되고 새로운 곡이 추가될 때마다 다음 단계를 따라주세요:

### 1️⃣ 데이터 파일 업데이트
```
src/data/NewSongs.json
```
위 파일에 새로운 신곡 목록을 추가하거나 기존 목록을 수정합니다.

### 2️⃣ 버전 설정 변경
```typescript
// src/hooks/useChuniResultData.ts 파일에서
const NEW_SONGS_VERSION_KEY: NewSongsVersionKey = 'xverse' as const;
```

**사용 가능한 값:**
- `'verse'`: 기본 신곡 목록
- `'xverse'`: 확장 신곡 목록 (현재 사용 중)
- 새로운 버전 키가 NewSongs.json에 추가되면 해당 키 사용 가능

### 3️⃣ 적용 범위
이 설정을 변경하면 다음 기능들이 자동으로 새로운 신곡 목록을 참조합니다:
- 🎵 New 20 곡 계산
- 📊 레이팅 시뮬레이션
- 🔄 Worker 프로세스
- 📈 사전 계산 로직

### 4️⃣ 타입 안전성
TypeScript가 자동으로 유효한 키만 허용하므로, 잘못된 키를 입력하면 컴파일 에러가 발생합니다.

---

## 🚀 배포 전 체크리스트
- [ ] NewSongs.json 파일이 올바른 형식인지 확인
- [ ] NEW_SONGS_VERSION_KEY가 올바른 키를 참조하는지 확인
- [ ] TypeScript 컴파일 에러가 없는지 확인
- [ ] 테스트 환경에서 신곡 목록이 올바르게 로드되는지 확인

---

## 📝 참고사항
- 이 설정은 앱 전체의 신곡 필터링에 영향을 미칩니다
- 변경 후에는 반드시 전체 테스트를 수행해주세요
- 기존 사용자 데이터는 영향받지 않습니다
