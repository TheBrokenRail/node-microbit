const MICROBIT_UART_SERVICE = '6E400001B5A3F393E0A9E50E24DCCA9E';
const MICROBIT_RX_CHARACTERISTIC = '6E400002B5A3F393E0A9E50E24DCCA9E';
const MICROBIT_TX_CHARACTERISTIC = '6E400003B5A3F393E0A9E50E24DCCA9E';
const uid = require('uid');

class MicroBit {
  constructor(write) {
    this.write = write;
    this.wait = {};
  }
  data(data) {
    console.log('Data: ' + data);
    if (data.startsWith('.')) {
      let command = data.slice(1, data.length - 1);
      let action = command.split(':')[0];
      let param = command.split(':')[1];
      if (action === 'DONE') {
        for (let id of this.wait) {
          if (id == param) {
            wait[id]();
          }
        }
      }
    }
  }
  scroll(data) {
    let id = uid(16);
    this.write('DISPLAY_SCROLL:"' + id + '",' + JSON.stringify(data) + ';');
    return new Promise((resolve, reject) => {
      this.wait.id = resolve;
    });
  }
}

module.exports = {
  connect: terminal => {
    return new Promise((resolve, reject) => {
      if (terminal === 'bluetooth') {
        const noble = require('noble');
        noble.on('stateChange', state => {
          if (state === 'poweredOn') {
             noble.startScanning([MICROBIT_UART_SERVICE], false);
          } else {
            noble.stopScanning();
          }
        });
        noble.on('discover', peripheral => {
          peripheral.connect(error => {
           if (error) {
              reject(error);
            }
            peripheral.discoverServices([MICROBIT_UART_SERVICE], (error, services) => {
              if (error) {
                reject(error);
              }
              services[0].discoverCharacteristics([MICROBIT_RX_CHARACTERISTIC, MICROBIT_TX_CHARACTERISTIC], (error, characteristics) => {
                if (error) {
                  reject(error);
                }
                let write = null;
                let read = null;
                for (let i = 0; i < characteristics.length; i++) {
                  if (characteristics[i].uuid == MICROBIT_RX_CHARACTERISTIC) {
                    write = data => {
                      return new Promise((resolveTwo, rejectTwo) => {
                        characteristics[i].write(data, error => {
                          if (error) {
                            rejectTwo(error);
                          }
                          resolveTwo();
                        });
                      });
                    };
                  } else if (characteristics[i].uuid == MICROBIT_TX_CHARACTERISTIC) {
                    let index = 0;
                    read = callback => {
                      return new Promise((resolveTwo, rejectTwo) => {
                        characteristics[i].read((data, error) => {
                          if (error) {
                            rejectTwo(error);
                          }
                          let newData = data.toString().slice(index);
                          if (newData.endsWith(';')) {
                            index = data.length;
                            let commands = newData.split(';');
                            for (let i = 0; i < commands.length; i++) {
                              if (commands[i].startsWith('.')) {
                                callback(commands[i]);
                              }
                            }
                            resolveTwo();
                          }
                        });
                      });
                    };
                  }
                }
                let microbit = new MicroBit(write);
                setInterval(() => {
                  read(microbit.data);
                }, 50);
                resolve(microbit);
              });
            });
          });
        });
      } else {
        const SerialPort = require('serialport');
        const port = new SerialPort(terminal, {
          baudRate: 115200
        });
        let write = data => {
          console.log('Write: ' + data);
          return new Promise((resolveTwo, rejectTwo) => {
            let index = 0;
            let writeChar = char => {
              port.write(char, error => {
                if (error) {
                  rejectTwo(error);
                }
                port.drain(() => {
                  index++;
                  if (index < data.length) {
                    setTimeout(() => writeChar(data[index]), 10);
                  } else {
                    resolveTwo();
                  }
                });
              });
            };
            writeChar(data[index]);
          });
        };
        let microbit = new MicroBit(write);
        let buffer = '';
        port.on('data', data => {
          if (!data.toString().endsWith(';')) {
            buffer = buffer + data.toString();
          } else {
            let commands = (buffer + data.toString()).split(';');
            for (let i = 0; i < commands.length; i++) {
              if (commands[i].startsWith('.') || true) {
                microbit.data(commands[i] + ';');
              }
            }
            buffer = '';
          }
        });
        resolve(microbit);
      }
    });
  }
};