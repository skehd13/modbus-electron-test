/**
 * This script will discover all devices in the network and read out all
 * properties and deliver a JSON as device description
 *
 * If a deviceId is given as first parameter then only this device is discovered
 */

import Bacnet, { enums } from "@vertics/ts-bacnet";
import { filter, map } from "lodash";
import { parseDeviceObject, getObjectType, devicePropSubSet, subscribeObjectParser } from "./bacnetFn";
import { sendBacnetData, updateBacnet } from "./main";

// create instance of Bacnet
const bacnetClient = new Bacnet({ apduTimeout: 4000, interface: "192.168.0.115" });
let subscribeCOVId = 0;
const subscribeCOVObjects: any[] = [];
export const getDevices = () => {
  bacnetClient.whoIs("255.255.255.255");
};

export const subscribeCOV = (sender: any, object: any) => {
  const newObject = { sender, object };
  if (subscribeCOVObjects.includes(newObject)) {
    return;
  }
  subscribeCOVId = subscribeCOVId + 1;
  subscribeCOVObjects.push({ ...newObject, subscribeCOVId });
  console.log(sender, object);
  bacnetClient.subscribeCov(sender, object, subscribeCOVId, false, false, 0, {}, err => {
    console.log("subscribeCOV" + err);
  });
};

const unsubscribeCOV = (sender: any, object: any, subscribeCOVId: number) => {
  bacnetClient.subscribeCov(sender, object, subscribeCOVId, false, false, 1, {}, err => {
    console.log("subscribeCOV" + err);
  });
};

export const unsubscribeCOVAll = async () => {
  await Promise.all(
    subscribeCOVObjects.map(device => {
      unsubscribeCOV(device.sender, device.object, device.subscribeCOVId);
    })
  );
};

// emitted for each new message
bacnetClient.on("message", (msg, rinfo) => {
  console.log(msg);
  if (rinfo) console.log(rinfo);
});

// emitted on errors
bacnetClient.on("error", err => {
  console.error(err);
  bacnetClient.close();
});

bacnetClient.on("covNotifyUnconfirmed", data => {
  console.log("Received COV: " + JSON.stringify(data));
  const value = subscribeObjectParser(data.payload);
  updateBacnet(data.header.sender, data.payload.monitoredObjectId, value);
});

// emmitted when Bacnet server listens for incoming UDP packages
bacnetClient.on("listening", () => {
  console.log("connect bacnet: " + Date.now());
});

const bacnetDevice: any[] = [];
const knownDevices: any[] = [];

bacnetClient.on("iAm", device => {
  console.log(device);

  const deviceId = device.payload.deviceId;
  if (knownDevices.includes(deviceId)) {
    sendBacnetData(bacnetDevice);
    return;
  }

  knownDevices.push(deviceId);
  const deviceName = "BAC_" + device.payload.deviceId;
  const changeDevice = {
    id: deviceName,
    name: deviceName,
    sender: device.header.sender,
    deviceId: device.payload.deviceId
  };

  const propertyList: any[] = [];
  devicePropSubSet.forEach(item => {
    propertyList.push({ id: item });
  });

  const requestArray = [
    {
      objectId: { type: enums.ObjectType.DEVICE, instance: changeDevice.deviceId },
      properties: propertyList
    }
  ];
  bacnetClient.readPropertyMultiple(changeDevice.sender, requestArray, {}, (err, res) => {
    if (err) console.log("err", err);
    console.log(res);
    parseDeviceObject(changeDevice.sender, res, { type: 8, instance: changeDevice.deviceId }, true, bacnetClient, (res: any) => {
      if (res.object_list) {
        res.object_list = map(
          filter(res.object_list, object => object.object_identifier),
          object => ({
            ...object,
            id: `${deviceName}_${getObjectType(object.object_identifier.type)}_${object.object_identifier.instance}`
          })
        );
      }
      bacnetDevice.push({ ...changeDevice, ...res });
      sendBacnetData(bacnetDevice);
      console.log(JSON.stringify(bacnetDevice));
    });
  });
});
