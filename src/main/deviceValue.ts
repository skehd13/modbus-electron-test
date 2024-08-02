export type generateDeviceOption = {
  ipAddress: string;
  port: number;
  name?: string;
  targetName?: string;
  start: number;
  length: number;
  type: number;
  delay: number;
};
/**
 * modbusEditWindow에서 입력한 데이터를 IModbusDeviceGroup[]으로 바꿔주는 함수
 * @param options generateDeviceOption | generateDeviceOption[]
 * @returns IModbusDeviceGroup[]
 */
export const generateDevice: (options: generateDeviceOption | generateDeviceOption[]) => IModbusDeviceGroup[] = options => {
  if (Array.isArray(options)) {
    return options.map((option, optionIndex) => {
      const device: IModbusDeviceGroup = {
        id: optionIndex,
        name: option.name || `device_${optionIndex}`,
        ipAddress: option.ipAddress,
        port: option.port,
        start: option.start,
        length: option.length,
        delay: option.delay,
        type: option.type,
        targetName: option.targetName || "target",
        targets: Array.from({ length: option.length }).map((d, targetIndex) => {
          const position = option.start + targetIndex;
          return {
            id: targetIndex,
            position: position,
            name: `${option.name || `device_${optionIndex}`}_${`${option.targetName}_${position}` || `target_${position}`}`
          };
        })
      };
      return device;
    });
  } else {
    return [
      {
        id: 0,
        name: options.name || `device_0`,
        ipAddress: options.ipAddress,
        port: options.port,
        start: options.start,
        length: options.length,
        delay: options.delay,
        type: options.type,
        targetName: options.targetName || "target",
        targets: Array.from({ length: options.length }).map((d, targetIndex) => {
          const position = options.start + targetIndex;
          return {
            id: targetIndex,
            position: position,
            name: `${options.name || `device_0`}_${options.targetName || `target`}_${position}`
          };
        })
      }
    ];
  }
};
