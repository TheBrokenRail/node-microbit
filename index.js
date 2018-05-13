const MICROBIT_UART_SERVICE = '6E400001B5A3F393E0A9E50E24DCCA9E';
const MICROBIT_RX_CHARACTERISTIC = '6E400002B5A3F393E0A9E50E24DCCA9E';
const MICROBIT_TX_CHARACTERISTIC = '6E400003B5A3F393E0A9E50E24DCCA9E';

class MicroBit {
  constructor(read, write) {
    this.read = read;
    this.write = write;
  }
}

module.exports = {
  connect = bluetooth => {
    return new Promise((resolve, reject) => {
      if (bluetooth) {
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
                      };
                    };
                  } else if (characteristics[i].uuid == MICROBIT_TX_CHARACTERISTIC) {
                    let index = 0;
                    read = data => {
                      return new Promise((resolveTwo, rejectTwo) => {
                        characteristics[i].read((data, error) => {
                          if (error) {
                            rejectTwo(error);
                          }
                          let newData = data.slice(index);
                          index = data.length;
                          resolveTwo(newData);
                        });
                      };
                    };
                  }
                }
                resolve(new MicroBit(read, write));
              });
            });
          });
        });
      } else {
        
      }
    });
  }
};