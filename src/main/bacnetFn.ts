import Bacnet, { enums } from "@vertics/ts-bacnet";
import moment from "moment-timezone";
import process from "process";

const debug = false;

export const PropertyIdentifierToEnumMap: any = {};
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.OBJECT_TYPE] = enums.ObjectType;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.SEGMENTATION_SUPPORTED] = enums.Segmentation;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.EVENT_STATE] = enums.EventState;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.UNITS] = enums.EngineeringUnits;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.RELIABILITY] = enums.Reliability;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.NOTIFY_TYPE] = enums.NotifyType;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.POLARITY] = enums.Polarity;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.PROTOCOL_SERVICES_SUPPORTED] = enums.ServicesSupported;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.PROTOCOL_OBJECT_TYPES_SUPPORTED] = enums.ObjectTypesSupported;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.STATUS_FLAGS] = enums.StatusFlags;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.LIMIT_ENABLE] = enums.LimitEnable;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.EVENT_ENABLE] = enums.EventTransitionBits;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.ACKED_TRANSITIONS] = enums.EventTransitionBits;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.SYSTEM_STATUS] = enums.DeviceStatus;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.SYSTEM_STATUS] = enums.DeviceStatus;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.ACK_REQUIRED] = enums.EventTransitionBits;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.LOGGING_TYPE] = enums.LoggingType;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.FILE_ACCESS_METHOD] = enums.FileAccessMethod;
PropertyIdentifierToEnumMap[enums.PropertyIdentifier.NODE_TYPE] = enums.NodeType;

// Sometimes the Map needs to be more specific
export const ObjectTypeSpecificPropertyIdentifierToEnumMap: any = {};

ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.BINARY_INPUT] = {};
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.BINARY_INPUT][enums.PropertyIdentifier.PRESENT_VALUE] = enums.BinaryPV;
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.BINARY_INPUT][enums.PropertyIdentifier.MODE] = enums.BinaryPV;

ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.ANALOG_INPUT] = {};
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.ANALOG_INPUT][enums.PropertyIdentifier.PRESENT_VALUE] = enums.BinaryPV; //????

ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.ANALOG_OUTPUT] = {};
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.ANALOG_OUTPUT][enums.PropertyIdentifier.PRESENT_VALUE] = enums.BinaryPV; //????

ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.BINARY_OUTPUT] = {};
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.BINARY_OUTPUT][enums.PropertyIdentifier.PRESENT_VALUE] = enums.BinaryPV;
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.BINARY_OUTPUT][enums.PropertyIdentifier.RELINQUISH_DEFAULT] = enums.BinaryPV;

ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.BINARY_VALUE] = {};
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.BINARY_VALUE][enums.PropertyIdentifier.PRESENT_VALUE] = enums.BinaryPV;
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.BINARY_VALUE][enums.PropertyIdentifier.RELINQUISH_DEFAULT] = enums.BinaryPV;

ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.BINARY_LIGHTING_OUTPUT] = {};
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.BINARY_LIGHTING_OUTPUT][enums.PropertyIdentifier.PRESENT_VALUE] =
  enums.BinaryLightingPV;

ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.BITSTRING_VALUE] = {};
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.BINARY_VALUE][enums.PropertyIdentifier.PRESENT_VALUE] = enums.BinaryPV; // ???

ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.LIFE_SAFETY_POINT] = {};
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.LIFE_SAFETY_POINT][enums.PropertyIdentifier.PRESENT_VALUE] = enums.LifeSafetyState;
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.LIFE_SAFETY_POINT][enums.PropertyIdentifier.TRACKING_VALUE] = enums.LifeSafetyState;
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.LIFE_SAFETY_POINT][enums.PropertyIdentifier.MODE] = enums.LifeSafetyMode;
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.LIFE_SAFETY_POINT][enums.PropertyIdentifier.ACCEPTED_MODES] = enums.LifeSafetyMode;
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.LIFE_SAFETY_POINT][enums.PropertyIdentifier.SILENCED] = enums.LifeSafetyState;
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.LIFE_SAFETY_POINT][enums.PropertyIdentifier.OPERATION_EXPECTED] =
  enums.LifeSafetyOperation;

ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.LIFE_SAFETY_ZONE] = {};
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.LIFE_SAFETY_ZONE][enums.PropertyIdentifier.PRESENT_VALUE] = enums.LifeSafetyState;
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.LIFE_SAFETY_ZONE][enums.PropertyIdentifier.MODE] = enums.LifeSafetyMode;

ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.LOAD_CONTROL] = {};
ObjectTypeSpecificPropertyIdentifierToEnumMap[enums.ObjectType.LOAD_CONTROL][enums.PropertyIdentifier.PRESENT_VALUE] = enums.ShedState;

// For Objects we read out All properties if cli parameter --all is provided
const propSubSet = process.argv.includes("--all")
  ? Object.values(enums.PropertyIdentifier)
  : [
      /* normally supported from all devices */
      enums.PropertyIdentifier.OBJECT_IDENTIFIER,
      enums.PropertyIdentifier.OBJECT_NAME,
      enums.PropertyIdentifier.OBJECT_TYPE,
      enums.PropertyIdentifier.PRESENT_VALUE,
      enums.PropertyIdentifier.STATUS_FLAGS,
      enums.PropertyIdentifier.EVENT_STATE,
      enums.PropertyIdentifier.RELIABILITY,
      enums.PropertyIdentifier.OUT_OF_SERVICE,
      enums.PropertyIdentifier.UNITS,
      /* other properties */
      enums.PropertyIdentifier.DESCRIPTION,
      enums.PropertyIdentifier.SYSTEM_STATUS,
      enums.PropertyIdentifier.VENDOR_NAME,
      enums.PropertyIdentifier.VENDOR_IDENTIFIER,
      enums.PropertyIdentifier.MODEL_NAME,
      enums.PropertyIdentifier.FIRMWARE_REVISION,
      enums.PropertyIdentifier.APPLICATION_SOFTWARE_VERSION,
      enums.PropertyIdentifier.LOCATION,
      enums.PropertyIdentifier.LOCAL_DATE,
      enums.PropertyIdentifier.LOCAL_TIME,
      enums.PropertyIdentifier.UTC_OFFSET,
      enums.PropertyIdentifier.DAYLIGHT_SAVINGS_STATUS,
      enums.PropertyIdentifier.PROTOCOL_VERSION,
      enums.PropertyIdentifier.PROTOCOL_REVISION,
      enums.PropertyIdentifier.PROTOCOL_SERVICES_SUPPORTED,
      enums.PropertyIdentifier.PROTOCOL_OBJECT_TYPES_SUPPORTED,
      enums.PropertyIdentifier.OBJECT_LIST,
      enums.PropertyIdentifier.MAX_APDU_LENGTH_ACCEPTED,
      enums.PropertyIdentifier.SEGMENTATION_SUPPORTED,
      enums.PropertyIdentifier.APDU_TIMEOUT,
      enums.PropertyIdentifier.NUMBER_OF_APDU_RETRIES,
      enums.PropertyIdentifier.DEVICE_ADDRESS_BINDING,
      enums.PropertyIdentifier.DATABASE_REVISION,
      enums.PropertyIdentifier.MAX_INFO_FRAMES,
      enums.PropertyIdentifier.MAX_MASTER,
      enums.PropertyIdentifier.ACTIVE_COV_SUBSCRIPTIONS,
      enums.PropertyIdentifier.ACTIVE_COV_MULTIPLE_SUBSCRIPTIONS
    ];

export const devicePropSubSet = [
  enums.PropertyIdentifier.OBJECT_IDENTIFIER,
  enums.PropertyIdentifier.OBJECT_NAME,
  enums.PropertyIdentifier.VENDOR_NAME,
  enums.PropertyIdentifier.APDU_TIMEOUT,
  enums.PropertyIdentifier.MAX_APDU_LENGTH_ACCEPTED,
  enums.PropertyIdentifier.OBJECT_TYPE,
  enums.PropertyIdentifier.OBJECT_LIST
];

/**
 * Retrieve all properties manually because ReadPropertyMultiple is not available
 * @param address
 * @param objectId
 * @param callback
 * @param propList
 * @param result
 * @returns {*}
 */
const getAllPropertiesManually: (address: any, objectId: any, bacnetClient: Bacnet, callback: any, propList?: any, result?: any) => any = (
  address,
  objectId,
  bacnetClient,
  callback,
  propList,
  result
) => {
  if (!propList) {
    propList = propSubSet.map(x => x); // Clone the array
  }
  if (!result) {
    result = [];
  }
  if (!propList.length) {
    return callback({
      values: [
        {
          objectId: objectId,
          values: result
        }
      ]
    });
  }

  const prop = propList.shift();

  // Read only object-list property
  bacnetClient.readProperty(address, objectId, prop, {}, (err, value) => {
    if (!err) {
      if (debug) {
        console.log("Handle value " + prop + ": ", JSON.stringify(value));
      }
      if (value) {
        const objRes: any = { ...value, value: [] };
        objRes.value = value.values;
        result.push(objRes);
      }
    } else {
      // console.log('Device do not contain object ' + enums.getEnumName(enums.PropertyIdentifier, prop));
    }
    getAllPropertiesManually(address, objectId, bacnetClient, callback, propList, result);
  });
};

/**
 * Reads ou one bit out of an buffer
 * @param buffer
 * @param i
 * @param bit
 * @returns {number}
 */
const readBit: (buffer: any, i: any, bit: any) => number = (buffer: any, i: any, bit: any) => {
  return (buffer[i] >> bit) % 2;
};

/**
 * Parses a Bitstring and returns array with all true values
 * @param buffer
 * @param bitsUsed
 * @param usedEnum
 * @returns {[]}
 */
function handleBitString(buffer: any, bitsUsed: any, usedEnum: any) {
  const res = [];
  for (let i = 0; i < bitsUsed; i++) {
    const bufferIndex = Math.floor(i / 8);
    if (readBit(buffer, bufferIndex, i % 8)) {
      res.push(enums.getEnumName(usedEnum, i));
    }
  }
  return res;
}

/**
 * Parses a property value
 * @param address
 * @param objId
 * @param parentType
 * @param value
 * @param supportsMultiple
 * @param callback
 */
const parseValue: (address: any, objId: any, parentType: any, value: any, supportsMultiple: any, bacnetClient: Bacnet, callback: any) => void = (
  address,
  objId,
  parentType,
  value,
  supportsMultiple,
  bacnetClient,
  callback
) => {
  let resValue: any = null;
  if (value && value.type && value.value !== null && value.value !== undefined) {
    switch (value.type) {
      case enums.ApplicationTag.NULL:
        // should be null already, but set again
        resValue = null;
        break;
      case enums.ApplicationTag.BOOLEAN:
        // convert number to a real boolean
        resValue = !!value.value;
        break;
      case enums.ApplicationTag.UNSIGNED_INTEGER:
      case enums.ApplicationTag.SIGNED_INTEGER:
      case enums.ApplicationTag.REAL:
      case enums.ApplicationTag.DOUBLE:
      case enums.ApplicationTag.CHARACTER_STRING:
        // datatype should be correct already
        resValue = value.value;
        break;
      case enums.ApplicationTag.DATE:
      case enums.ApplicationTag.TIME:
      case enums.ApplicationTag.TIMESTAMP:
        // datatype should be Date too
        // Javascript do not have date/timestamp only
        resValue = value.value;
        break;
      case enums.ApplicationTag.BIT_STRING:
        // handle bitstrings specific and more generic
        if (ObjectTypeSpecificPropertyIdentifierToEnumMap[parentType] && ObjectTypeSpecificPropertyIdentifierToEnumMap[parentType][objId]) {
          resValue = handleBitString(value.value.value, value.value.bitsUsed, ObjectTypeSpecificPropertyIdentifierToEnumMap[parentType][objId]);
        } else if (PropertyIdentifierToEnumMap[objId]) {
          resValue = handleBitString(value.value.value, value.value.bitsUsed, PropertyIdentifierToEnumMap[objId]);
        } else {
          if (parentType !== enums.ObjectType.BITSTRING_VALUE) {
            console.log(
              "Unknown value for BIT_STRING type for objId " +
                enums.getEnumName(enums.PropertyIdentifier, objId) +
                " and parent type " +
                enums.getEnumName(enums.ObjectType, parentType)
            );
          }
          resValue = value.value;
        }
        break;
      case enums.ApplicationTag.ENUMERATED:
        // handle enumerations specific and more generic
        if (ObjectTypeSpecificPropertyIdentifierToEnumMap[parentType] && ObjectTypeSpecificPropertyIdentifierToEnumMap[parentType][objId]) {
          resValue = enums.getEnumName(ObjectTypeSpecificPropertyIdentifierToEnumMap[parentType][objId], value.value);
        } else if (PropertyIdentifierToEnumMap[objId]) {
          resValue = enums.getEnumName(PropertyIdentifierToEnumMap[objId], value.value);
        } else {
          console.log(
            "Unknown value for ENUMERATED type for objId " +
              enums.getEnumName(enums.PropertyIdentifier, objId) +
              " and parent type " +
              enums.getEnumName(enums.ObjectType, parentType)
          );
          resValue = value.value;
        }
        break;
      case enums.ApplicationTag.OBJECTIDENTIFIER:
        // Look up object identifiers
        // Some object identifiers should not be looked up because we end in loops else
        if (
          objId === enums.PropertyIdentifier.OBJECT_IDENTIFIER ||
          objId === enums.PropertyIdentifier.STRUCTURED_OBJECT_LIST ||
          objId === enums.PropertyIdentifier.SUBORDINATE_LIST
        ) {
          resValue = value.value;
        } else if (value.value.type === 8) {
          return;
        } else if (supportsMultiple) {
          const requestArray = [
            {
              objectId: value.value,
              properties: [{ id: enums.PropertyIdentifier.ALL }]
            }
          ];
          bacnetClient.readPropertyMultiple(address, requestArray, {}, (err, resValue) => {
            if (err) {
              console.log(err);
            }
            parseDeviceObject(address, resValue, value.value, true, bacnetClient, callback);
          });
          return;
        } else {
          getAllPropertiesManually(address, value.value, bacnetClient, (result: any) => {
            parseDeviceObject(address, result, value.value, false, bacnetClient, callback);
          });
          return;
        }
        break;
      case enums.ApplicationTag.OCTET_STRING:
        // It is kind of binary data??
        resValue = value.value;
        break;
      case enums.ApplicationTag.ERROR:
        // lookup error class and code
        resValue = {
          errorClass: enums.getEnumName(enums.ErrorClass, value.value.errorClass),
          errorCode: enums.getEnumName(enums.ErrorCode, value.value.errorCode)
        };
        break;
      case enums.ApplicationTag.OBJECT_PROPERTY_REFERENCE:
      case enums.ApplicationTag.DEVICE_OBJECT_PROPERTY_REFERENCE:
      case enums.ApplicationTag.DEVICE_OBJECT_REFERENCE:
      case enums.ApplicationTag.READ_ACCESS_SPECIFICATION: //???
        resValue = value.value;
        break;
      case enums.ApplicationTag.CONTEXT_SPECIFIC_DECODED:
        parseValue(address, objId, parentType, value.value, supportsMultiple, bacnetClient, callback);
        return;
      case enums.ApplicationTag.READ_ACCESS_RESULT: // ????
        resValue = value.value;
        break;
      default:
        console.log("unknown type " + value.type + ": " + JSON.stringify(value));
        resValue = value;
    }
  }

  setImmediate(() => callback(resValue));
};

/**
 * Parse an object structure
 * @param address
 * @param obj
 * @param parent
 * @param supportsMultiple
 * @param bacnetClient
 * @param callback
 */
export const parseDeviceObject: (address: any, obj: any, parent: any, supportsMultiple: any, bacnetClient: Bacnet, callback: any) => void = (
  address,
  obj,
  parent,
  supportsMultiple,
  bacnetClient,
  callback
) => {
  if (debug) {
    console.log(address, supportsMultiple);
    console.log("START parseDeviceObject: " + JSON.stringify(parent) + " : " + JSON.stringify(obj));
  }

  if (!obj) {
    return;
  }

  if (!obj.values || !Array.isArray(obj.values)) {
    callback({ ERROR: "No device or invalid response" });
    return;
  }

  let cbCount = 0;
  let objDef: any = {};

  const finalize = () => {
    // Normalize and remove single item arrays
    Object.keys(objDef).forEach(devId => {
      Object.keys(objDef[devId]).forEach(objId => {
        if (objDef[devId][objId].length === 1) {
          objDef[devId][objId] = objDef[devId][objId][0];
        }
      });
    });
    // If (standard case) only one device was in do not create sub structures)
    if (obj.values.length === 1) {
      objDef = objDef[obj.values[0].objectId.instance];
    }
    if (debug) {
      console.log("END parseDeviceObject: " + JSON.stringify(parent) + " : " + JSON.stringify(objDef));
    }
    callback(objDef);
  };

  obj.values.forEach((devBaseObj: any) => {
    if (!devBaseObj.objectId) {
      return;
    }
    if (devBaseObj.objectId.type === undefined || devBaseObj.objectId.instance === undefined) {
      return;
    }
    if (!devBaseObj.values || !Array.isArray(devBaseObj.values)) {
      return;
    }
    const deviceId = devBaseObj.objectId.instance;
    objDef[deviceId] = {};
    devBaseObj.values.forEach((devObj: any) => {
      let objId = "";
      objId = enums.getEnumName(enums.PropertyIdentifier, devObj.id);
      objId = objId.split("(")[0].toLowerCase();
      if (devObj.index !== 4294967295) {
        objId += "-" + devObj.index;
      }
      if (debug) {
        console.log("Handle Object property:", deviceId, objId, devObj.value);
      }
      devObj.value.forEach((val: any) => {
        if (JSON.stringify(val.value) === JSON.stringify(parent)) {
          // ignore parent object
          objDef[deviceId][objId] = objDef[deviceId][objId] || [];
          objDef[deviceId][objId].push(val.value);
          // objDef[deviceId][objId] = val.value;
          return;
        }
        cbCount++;
        parseValue(address, devObj.id, parent.type, val, supportsMultiple, bacnetClient, (parsedValue: any) => {
          if (debug) {
            console.log("RETURN parsedValue", deviceId, objId, devObj.value, parsedValue);
          }
          objDef[deviceId][objId] = objDef[deviceId][objId] || [];
          objDef[deviceId][objId].push(parsedValue);
          if (!--cbCount) {
            finalize();
          }
        });
      });
    });
  });
  if (cbCount === 0) {
    finalize();
  }
};

/**
 * 받아온 ObjectType을 텍스트로 변경하는 함수
 * @param type enums.ObjectType
 * @returns
 */
export const getObjectType = (type: enums.ObjectType) => {
  switch (type) {
    case enums.ObjectType.ANALOG_INPUT:
      return "AI";
    case enums.ObjectType.ANALOG_VALUE:
      return "AV";
    case enums.ObjectType.ANALOG_OUTPUT:
      return "AO";
    case enums.ObjectType.BINARY_INPUT:
      return "BI";
    case enums.ObjectType.BINARY_VALUE:
      return "BV";
    case enums.ObjectType.BINARY_OUTPUT:
      return "BO";
    case enums.ObjectType.MULTI_STATE_VALUE:
      return "MSV";
    case enums.ObjectType.CHARACTERSTRING_VALUE:
      return "CV";
    default:
      return "";
  }
};
/**
 * subscribe로 받아온 Object를 파싱하는 함수
 * @param payload
 * @returns
 */
export const subscribeObjectParser = (payload: { values: { property: { id: number }; value: any }[] }) => {
  // const objType = payload.monitoredObjectId.type
  const values: { [objTypeString: string]: number | string } = {};
  payload.values.map((value: any) => {
    const valueType = value.property.id;
    if (valueType === enums.PropertyIdentifier.OBJECT_TYPE) {
      const objTypeString = enums.getEnumName(enums.PropertyIdentifier, valueType).split("(")[0].toLowerCase();
      const objTypeValue = enums.getEnumName(enums.ObjectType, value.value[0].value).split("(")[0];
      values[objTypeString] = objTypeValue;
    } else {
      const objTypeString = enums.getEnumName(enums.PropertyIdentifier, valueType).split("(")[0].toLowerCase();
      const objTypeValue =
        value.value.length === 1
          ? value.value[0].value
          : value.value
              .map((v: any) => {
                if (v.type === enums.ApplicationTag.DATE) {
                  return moment(v.value).format("YYYY-MM-DD");
                } else if (v.type === enums.ApplicationTag.TIME) {
                  return moment(v.value).format("HH:mm:ss");
                } else {
                  return v.value;
                }
              })
              .join(",");
      values[objTypeString] = objTypeValue;
    }
  });
  // console.log("values", values);
  return values;
};
