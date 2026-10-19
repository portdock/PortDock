//! 열린 세션 보관함 — 모든 프로그램 공통.
//! - 여는 동안(블루투스 COM 은 수 초)에는 잠금을 쥐지 않는다 → 화면이 멈추지 않는다
//! - 같은 이름을 여는 중이거나 열려 있으면 거절 → 시작 연타로 유령 세션이 생기지 않는다
//! - 세션이 스스로 닫히면(자동 재연결 꺼짐 + 장치 뽑힘, 접속 실패) 세대 번호가 같을 때만 지운다
//!   → 닫힌 뒤 새로 연 같은 이름의 세션을 지우지 않는다

use crate::event::{EventSink, SessionEvent};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicU64, Ordering};

pub struct Registry<T> {
    open: Mutex<HashMap<String, (u64, T)>>,
    opening: Mutex<HashSet<String>>,
    next: AtomicU64,
}

impl<T> Default for Registry<T> {
    fn default() -> Self {
        Self { open: Mutex::new(HashMap::new()), opening: Mutex::new(HashSet::new()), next: AtomicU64::new(1) }
    }
}

/// 여는 중 표시. `finish` 하지 않고 버려지면(열기 실패) 표시를 지운다.
pub struct Opening<'a, T> {
    reg: &'a Registry<T>,
    id: String,
    pub generation: u64,
    done: bool,
}

impl<T> Opening<'_, T> {
    pub fn finish(mut self, value: T) {
        self.reg.open.lock().unwrap().insert(self.id.clone(), (self.generation, value));
        self.reg.opening.lock().unwrap().remove(&self.id);
        self.done = true;
    }
}

impl<T> Drop for Opening<'_, T> {
    fn drop(&mut self) {
        if !self.done {
            self.reg.opening.lock().unwrap().remove(&self.id);
        }
    }
}

impl<T> Registry<T> {
    pub fn begin(&self, id: &str) -> Result<Opening<'_, T>, String> {
        let open = self.open.lock().unwrap();
        let mut opening = self.opening.lock().unwrap();
        if open.contains_key(id) {
            return Err(crate::tr!(format!("{id} 는 이미 열려 있습니다"), format!("{id} is already open")));
        }
        if !opening.insert(id.to_string()) {
            return Err(crate::tr!(format!("{id} 를 여는 중입니다"), format!("{id} is being opened")));
        }
        Ok(Opening { reg: self, id: id.to_string(), generation: self.next.fetch_add(1, Ordering::SeqCst), done: false })
    }

    /// 사용자가 닫을 때
    pub fn take(&self, id: &str) -> Option<T> {
        self.open.lock().unwrap().remove(id).map(|(_, v)| v)
    }

    /// 세션이 스스로 닫혔을 때 — 같은 세대일 때만
    pub fn remove_if(&self, id: &str, generation: u64) -> Option<T> {
        let mut open = self.open.lock().unwrap();
        if open.get(id).is_some_and(|(g, _)| *g == generation) {
            return open.remove(id).map(|(_, v)| v);
        }
        None
    }

    pub fn with<R>(&self, id: &str, f: impl FnOnce(&T) -> R) -> Result<R, String> {
        let open = self.open.lock().unwrap();
        open.get(id).map(|(_, v)| f(v)).ok_or_else(|| crate::tr!("열려 있지 않습니다", "Not open").to_string())
    }

    pub fn ids(&self) -> Vec<String> {
        self.open.lock().unwrap().keys().cloned().collect()
    }
}

/// 화면으로 사건을 넘기다가 «closed» 가 오면 보관함에서 그 세션(같은 세대)을 지우는 통로
pub fn auto_remove_sink<T: Send + 'static>(
    reg: Arc<Registry<T>>,
    id: String,
    generation: u64,
    forward: impl Fn(SessionEvent) + Send + Sync + 'static,
) -> EventSink {
    EventSink::new(move |e| {
        let closed = matches!(&e, SessionEvent::Status { state: "closed", .. });
        forward(e);
        if closed {
            drop(reg.remove_if(&id, generation));
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn begin_finish_take() {
        let r: Registry<u32> = Registry::default();
        let o = r.begin("COM3").unwrap();
        assert!(r.begin("COM3").err().unwrap().contains("여는 중"));
        o.finish(7);
        assert!(r.begin("COM3").err().unwrap().contains("이미 열려"));
        assert_eq!(r.with("COM3", |v| *v).unwrap(), 7);
        assert_eq!(r.take("COM3"), Some(7));
        assert!(r.begin("COM3").is_ok());
    }

    #[test]
    fn failed_open_clears_mark() {
        let r: Registry<u32> = Registry::default();
        drop(r.begin("COM3").unwrap());
        assert!(r.begin("COM3").is_ok());
    }

    #[test]
    fn self_close_only_same_generation() {
        let r: Registry<u32> = Registry::default();
        let o = r.begin("COM3").unwrap();
        let g1 = o.generation;
        o.finish(1);
        assert_eq!(r.take("COM3"), Some(1));
        let o2 = r.begin("COM3").unwrap();
        o2.finish(2);
        // 옛 세션의 «닫힘» 이 늦게 와도 새 세션은 그대로
        assert_eq!(r.remove_if("COM3", g1), None);
        assert_eq!(r.with("COM3", |v| *v).unwrap(), 2);
    }
}
