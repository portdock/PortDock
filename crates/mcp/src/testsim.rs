//! 시험용 가짜 장비 — 127.0.0.1 의 빈 포트에 core 의 Modbus Slave·MC 서버 흉내·SCPI 메아리를 띄운다.
//! 단위 시험과 프로토콜 왕복 시험(tests/)이 함께 쓴다. 실행 파일의 도구는 이것을 부르지 않는다.

use portdock_core::mc::Server;
use portdock_core::modbus_slave::Slave;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::sync::{Arc, Mutex};

fn serve(handle: impl Fn(TcpStream) + Send + Sync + 'static) -> SocketAddr {
    let l = TcpListener::bind("127.0.0.1:0").expect("bind 127.0.0.1");
    let addr = l.local_addr().unwrap();
    let handle = Arc::new(handle);
    std::thread::spawn(move || {
        for s in l.incoming().flatten() {
            let h = handle.clone();
            std::thread::spawn(move || h(s));
        }
    });
    addr
}

/// 길이 칸으로 끊는 요청 루프 — `need(buf)` 가 한 요청의 길이를 알려 주면 `answer` 로 답한다
fn frames(mut s: TcpStream, need: impl Fn(&[u8]) -> Option<usize>, answer: impl Fn(&[u8]) -> Option<Vec<u8>>) {
    let mut buf = Vec::new();
    let mut chunk = [0u8; 4096];
    loop {
        while let Some(n) = need(&buf).filter(|n| buf.len() >= *n) {
            let f: Vec<u8> = buf.drain(..n).collect();
            if let Some(r) = answer(&f)
                && s.write_all(&r).is_err()
            {
                return;
            }
        }
        match s.read(&mut chunk) {
            Ok(0) | Err(_) => return,
            Ok(n) => buf.extend_from_slice(&chunk[..n]),
        }
    }
}

/// Modbus TCP 슬레이브(국번 1, 표마다 0~99 응답)
pub fn modbus_tcp() -> (SocketAddr, Arc<Mutex<Slave>>) {
    let slave = Arc::new(Mutex::new(Slave::with_seed(1)));
    let sl = slave.clone();
    let addr = serve(move |s| {
        let sl = sl.clone();
        frames(s, |b| (b.len() >= 6).then(|| 6 + u16::from_be_bytes([b[4], b[5]]) as usize), move |f| sl.lock().unwrap().handle_tcp(f).0);
    });
    (addr, slave)
}

/// MC 3E 이진 서버 흉내(PLC Simulator 와 같은 core)
pub fn mc_3e() -> (SocketAddr, Arc<Mutex<Server>>) {
    let server = Arc::new(Mutex::new(Server::with_seed(1)));
    let sv = server.clone();
    let addr = serve(move |s| {
        let sv = sv.clone();
        frames(s, |b| (b.len() >= 9).then(|| 9 + u16::from_le_bytes([b[7], b[8]]) as usize), move |f| sv.lock().unwrap().handle(f).0);
    });
    (addr, server)
}

/// 한 줄 받으면 `reply` 한 줄로 답하는 가짜 계측기(LAN 소켓)
pub fn scpi_echo(reply: &'static str) -> SocketAddr {
    serve(move |s| {
        let mut w = s.try_clone().unwrap();
        for line in BufReader::new(s).lines() {
            let Ok(line) = line else { return };
            if line.trim_end().ends_with('?') && w.write_all(format!("{reply}\n").as_bytes()).is_err() {
                return;
            }
        }
    })
}
