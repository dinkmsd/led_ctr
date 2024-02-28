
const bodyParser = require('body-parser');
const cors = require('cors');
const mqtt = require("mqtt");

var mqttClient;

const conn = require('./connection.js');
const Info = require('./info_model.js');
const { ObjectId } = require('mongodb');

// Connect database
conn.connect();

// Change this to point to your MQTT broker or DNS name
const mqttHost = "broker.emqx.io";
const protocol = "mqtt";
const port = "1883";

// const mqttHost = "3587049ca7744ddc970e27988b47fc99.s1.eu.hivemq.cloud";
// const protocol = "mqtt";
// const port = "8884";

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('Client connected!');

    // Add the new client to the set of connected clients
    clients.add(ws);

    // send hello message to client
    // ws.send('Hello, client!');

    // Notify existing clients about the new client joining
    clients.forEach((client) => {
        if (client !== ws) {
            // client.send('A new client has joined!');
        }
    });

    // handle incoming messages from client
    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);

        const jsonData = JSON.parse(message);

        var currentdate = new Date();
        var timer = "Timer: " + currentdate.getDate() + "/"
            + (currentdate.getMonth() + 1) + "/"
            + currentdate.getFullYear() + " @ "
            + currentdate.getHours() + ":"
            + currentdate.getMinutes() + ":"
            + currentdate.getSeconds();
        console.log(timer);

        if (jsonData['action'] === 'requestAllData') {
            console.log("Action: Request List Data")
            getAllData(ws);
        }

        // if (jsonData['action'] === 'updateData') {
        //     console.log("Action: Request Update Data")
        //     updateData(jsonData);
        // }
        // if (jsonData['action'] === 'setSchedule') {
        //     console.log("Action: Set Schedule")
        //     setSchedule(jsonData);
        // }
        // if (jsonData['action'] === 'createNewLed') {
        //     console.log("Action: Create new led")
        //     createLedInfo(jsonData)
        // }
        // if (jsonData['action'] === 'modifyBrightness') {
        //     console.log("Action: Modify brighness")
        //     modifyBrighness(jsonData)
        // }
        // if (jsonData['action'] === 'requestDetail') {
        //     console.log("Action: Request Detail")
        //     getDetailData(jsonData['id'])
        // }
        // if (jsonData['action'] === 'deleteSchedule') {
        //     console.log('Action: Delete schedule')
        //     deleteSchedule(jsonData)
        // }
    });

    // handle client disconnection
    ws.on('close', () => {
        console.log('Client disconnected.');
        // Remove the client from the set of connected clients
        clients.delete(ws);
        // notify the others
        clients.forEach((client) => {
            client.send('One of the clients disconnected.');
        });
    });
});


function connectToBroker() {
    const clientId = "client" + Math.random().toString(36).substring(7);

    // Change this to point to your MQTT broker
    const hostURL = `${protocol}://${mqttHost}:${port}`;

    const options = {
        keepalive: 60,
        clientId: clientId,
        protocolId: "MQTT",
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
    };

    mqttClient = mqtt.connect(hostURL, options);

    mqttClient.on("error", (err) => {
        console.log("Error: ", err);
        mqttClient.end();
    });

    mqttClient.on("reconnect", () => {
        console.log("Reconnecting...");
    });

    mqttClient.on("connect", () => {
        console.log("Client connected:" + clientId);
    });

    // Received Message
    mqttClient.on("message", (topic, message, packet) => {

        const jsonData = JSON.parse(message);

        var currentdate = new Date();
        var timer = "Timer: " + currentdate.getDate() + "/"
            + (currentdate.getMonth() + 1) + "/"
            + currentdate.getFullYear() + " @ "
            + currentdate.getHours() + ":"
            + currentdate.getMinutes() + ":"
            + currentdate.getSeconds();
        console.log(timer);

        if (jsonData['action'] === 'requestAllData') {
            console.log("Action: Request List Data")
            getAllData();
        }
        if (jsonData['action'] === 'updateData') {
            console.log("Action: Request Update Data")
            updateData(jsonData);
        }
        if (jsonData['action'] === 'setSchedule') {
            console.log("Action: Set Schedule")
            setSchedule(jsonData);
        }
        if (jsonData['action'] === 'createNewLed') {
            console.log("Action: Create new led")
            createLedInfo(jsonData)
        }
        if (jsonData['action'] === 'modifyBrightness') {
            console.log("Action: Modify brighness")
            modifyBrighness(jsonData)
        }
        if (jsonData['action'] === 'requestDetail') {
            console.log("Action: Request Detail")
            getDetailData(jsonData['id'])
        }
        if (jsonData['action'] === 'deleteSchedule') {
            console.log('Action: Delete schedule')
            deleteSchedule(jsonData)
        }
    });
}

async function getDetailData(ledID) {
    const item = await Info.findById(ledID, { 'history._id': 0 })
    var result = { "action": "detailData", item }
    console.log(result)
    publishMessage("dinkmsd/" + ledID, JSON.stringify(result));
}

async function deleteSchedule(inputJson) {

    try {
        console.log(inputJson)
        await Info.updateOne(
            { _id: inputJson['ledId'] },
            { $pull: { schedule: { _id: inputJson['scheId'] } } }
        ).then((result) => {
            console.log("Update Result:", result);
            console.log("Successfully removed element from schedule:", result.nModified > 0);
        })
            .catch((error) => {
                console.error("Error removing element from schedule:", error);
            });
        getDetailData(inputJson['ledId'])
    } catch (error) {
        console.log("Can't delete schedule: ", error)
    }
}

async function setSchedule(inputJson) {
    try {
        console.log(inputJson)
        const infoId = inputJson['ledId']
        const scheId = inputJson['scheId']
        const incomingScheduleItem = {
            time: inputJson['time'],
            value: inputJson['value'],
            status: inputJson['status'],
        };
        await Info.findOneAndUpdate(
            // { _id: infoId, schedule: { _id: scheId } },
            { _id: infoId, },
            {
                $push: {
                    schedule: incomingScheduleItem,
                },
            },
            { new: true }
        )
        getDetailData(infoId)
    } catch (error) {
        console.log("Add or edit schedule failed!!! ", error)
    }
}

async function modifyBrighness(inputJson) {
    const data = {
        "lumi": inputJson['value']
    }
    publishMessage("monitor/" + inputJson['id'], JSON.stringify(data));
    await Info.findByIdAndUpdate(
        inputJson['id'],
        {
            $set: { brightness: inputJson['value'] }
        },
        { new: true }
    );
    getAllData()
    getDetailData(inputJson['id'])
}

function subscribeToTopic(topic) {
    mqttClient.subscribe(topic, { qos: 0 });
}

function publishMessage(topic, message) {
    mqttClient.publish(topic, message, {
        qos: 0,
        retain: false,
    });

}

async function updateData(inputJson) {
    try {
        // inputJson['dateTime'] = new Date(inputJson['dateTime'] * 1000);
        // const date = new Date();
        // dateTime = date.
        var randomTemp = Math.floor(Math.random() * (28 - 27) + 27);
        var randomHumi = Math.floor(Math.random() * (66 - 65) + 65);

        // console.log(inputJson['dateTime'])
        const history = {
            "temperature": inputJson['temp'] || randomTemp,
            "humidity": inputJson['humi'] || randomHumi,
            "brightness": inputJson['lumi'],
            "dateTime": new Date(),
            "incli": inputJson['incli'],
            "rsrp": inputJson['rsrp'],
            "cellID": inputJson['cellID']

        }
        console.log('Hello')
        const updatedData = await Info.findByIdAndUpdate(
            inputJson['id'],
            {
                $push: { history: history },
                $set: {
                    status: true,
                    x: inputJson['x'],
                    y: inputJson['y'],
                    z: inputJson['z'],
                    incli: inputJson['incli'],
                    rsrp: inputJson['rsrp'],
                    cellID: inputJson['cellID'],
                    temp: inputJson['temperature'],
                    humi: inputJson['humidity'],
                    brightness: inputJson['brightness']
                }
            },
            { new: true }
        );
        if (!updatedData) {
            console.log('Info not found!!!');
        } else {
            getAllData();
            getDetailData(inputJson['id']);
        }
    } catch (error) {
        console.log('Lỗi khi cập nhật thông tin.', error);
    }
}


// Get all data function
// async function getAllData() {
//     try {
//         const allData = await Info.find({});
//         const jsonData = { "action": "recievedAllData", "listData": allData };
//         publishMessage("dinkmsd/server", JSON.stringify(jsonData));
//     } catch (error) {
//         console.log('Error get all data');
//     }
// }


async function getAllData(ws) {
    try {
        const allData = await Info.find({}, {});
        const jsonData = { "action": "recievedAllData", "listData": allData };
        ws.send(JSON.stringify(jsonData));
        console.log("Hello success");

    } catch (error) {
        console.log('Error get all data')
    }
}

// async function getAllData() {
//     try {
//         const allData = await Info.find({}, { history: 0, schedule: 0 });
//         const jsonData = { "action": "recievedAllData", "listData": allData };
//         publishMessage("dinkmsd/server", JSON.stringify(jsonData));


//     } catch (error) {
//         console.log('Error get all data')
//     }
// }

async function createLedInfo(inputJson) {
    try {
        const newData = new Info({
            name: inputJson['name'],
            status: false,
            lat: inputJson['lat'],
            lon: inputJson['lon']
        });
        await newData.save();
        const jsonData = { "action": "createSuccessed", "id": newData._id };
        publishMessage("dinkmsd/server", JSON.stringify(jsonData));
        getAllData()
    } catch (error) {
        const jsonData = { "action": "createFailed" };
        publishMessage("dinkmsd/server", JSON.stringify(jsonData));
    }
}


