//! PortDock 공용 부품. 화면(Tauri)과 무관한 통신·해석 로직만 둔다.
//! 각 PortDock 프로그램(Serial, Modbus Slave, TCP, UDP …)이 함께 쓴다.

pub mod autoreply;
pub mod checksum;
pub mod codec;
pub mod consent;
pub mod delay;
pub mod event;
pub mod framer;
pub mod loopback;
pub mod mc;
pub mod mc_client;
pub mod mc_rules;
pub mod i18n;
pub mod launch;
pub mod modbus;
pub mod modbus_master;
pub mod modbus_slave;
pub mod net;
pub mod regmap;
pub mod scpi;
pub mod oserr;
pub mod ping;
pub mod pcap;
pub mod plot;
pub mod portinfo;
pub mod power;
pub mod ports;
pub mod registry;
pub mod replyguard;
pub mod reqpair;
pub mod report;
pub mod serial;
pub mod tcp;
pub mod udp;
pub mod wlan;
