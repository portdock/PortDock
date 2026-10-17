//! PortDock 공용 부품. 화면(Tauri)과 무관한 통신·해석 로직만 둔다.
//! 각 PortDock 프로그램(Serial, Modbus Slave, TCP, UDP …)이 함께 쓴다.

pub mod autoreply;
pub mod checksum;
pub mod codec;
pub mod framer;
pub mod modbus;
pub mod modbus_slave;
pub mod ports;
pub mod serial;
