/* eslint-disable max-classes-per-file */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
$(document).ready(() => {
  // if deployed to a site supporting SSL, use wss://
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);

  // A class for holding the last N points of telemetry for a device
  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.maxLen = 50;
      this.exhaustPipeOxygen = new Array(this.maxLen);
      this.proximity = new Array(this.maxLen);
      this.fuel = new Array(this.maxLen);
      this.steeringWheel = new Array(this.maxLen);
      this.windshieldWiperDrop = new Array(this.maxLen);   
    }

    addData(time, exhaustPipeOxygen, proximity, fuel, steeringWheel, windshieldWiperDrop) {
      this.timeData.push(time);
      this.exhaustPipeOxygen.push(exhaustPipeOxygen);
      this.proximity.push(proximity);
      this.fuel.push(fuel);
      this.steeringWheel.push(steeringWheel);
      this.windshieldWiperDrop.push(windshieldWiperDrop);
      // this.humidityData.push(humidity || null);

      if (this.timeData.length > this.maxLen) {
        this.timeData.shift();
        this.exhaustPipeOxygen.shift();
        this.proximity.shift();
        this.fuel.shift();
        this.steeringWheel.shift();
        this.windshieldWiperDrop.shift();
      }
    }
  }

  // All the devices in the list (those that have been sending telemetry)
  class TrackedDevices {
    constructor() {
      this.devices = [];
    }

    // Find a device based on its Id
    findDevice(deviceId) {
      for (let i = 0; i < this.devices.length; ++i) {
        if (this.devices[i].deviceId === deviceId) {
          return this.devices[i];
        }
      }

      return undefined;
    }

    getDevicesCount() {
      return this.devices.length;
    }
  }

  const trackedDevices = new TrackedDevices();

  // Define the chart axes
  const chartData = {
    datasets: [
      {
        fill: false,
        label: 'ExhaustPipeOxygen',
        yAxisID: 'ExhaustPipeOxygen',
        borderColor: 'rgba(255, 204, 0, 1)',
        pointBoarderColor: 'rgba(255, 204, 0, 1)',
        backgroundColor: 'rgba(255, 204, 0, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 204, 0, 1)',
        pointHoverBorderColor: 'rgba(255, 204, 0, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'Proximity',
        yAxisID: 'Proximity',
        borderColor: 'rgba(240, 35, 24, 1)',
        pointBoarderColor: 'rgba(240, 35, 24, 1)',
        backgroundColor: 'rgba(139, 21, 15, 1)',
        pointHoverBackgroundColor: 'rgba(240, 35, 24, 1)',
        pointHoverBorderColor: 'rgba(240, 35, 24, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'Fuel',
        yAxisID: 'Fuel',
        borderColor: 'rgba(24, 120, 240, 1)',
        pointBoarderColor: 'rgba(24, 120, 240, 1)',
        backgroundColor: 'rgba(24, 120, 240, 0.4)',
        pointHoverBackgroundColor: 'rgba(24, 120, 240, 1)',
        pointHoverBorderColor: 'rgba(24, 120, 240, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'SteeringWheel',
        yAxisID: 'SteeringWheel',
        borderColor: 'rgba(240, 24, 229, 1)',
        pointBoarderColor: 'rgba(240, 24, 229, 1)',
        backgroundColor: 'rgba(100, 15, 96, 1)',
        pointHoverBackgroundColor: 'rgba(240, 24, 229, 1)',
        pointHoverBorderColor: 'rgba(240, 24, 229, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'WindshieldWiperDrop',
        yAxisID: 'WindshieldWiperDrop',
        borderColor: 'rgba(33, 218, 43, 1)',
        pointBoarderColor: 'rgba(33, 218, 43, 1)',
        backgroundColor: 'rgba(12, 126, 18, 1)',
        pointHoverBackgroundColor: 'rgba(33, 218, 43, 1)',
        pointHoverBorderColor: 'rgba(33, 218, 43, 1)',
        spanGaps: true,
      }
    ]
  };

  const chartOptions = {
    scales: {
      yAxes: [{
        id: 'ExhaustPipeOxygen',
        type: 'linear',
        scaleLabel: {
          labelString: 'ExhaustPipeOxygen (V)',
          display: true,
        },
        position: 'left',
      },
      {
        id: 'Proximity',
        type: 'linear',
        scaleLabel: {
          labelString: 'Proximity (m)',
          display: true,
        },
        position: 'right',
      },
      {
        id: 'Fuel',
        type: 'linear',
        scaleLabel: {
          labelString: 'Fuel (l)',
          display: true,
        },
        position: 'right',
      },
      {
        id: 'SteeringWheel',
        type: 'linear',
        scaleLabel: {
          labelString: 'SteeringWheel (l)',
          display: true,
        },
        position: 'right',
      },
      {
        id: 'WindshieldWiperDrop',
        type: 'linear',
        scaleLabel: {
          labelString: 'WindshieldWiperDrop (l)',
          display: true,
        },
        position: 'left',
      }]
    }
  };

  // Get the context of the canvas element we want to select
  const ctx = document.getElementById('iotChart').getContext('2d');
  const myLineChart = new Chart(
    ctx,
    {
      type: 'line',
      data: chartData,
      options: chartOptions,
    });

  // Manage a list of devices in the UI, and update which device data the chart is showing
  // based on selection
  let needsAutoSelect = true;
  const deviceCount = document.getElementById('deviceCount');
  const listOfDevices = document.getElementById('listOfDevices');
  function OnSelectionChange() {
    const device = trackedDevices.findDevice(listOfDevices[listOfDevices.selectedIndex].text);
    chartData.labels = device.timeData;
    chartData.datasets[0].data = device.ExhaustPipeOxygen;
    chartData.datasets[1].data = device.Proximity;
    chartData.datasets[2].data = device.Fuel;
    chartData.datasets[3].data = device.SteeringWheel;
    chartData.datasets[4].data = device.WindshieldWiperDrop;
    myLineChart.update();
  }
  listOfDevices.addEventListener('change', OnSelectionChange, false);

  // When a web socket message arrives:
  // 1. Unpack it
  // 2. Validate it has date/time and temperature
  // 3. Find or create a cached device to hold the telemetry data
  // 4. Append the telemetry data
  // 5. Update the chart UI
  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);
      console.log(messageData);

      // time and either temperature or humidity are required
      // if (!messageData.MessageDate || (!messageData.IotData.temperature && !messageData.IotData.humidity)) {
      //   return;
      // }

      // find or add device to list of tracked devices
      const existingDeviceData = trackedDevices.findDevice(messageData.DeviceId);

      if (existingDeviceData) {
        existingDeviceData.addData(messageData.MessageDate, 
          messageData.IotData.exhaustPipeOxygen,
          messageData.IotData.proximity,
          messageData.IotData.fuel,
          messageData.IotData.steeringWheel,
          messageData.IotData.windshieldWiperDrop
        );
      } else {
        const newDeviceData = new DeviceData(messageData.DeviceId);
        trackedDevices.devices.push(newDeviceData);
        const numDevices = trackedDevices.getDevicesCount();
        deviceCount.innerText = numDevices === 1 ? `${numDevices} device` : `${numDevices} devices`;
        newDeviceData.addData(messageData.MessageDate, 
          messageData.IotData.exhaustPipeOxygen,
          messageData.IotData.proximity,
          messageData.IotData.fuel,
          messageData.IotData.steeringWheel,
          messageData.IotData.windshieldWiperDrop);

        // add device to the UI list
        const node = document.createElement('option');
        const nodeText = document.createTextNode(messageData.DeviceId);
        node.appendChild(nodeText);
        listOfDevices.appendChild(node);

        // if this is the first device being discovered, auto-select it
        if (needsAutoSelect) {
          needsAutoSelect = false;
          listOfDevices.selectedIndex = 0;
          OnSelectionChange();
        }
      }

      myLineChart.update();
    } catch (err) {
      console.error(err);
    }
  };
});
