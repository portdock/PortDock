//! 산업 프로토콜 — Modbus TCP·RTU over TCP, MC(SLMP) 3E/4E, LS XGT FEnet.
use crate::dissect::Dz;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum App {
    Modbus,
    ModbusRtu,
    Mc,
    Xgt,
}

pub(crate) fn dissect_payload(
    _z: &mut Dz,
    _from: usize,
    _end: usize,
    _sp: u16,
    _dp: u16,
    _tcp: bool,
) {
}
