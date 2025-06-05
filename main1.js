const broker = "broker.emqx.io";  
const port = 8084;
const clientId = "iotSystem_" + Math.random().toString(16).substr(2, 8);

const tamuTopic = "iot/home/ruangTamu";
const dapurTopic = "iot/home/ruangDapur";
const tidurTopic = "iot/home/ruangTidur";
const mandiTopic = "iot/home/ruangMandi";
const ledState = {
    tamu: false,
    dapur: false, 
    tidur: false,
    mandi: false
};

let client;
let isConnected = false;
let stateRequestInterval;
const ledTamuCheck = document.getElementById('ledTamu');
const ledDapurCheck = document.getElementById('ledDapur');
const ledTidurCheck = document.getElementById('ledTidur');
const ledMandiCheck = document.getElementById('ledMandi');

const tamuStatus = document.getElementById('tamu-status');
const dapurStatus = document.getElementById('dapur-status');
const tidurStatus = document.getElementById('tidur-status');
const mandiStatus = document.getElementById('mandi-status');

const tamuCard = document.getElementById('tamu-card');
const dapurCard = document.getElementById('dapur-card');
const tidurCard = document.getElementById('tidur-card');
const mandiCard = document.getElementById('mandi-card');

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
    console.log("MQTT Connected successfully");
    isConnected = true;
    client.subscribe(tamuTopic);
    client.subscribe(dapurTopic);
    client.subscribe(tidurTopic);
    client.subscribe(mandiTopic);
    client.subscribe(tamuTopic + "/status");
    client.subscribe(dapurTopic + "/status");
    client.subscribe(tidurTopic + "/status");
    client.subscribe(mandiTopic + "/status");
    client.subscribe(tamuTopic + "/feedback");
    client.subscribe(dapurTopic + "/feedback");
    client.subscribe(tidurTopic + "/feedback");
    client.subscribe(mandiTopic + "/feedback");
    
    console.log("All subscriptions completed");
    setTimeout(requestInitialStates, 500);
    setTimeout(requestInitialStates, 2000);
    setTimeout(requestInitialStates, 5000);
    if (stateRequestInterval) {
        clearInterval(stateRequestInterval);
    }
    stateRequestInterval = setInterval(requestInitialStates, 10000);
}

function requestInitialStates() {
    if (!isConnected || !client || !client.isConnected()) {
        console.log("Cannot request states: not connected");
        return;
    }
    
    console.log("Requesting current states from ESP devices...");
    const topics = [
        { topic: tamuTopic, room: "tamu" },
        { topic: dapurTopic, room: "dapur" },
        { topic: tidurTopic, room: "tidur" },
        { topic: mandiTopic, room: "mandi" }
    ];
    
    topics.forEach(({topic, room}) => {
        publishMessage(topic + "/get", "STATUS");
        publishMessage(topic + "/request", "STATE");
        publishMessage(topic, "GET_STATUS");
        setTimeout(() => {
            publishMessage(topic, "?");
        }, 1000);
    });
}

function onFailure(error) {
    console.error("MQTT Connection Failed:", error.errorMessage);
    isConnected = false;
    if (stateRequestInterval) {
        clearInterval(stateRequestInterval);
    }
    setTimeout(connectMQTT, 5000);
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.error("MQTT Connection Lost:", responseObject.errorMessage);
        isConnected = false;
        if (stateRequestInterval) {
            clearInterval(stateRequestInterval);
        }
        setTimeout(connectMQTT, 5000);
    }
}

function onMessageArrived(message) {
    const topic = message.destinationName;
    const payload = message.payloadString.trim().toUpperCase();
    
    console.log("Message received:", topic, "->", payload);
    let room = null;
    if (topic.includes("ruangTamu") || topic.includes("tamu")) {
        room = "tamu";
    } else if (topic.includes("ruangDapur") || topic.includes("dapur")) {
        room = "dapur";
    } else if (topic.includes("ruangTidur") || topic.includes("tidur")) {
        room = "tidur";
    } else if (topic.includes("ruangMandi") || topic.includes("mandi")) {
        room = "mandi";
    }
    
    if (room) {
        const isOn = (payload === "ON" || payload === "1" || payload === "TRUE" || payload === "HIGH");
        const isOff = (payload === "OFF" || payload === "0" || payload === "FALSE" || payload === "LOW");
        
        if (isOn || isOff) {
            updateLEDState(room, isOn);
        }
    }
}

function publishMessage(topic, message) {
    if (!client || !client.isConnected()) {
        console.error("Cannot publish: MQTT client not connected");
        if (!isConnected) {
            connectMQTT(); 
        }
        return false;
    }

    try {
        const mqttMessage = new Paho.MQTT.Message(message);
        mqttMessage.destinationName = topic;
        mqttMessage.qos = 1;
        mqttMessage.retained = false;
        client.send(mqttMessage);
        console.log("Published:", topic, "->", message);
        return true;
    } catch (error) {
        console.error("Error publishing message:", error);
        return false;
    }
}

function updateLEDState(room, isOn) {
    console.log(`Updating ${room} state to: ${isOn ? 'ON' : 'OFF'}`);
    if (ledState[room] !== isOn) {
        ledState[room] = isOn;
        
        switch (room) {
            case "tamu":
                ledTamuCheck.checked = isOn;
                tamuStatus.textContent = isOn ? "ON" : "OFF";
                tamuStatus.style.color = isOn ? "#4CAF50" : "#f44336";
                tamuCard.classList.toggle('active', isOn);
                break;
            case "dapur":
                ledDapurCheck.checked = isOn;
                dapurStatus.textContent = isOn ? "ON" : "OFF";
                dapurStatus.style.color = isOn ? "#4CAF50" : "#f44336";
                dapurCard.classList.toggle('active', isOn);
                break;
            case "tidur":
                ledTidurCheck.checked = isOn;
                tidurStatus.textContent = isOn ? "ON" : "OFF";
                tidurStatus.style.color = isOn ? "#4CAF50" : "#f44336";
                tidurCard.classList.toggle('active', isOn);
                break;
            case "mandi":
                ledMandiCheck.checked = isOn;
                mandiStatus.textContent = isOn ? "ON" : "OFF";
                mandiStatus.style.color = isOn ? "#4CAF50" : "#f44336";
                mandiCard.classList.toggle('active', isOn);
                break;
        }
        
        console.log(`${room} UI updated successfully`);
    }
}
function setTamu() {
    const newState = !ledState.tamu;
    console.log(`Sending command to Tamu: ${newState ? 'ON' : 'OFF'}`);
    publishMessage(tamuTopic, newState ? "ON" : "OFF");
    setTimeout(() => {
        publishMessage(tamuTopic + "/get", "STATUS");
    }, 500);
}

function setDapur() {
    const newState = !ledState.dapur;
    console.log(`Sending command to Dapur: ${newState ? 'ON' : 'OFF'}`);
    publishMessage(dapurTopic, newState ? "ON" : "OFF");
    
    setTimeout(() => {
        publishMessage(dapurTopic + "/get", "STATUS");
    }, 500);
}

function setTidur() {
    const newState = !ledState.tidur;
    console.log(`Sending command to Tidur: ${newState ? 'ON' : 'OFF'}`);
    publishMessage(tidurTopic, newState ? "ON" : "OFF");
    
    setTimeout(() => {
        publishMessage(tidurTopic + "/get", "STATUS");
    }, 500);
}

function setMandi() {
    const newState = !ledState.mandi;
    console.log(`Sending command to Mandi: ${newState ? 'ON' : 'OFF'}`);
    publishMessage(mandiTopic, newState ? "ON" : "OFF");
    
    setTimeout(() => {
        publishMessage(mandiTopic + "/get", "STATUS");
    }, 500);
}
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing IoT Home Control System...");
    [tamuStatus, dapurStatus, tidurStatus, mandiStatus].forEach(status => {
        status.textContent = "Loading...";
        status.style.color = "#ff9800";
    });
    [ledTamuCheck, ledDapurCheck, ledTidurCheck, ledMandiCheck].forEach(toggle => {
        toggle.disabled = true;
    });
    connectMQTT();
    setTimeout(() => {
        [ledTamuCheck, ledDapurCheck, ledTidurCheck, ledMandiCheck].forEach(toggle => {
            toggle.disabled = false;
        });
        ledTamuCheck.addEventListener('change', setTamu);
        ledDapurCheck.addEventListener('change', setDapur);
        ledTidurCheck.addEventListener('change', setTidur);
        ledMandiCheck.addEventListener('change', setMandi);
        
        console.log("System ready - controls enabled");
    }, 8000);
    window.addEventListener('beforeunload', () => {
        if (stateRequestInterval) {
            clearInterval(stateRequestInterval);
        }
        if (client && client.isConnected()) {
            client.disconnect();
        }
    });
});