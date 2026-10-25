// 애드센스 게시자 ID — 공개 값(모든 페이지의 소유 확인 meta·ads.txt·광고 코드가 쓴다). 빌드 변수 PUBLIC_ADSENSE_CLIENT 가 있으면 그쪽이 우선.
export const ADSENSE_CLIENT: string = import.meta.env.PUBLIC_ADSENSE_CLIENT || "ca-pub-2423716169041955";
