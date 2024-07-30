import Bacnet, { enums } from "@vertics/ts-bacnet";
import { map } from "lodash";
import { parseDeviceObject, getObjectType, devicePropSubSet, subscribeObjectParser } from "./bacnetFn";
import { sendBacnetData, updateBacnet } from "./main";
import { addBacnetDeice, getBacnetDevice } from "./sqlite";

// create instance of Bacnet
const bacnetClient = new Bacnet({ apduTimeout: 4000, interface: "192.168.0.115" });
let subscribeCOVId = 0;
const subscribeCOVObjects: { subscribeCOVId?: number; sender: IBacnetSender; object: IBacnetIdentifier }[] = [];
/**
 * 255.255.255.255 (broadcast)로 bacnet whois함수를 호출
 */
export const getDevices = () => {
  bacnetClient.whoIs("255.255.255.255");
};

/**
 * BACnet Object의 Property가 변경될때 변경된 값을 subscribe하는 함수
 * @param sender IBacnetSender
 * @param object IBacnetIdentifier
 * @returns void
 */
export const subscribeCOV = (sender: IBacnetSender, object: IBacnetIdentifier) => {
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

/**
 * subscribeCOV함수로 등록한 subscribe를 해제하는 함수
 * @param sender IBacnetSender
 * @param object IBacnetIdentifier
 * @param subscribeCOVId number
 */
const unsubscribeCOV = (sender: IBacnetSender, object: IBacnetIdentifier, subscribeCOVId: number) => {
  bacnetClient.subscribeCov(sender, object, subscribeCOVId, false, false, 1, {}, err => {
    console.log("subscribeCOV" + err);
  });
};

/**
 * subscribeCOV함수로 등록한 전체 subscribe를 해제하는 함수
 */
export const unsubscribeCOVAll = async () => {
  await Promise.all(
    subscribeCOVObjects.map(device => {
      unsubscribeCOV(device.sender, device.object, device.subscribeCOVId || 0);
    })
  );
};

// emitted on errors
bacnetClient.on("error", err => {
  console.error(err);
  bacnetClient.close();
});

/**
 * subscribeCOV로 등록된 Object가 변경될떄 변경된 값을 받는 함수
 * updateBacnet함수를 통해 renderer프로세스로 해당 값을 전송
 */
bacnetClient.on("covNotifyUnconfirmed", data => {
  const value = subscribeObjectParser(data.payload);
  updateBacnet(data.header.sender, data.payload.monitoredObjectId, value);
});

// emmitted when Bacnet server listens for incoming UDP packages
bacnetClient.on("listening", () => {
  console.log("connect bacnet: " + Date.now());
});

const bacnetDevice: IBacnetDevice[] = [];

/**
 * whoid함수를 호출했을때 각 디바이스에서 디바이스 정보를 받아오는 함수
 */
bacnetClient.on("iAm", device => {
  console.log("iam");

  const deviceName = "BAC_" + device.payload.deviceId;
  const changeDevice = {
    id: deviceName,
    name: deviceName,
    sender: device.header.sender,
    deviceId: device.payload.deviceId
  };

  const propertyList: { id: enums.PropertyIdentifier }[] = [];
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
    parseDeviceObject(changeDevice.sender, res, { type: 8, instance: changeDevice.deviceId }, true, bacnetClient, async (res: IBacnetDevice) => {
      if (res.object_list) {
        const filterObject = res.object_list.filter(object => object.object_identifier);
        res.object_list = map(filterObject, object => {
          const object_identifier: IBacnetIdentifier =
            typeof object.object_identifier === "string" ? JSON.parse(object.object_identifier) : object.object_identifier;
          return {
            ...object,
            id: `${deviceName}_${getObjectType(object_identifier.type)}_${object_identifier.instance}`
          };
        });
      }
      const device: IBacnetDevice = { ...changeDevice, ...res };
      bacnetDevice.push(device);
      await addBacnetDeice(device);
      const bacnetDeivce2 = await getBacnetDevice();
      sendBacnetData(bacnetDeivce2);
    });
  });
});
