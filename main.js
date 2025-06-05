
const MQTT_BROKER = "broker.emqx.io";
const MQTT_PORT = 8083;

const temperatureTopic = "sensor/temperature";
const humidityTopic = "sensor/humidity";
const powerTopic = "sensor/power";
const energyTopic = "sensor/energy";
const currentTopic = "sensor/current";
const voltageTopic = "sensor/voltage";

function getElementSafely(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found in the DOM`);
        return { 
            innerText: "", 
            set innerText(value) { console.log(`Would set ${id} to ${value} if element existed`); }
        };
    }
    return element;
}

const temperatureElement = getElementSafely("temperature");
const humidityElement = getElementSafely("humidity");
const powerElement = getElementSafely("power");
const energyElement = getElementSafely("energy");
const currentElement = getElementSafely("current");
const voltageElement = getElementSafely("voltage");

function updateElementValue(element, value) {
    if (element && typeof element.innerText !== 'undefined') {
        const formattedValue = value;
        const unitSpan = element.querySelector('.unit');
        if (unitSpan) {
            element.innerText = formattedValue;
            element.appendChild(unitSpan);
        } else {
            element.innerText = formattedValue;
        }
    }
}

function connectMQTT() {
    console.log("Attempting to connect to MQTT broker...");
    const clientId = "client_" + Math.random().toString(16).substr(2, 8);
    
    if (typeof Paho === 'undefined' || typeof Paho.MQTT === 'undefined') {
        console.error("Paho MQTT client library not loaded!");
        simulateData(null); 
        return null;
    }
    
    const client = new Paho.MQTT.Client(MQTT_BROKER, MQTT_PORT, clientId);

    client.onConnectionLost = (responseObject) => {
        console.log("Connection lost: " + responseObject.errorMessage);
      
        setTimeout(() => {
            simulateData(null);
        }, 1000);
    };
    
    client.onMessageArrived = (message) => {
        console.log("Message received on topic " + message.destinationName + ": " + message.payloadString);
        const value = message.payloadString;
        
        switch(message.destinationName) {
            case temperatureTopic:
                updateElementValue(temperatureElement, value);
                break;
            case humidityTopic:
                updateElementValue(humidityElement, value);
                break;
            case powerTopic:
                updateElementValue(powerElement, value);
                break;
            case energyTopic:
                updateElementValue(energyElement, value);
                break;
            case currentTopic:
                updateElementValue(currentElement, value);
                break;
            case voltageTopic:
                updateElementValue(voltageElement, value);
                break;
        }
    };

    const connectOptions = {
        onSuccess: () => {
            console.log("Connected to MQTT broker successfully");
            try {
                client.subscribe(temperatureTopic);
                client.subscribe(humidityTopic);
                client.subscribe(powerTopic);
                client.subscribe(energyTopic);
                client.subscribe(currentTopic);
                client.subscribe(voltageTopic);
                console.log("Subscribed to all topics");
            } catch (error) {
                console.error("Error subscribing to topics:", error);
            }
            
            setTimeout(() => {
                simulateData(client);
            }, 2000);
        },
        onFailure: (err) => {
            console.error("Failed to connect to MQTT broker:", err);
            setTimeout(() => {
                simulateData(null);
            }, 1000);
        },
        useSSL: location.protocol === "https:"
    };

    try {
        client.connect(connectOptions);
    } catch (err) {
        console.error("Error during MQTT connection attempt:", err);
        simulateData(null);
        return null;
    }
    
    return client;
}


function simulateData(client) {
    console.log("Simulating sensor data...");
    
    if (!client || !client.isConnected()) {
        console.log("Client not connected, updating UI directly");

        updateElementValue(temperatureElement, "25.0");
        updateElementValue(humidityElement, "65.0");
        updateElementValue(powerElement, "250.0");
        updateElementValue(energyElement, "0.5");
        updateElementValue(currentElement, "2.1");
        updateElementValue(voltageElement, "220.0");
        return;
    }
    
    try {
        if (!powerElement.innerText || powerElement.innerText === "") {
            sendMQTTMessage(client, powerTopic, "250.0");
        }
        if (!energyElement.innerText || energyElement.innerText === "") {
            sendMQTTMessage(client, energyTopic, "0.5");
        }
        if (!currentElement.innerText || currentElement.innerText === "") {
            sendMQTTMessage(client, currentTopic, "2.1");
        }
        if (!voltageElement.innerText || voltageElement.innerText === "") {
            sendMQTTMessage(client, voltageTopic, "220.0");
        }
        
        if (!temperatureElement.innerText || temperatureElement.innerText === "") {
            sendMQTTMessage(client, temperatureTopic, "25.0");
        }
        if (!humidityElement.innerText || humidityElement.innerText === "") {
            sendMQTTMessage(client, humidityTopic, "65.0");
        }
    } catch (error) {
        console.error("Error in simulateData:", error);
    }
}

function sendMQTTMessage(client, topic, messageContent) {
    try {
        if (!client || !client.isConnected()) {
            console.warn(`Cannot send message to ${topic}: client not connected`);
            return;
        }
        
        const mqttMessage = new Paho.MQTT.Message(messageContent);
        mqttMessage.destinationName = topic;
        client.send(mqttMessage);
        console.log(`Sent message to ${topic}: ${messageContent}`);
    } catch (error) {
        console.error(`Error sending message to ${topic}:`, error);
    }
}

let mqttClient;
window.addEventListener('load', () => {
    console.log("Page loaded, initializing MQTT connection...");
    try {
        mqttClient = connectMQTT();
        
        setTimeout(() => {
            if (mqttClient) {
                simulateData(mqttClient);
            } else {
                simulateData(null);
            }
        }, 2000);
    } catch (error) {
        console.error("Error during MQTT initialization:", error);
        setTimeout(() => {
            simulateData(null);
        }, 1000);
    }
});