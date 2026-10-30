# 장비 Modbus 레지스터 맵 (data/devices)

국산 산업 장비(인버터·온도 조절기·전력 미터 등)의 Modbus 레지스터 맵을 장비 하나에 JSON 파일 하나로 모았습니다.
PortDock Modbus Master 의 «장비 프로필…», Modbus Slave 의 «장비 흉내…», 홈페이지 `/devices/` 가 이 파일들을 빌드 때 그대로 읽습니다.

> **사실 정보만 담았습니다.** 주소·형식·단위·배율·읽기/쓰기·함수 코드는 제조사가 공개한 매뉴얼에서 직접 확인한 것만 넣었고, 장비마다 문서 이름·판·쪽과 확인일(`sources`)을 붙였습니다. 매뉴얼 문장은 옮기지 않았습니다.
> **제조사와 관계없는 비공식 자료입니다.** 펌웨어·형번에 따라 다를 수 있으니 **쓰기(운전 명령·설정 변경) 전에 반드시 장비 매뉴얼로 확인**하세요. 틀린 곳은 GitHub 이슈로 알려 주세요(쪽 번호와 함께).

## 라이선스
이 폴더의 데이터(`*.json`)는 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 입니다(전문: [LICENSE](LICENSE)). PortDock 프로그램의 GPL-3.0 과 별개입니다.
쓰실 때 «PortDock device register maps, vYYYY.MM, https://portdock.dev/devices/» 처럼 판과 함께 출처를 밝혀 주세요(판·인용 문구는 [portdock.dev/data](https://portdock.dev/data/) 에 늘 최신으로). 제조사 이름·모델 이름은 각 회사의 상표입니다.

## 파일
- `schema.json` — JSON Schema(형식 설명). 모든 장비 파일이 따른다.
- `<제조사>/<모델>.json` — 장비 하나. `id` 는 «제조사/모델» 이고 파일 경로와 같다.

## 형식 요약
| 키 | 뜻 |
|---|---|
| `comm` | 공장 출하 통신 값(`baud`·`dataBits`·`parity`·`stopBits`·`unit`) — 매뉴얼에서 확인한 것만. `addressing` 은 매뉴얼이 주소를 적는 방식(`zero` 통신 주소 그대로 · `one` 1 기준 · `plc` 40001 꼴) |
| `registers[].table` | `holding-registers`·`input-registers`·`coils`·`discrete-inputs` — PortDock CSV 의 table 칸과 같다 |
| `registers[].address` | **통신선 주소(0 기준)**. 매뉴얼 표기는 `manualAddress` 에 그대로 |
| `registers[].type`·`order` | `u16`·`s16`·`u32`·`s32`·`f32`·`f64`·`string`(+`len`)·`bit`, 순서 `ABCD`(빅 엔디언)·`CDAB`(워드 바꿈)·`BADC`·`DCBA` — PortDock 과 같은 이름 |
| `scale`·`unit` | 실제 값 = 원시 값 × `scale` (예 0.01 Hz 단위면 `scale: 0.01`, `unit: "Hz"`) |
| `access`·`fc` | `r`·`rw`·`w` 와 매뉴얼이 허용한 함수 코드 |
| `values`·`bits`·`range` | 값의 뜻, 비트별 뜻(0 = 최하위), 허용 범위(단위가 붙은 실제 값) |
| `ref`·`source` | 근거 쪽·표(필수), `sources` 의 몇 번째 문서인지 |
| `sources[]` | 문서 이름·판(`edition`)·쪽(`pages`)·주소·확인일(`checked`) — 모두 필수 |

PortDock CSV(`table,address,type,order,name,value`)로는 `table`·`address`·`type`·`order`·`name.ko` 를 그대로 옮기면 됩니다.

### modbus-schema 로 내보내기
[nielsbasjes/modbus-schema](https://github.com/nielsbasjes/modbus-schema)(Apache-2.0)의 «이름 붙은 정확한 주소»(`hr:5`, 0 기준)와 같은 주소 체계라 바로 바꿀 수 있습니다.
```
node tools/devices-check.mjs --modbus-schema ls-electric/ig5a > ig5a.yaml
```
(`BADC`·`DCBA` 처럼 바이트를 바꾸는 순서는 건너뛰고 주석으로 남깁니다.)

## 한 번에 받기
데이터 묶음 쪽 [portdock.dev/data](https://portdock.dev/data/) — 판(`vYYYY.MM` = 가장 늦은 확인일의 달)·내용 해시·파일·칸 설명·인용 방법·바뀐 점. 모두 빌드 때 이 폴더에서 만든다(`site/src/lib/dataRelease.ts`), 손으로 매기는 판 번호는 없다.
- 사이트: [version.json](https://portdock.dev/data/version.json)(판·해시·바뀐 점) · [schema.json](https://portdock.dev/data/schema.json)(all.json 스키마) · [all.json](https://portdock.dev/devices/all.json)(전체) · [registers.csv](https://portdock.dev/devices/registers.csv)(레지스터 한 줄씩) · [llms-full.txt](https://portdock.dev/llms-full.txt)(AI 용 요약 — 장비별 전체 표는 `/devices/<제조사>/<모델>.md`)
- 데이터셋 묶음(Hugging Face·Kaggle 용 README·CSV·JSONL·LICENSE): `node tools/devices-export.mjs [출력 폴더]`

## 새 장비 넣기
1. 제조사 공식 매뉴얼 PDF 를 직접 열어 확인한다. 블로그·대리점 요약·기억은 근거로 쓰지 않는다. 확인 못 한 항목은 넣지 않는다.
2. 매뉴얼이 적은 주소가 통신 주소(0 기준)인지 1 기준(40001)인지 매뉴얼의 프레임 예시로 확인하고, `address` 는 늘 0 기준으로 적는다.
3. 매뉴얼 문장을 옮기지 말고 사실(주소·이름·단위·배율·R/W·함수 코드·값 뜻)만 짧게 한·영으로.
4. `node tools/devices-check.mjs` — 스키마, 주소 중복·형식별 칸 수 겹침, 표·함수 코드·읽기/쓰기 짝, 출처를 본다(CI 에서도 돈다).
