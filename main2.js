// MQTT Configuration
const broker = "broker.emqx.io";
const port = 8084;
const clientId = "analysisSystem_" + Math.random().toString(16).substr(2, 8);

// Topics
const powerTopic = "sensor/power";
const energyTopic = "sensor/energy";
const currentTopic = "sensor/current";
const voltageTopic = "sensor/voltage";

// Global variables
let client;
let isConnected = true;
let voltageCurrentChart;
let powerEnergyChart;

// Data storage for charts (max 50 points)
const maxDataPoints = 50;
const chartData = {
    timestamps: [],
    voltage: [],
    current: [],
    power: [],
    energy: []
};

// Energy calculation
let totalEnergyConsumption = 0;
const tariffPerKWh = 1547; // Rp per kWh

// DOM elements
const totalTariff = document.getElementById('totalTariff');
const voltageCurrentUpdate = document.getElementById('voltageCurrentUpdate');
const powerEnergyUpdate = document.getElementById('powerEnergyUpdate');

// Initialize MQTT connection
function connectMQTT() {
    client = new Paho.MQTT.Client(broker, port, clientId);

    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    const options = {
        useSSL: true,
        timeout: 15,
        keepAliveInterval: 30,
        onSuccess: onConnect,
        onFailure: onFailure
    };

    client.connect(options);
}

function onConnect() {
    console.log("MQTT Connected for Analysis");
    isConnected = true;

    if (connectionIndicator) {
        connectionIndicator.classList.add('status-connected');
    }
    if (connectionText) {
        connectionText.textContent = 'Connected';
    }


    // Subscribe to topics

    client.subscribe(powerTopic);
    client.subscribe(energyTopic);
    client.subscribe(currentTopic);
    client.subscribe(voltageTopic);

    console.log("Subscribed to all topics");
}

function onFailure(error) {
    console.error("MQTT Connection Failed:", error.errorMessage);
    isConnected = false;
    if (connectionIndicator) {
        connectionIndicator.classList.remove('status-connected');
    }
    if (connectionText) {
        connectionText.textContent = 'Disconnected';
    }

    connectionIndicator.classList.remove('status-connected');
    connectionText.textContent = 'Connection Failed';
    setTimeout(connectMQTT, 5000);
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.error("MQTT Connection Lost:", responseObject.errorMessage);
        isConnected = false;
        if (connectionIndicator) {
            connectionIndicator.classList.remove('status-connected');
        }
        if (connectionText) {
            connectionText.textContent = 'Disconnected';
        }

        connectionIndicator.classList.remove('status-connected');
        connectionText.textContent = 'Disconnected';
        setTimeout(connectMQTT, 5000);
    }
}

function onMessageArrived(message) {
    const topic = message.destinationName;
    const payload = message.payloadString;

    console.log("Message received:", topic, "->", payload);

    let data = {
        voltage: null,
        current: null,
        power: null,
        energy: null
    };
    switch (topic) {
        case voltageTopic:
            data.voltage = parseFloat(payload);
            break;
        case currentTopic:
            data.current = parseFloat(payload);
            break;
        case powerTopic:
            data.power = parseFloat(payload);
            break;
        case energyTopic:
            data.energy = parseFloat(payload);
            break;
    }
    updateMonitoringData({
        voltage: data.voltage ?? chartData.voltage[chartData.voltage.length - 1],
        current: data.current ?? chartData.current[chartData.current.length - 1],
        power: data.power ?? chartData.power[chartData.power.length - 1],
        energy: data.energy ?? chartData.energy[chartData.energy.length - 1]
    });
}


function updateMonitoringData(data) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    chartData.timestamps.push(timeStr);
    chartData.voltage.push(parseFloat(data.voltage) || 220);
    chartData.current.push(parseFloat(data.current) || 0);
    chartData.power.push(parseFloat(data.power) || 0);
    chartData.energy.push(parseFloat(data.energy) || 0);
    if (chartData.timestamps.length > maxDataPoints) {
        chartData.timestamps.shift();
        chartData.voltage.shift();
        chartData.current.shift();
        chartData.power.shift();
        chartData.energy.shift();
    }
    const energy = parseFloat(data.energy) || 0;
    totalEnergyConsumption = energy;
    const tariffAmount = Math.round(totalEnergyConsumption * tariffPerKWh).toLocaleString('id-ID');
    totalTariff.textContent = `Rp ${tariffAmount}`;
    updateCharts();
    const updateTime = now.toLocaleTimeString('id-ID');
    voltageCurrentUpdate.textContent = `Last update: ${updateTime}`;
    powerEnergyUpdate.textContent = `Last update: ${updateTime}`;
}

function updateCharts() {
    voltageCurrentChart.data.labels = [...chartData.timestamps];
    voltageCurrentChart.data.datasets[0].data = [...chartData.voltage];
    voltageCurrentChart.data.datasets[1].data = [...chartData.current];
    voltageCurrentChart.update('none');
    powerEnergyChart.data.labels = [...chartData.timestamps];
    powerEnergyChart.data.datasets[0].data = [...chartData.power];
    powerEnergyChart.data.datasets[1].data = [...chartData.energy];
    powerEnergyChart.update('none');
}

function initializeCharts() {
    const ctx1 = document.getElementById('voltageCurrentChart').getContext('2d');
    voltageCurrentChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Voltage (V)',
                    data: [],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    pointRadius: 1,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Current (A)',
                    data: [],
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    borderWidth: 2,
                    pointRadius: 1,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    title: {
                        display: true,
                        text: 'Waktu',
                        color: '#64748b'
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Voltage (V)',
                        color: '#64748b'
                    },
                    grid: { color: 'rgba(226, 232, 240, 0.5)' }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Current (A)',
                        color: '#64748b'
                    },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
    const ctx2 = document.getElementById('powerEnergyChart').getContext('2d');
    powerEnergyChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Power (W)',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    pointRadius: 1,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Energy (kWh)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    pointRadius: 1,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    title: {
                        display: true,
                        text: 'Waktu',
                        color: '#64748b'
                    }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Power (W)',
                        color: '#64748b'
                    },
                    grid: { color: 'rgba(226, 232, 240, 0.5)' }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Energy (kWh)',
                        color: '#64748b'
                    },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}
document.addEventListener('DOMContentLoaded', function () {
    console.log("Initializing Real-time Analysis System...");
    initializeCharts();
    connectMQTT();
    window.addEventListener('beforeunload', () => {
        if (client && client.isConnected()) {
            client.disconnect();
        }
    });
});