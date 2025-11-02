import { Platform } from 'react-native';

type NativeShadow = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: {
    width: number;
    height: number;
  };
};

export const makeShadow = (
  webShadow: string,
  nativeShadow: NativeShadow,
) => Platform.select({
  web: { boxShadow: webShadow },
  default: nativeShadow,
}) ?? {};
