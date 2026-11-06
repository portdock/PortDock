//! 열린 캡처 하나에 대한 작업 묶음 — 파일·분석·해석·필터 적용.
//!
//! 분석(`Analysis`)은 필요할 때 한 번만 만든다(흐름 번호·재조립·요청/응답 짝이 필요한 필터나 해석을 처음 쓸 때).

use std::path::Path;
use std::sync::OnceLock;

use crate::analysis::Analysis;
use crate::capture::{Capture, CaptureError};
use crate::dissect::{Ctx, Dissection, Meta, Opts, Prefs, dissect_into};
use crate::filter::{Filter, FilterError};

pub struct Session {
    pub cap: Capture,
    pub prefs: Prefs,
    analysis: OnceLock<Analysis>,
}

impl Session {
    pub fn open(path: impl AsRef<Path>, prefs: Prefs) -> Result<Session, CaptureError> {
        Ok(Session::new(Capture::open(path)?, prefs))
    }

    pub fn new(cap: Capture, prefs: Prefs) -> Session {
        Session {
            cap,
            prefs,
            analysis: OnceLock::new(),
        }
    }

    /// 흐름 분석 — 처음 부를 때 만든다
    pub fn analysis(&self) -> &Analysis {
        self.analysis
            .get_or_init(|| Analysis::build(&self.cap, &self.prefs))
    }

    pub fn analysis_built(&self) -> bool {
        self.analysis.get().is_some()
    }

    /// 패킷(0 기준)의 해석에 필요한 바깥 정보
    pub fn meta(&self, i: usize) -> Meta {
        let p = &self.cap.packets[i];
        let ts = |k: usize| {
            self.cap
                .packets
                .get(k)
                .filter(|q| q.has_ts())
                .map(|q| q.ts_ns)
        };
        Meta {
            number: (i + 1) as u32,
            ts_ns: if p.has_ts() { p.ts_ns } else { 0 },
            has_ts: p.has_ts(),
            prev_ts_ns: if i > 0 { ts(i - 1) } else { None },
            first_ts_ns: ts(0),
            caplen: p.caplen,
            origlen: p.origlen,
            iface: p.iface,
        }
    }

    /// 패킷 하나 풀기. `with_analysis` 가 참이면 분석을 써서(필요하면 만들어서) 상대 번호·재조립·짝까지 푼다
    pub fn dissect(&self, i: usize, o: Opts, with_analysis: bool) -> Dissection {
        let mut d = Dissection::default();
        self.dissect_into(&mut d, i, o, with_analysis, None);
        d
    }

    pub fn dissect_into(
        &self,
        d: &mut Dissection,
        i: usize,
        o: Opts,
        with_analysis: bool,
        namer: Option<&dyn crate::devmap::RegisterNamer>,
    ) {
        let p = &self.cap.packets[i];
        let mut ctx = Ctx::basic(&self.prefs);
        if with_analysis {
            ctx = ctx.with_analysis(self.analysis(), &self.cap);
        }
        if let Some(n) = namer {
            ctx = ctx.with_namer(n);
        }
        dissect_into(d, self.cap.data(p), p.link, &self.meta(i), &ctx, o);
    }

    /// 필터에 맞는 패킷 번호들(0 기준). 필터가 쓰는 계층까지만 푼다
    pub fn apply(&self, f: &Filter) -> Vec<u32> {
        if f.is_all() {
            return (0..self.cap.len() as u32).collect();
        }
        let with = f.needs_analysis();
        let ctx = if with {
            Ctx::basic(&self.prefs).with_analysis(self.analysis(), &self.cap)
        } else {
            Ctx::basic(&self.prefs)
        };
        let o = Opts {
            depth: f.depth(),
            tree: false,
            columns: false,
            apps: f.apps(),
        };
        let mut d = Dissection::default();
        let mut out = Vec::new();
        for (i, p) in self.cap.packets.iter().enumerate() {
            let frame = self.cap.data(p);
            dissect_into(&mut d, frame, p.link, &self.meta(i), &ctx, o);
            if f.matches(&d, frame) {
                out.push(i as u32);
            }
        }
        out
    }

    /// 글로 된 필터를 컴파일해 적용
    pub fn apply_text(&self, src: &str) -> Result<Vec<u32>, FilterError> {
        Ok(self.apply(&Filter::parse(src)?))
    }
}
