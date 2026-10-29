// 앱 아이콘(tools/icons/<id>.svg — 앱 설치 파일과 같은 그림)을 사이트 카드·내려받기 표에 쓴다.
// 빌드 때 _astro/ 로 복사돼 해시 붙은 주소가 나온다(파일 하나 약 0.7 KB).
const files = import.meta.glob<string>("../../../tools/icons/*.svg", { query: "?url", import: "default", eager: true });

export const appIcon = (id: string): string | undefined => {
  const hit = Object.entries(files).find(([p]) => p.endsWith(`/${id}.svg`));
  return hit?.[1];
};
