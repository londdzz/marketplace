import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** What the server will cap it at anyway. Sending more is wasted data. */
const LONG_EDGE = 1600;
const QUALITY = 0.8;

export type PreparedPhoto = {
  uri: string;
  name: string;
  type: string;
};

/**
 * Ask for photographs and shrink them before they leave the phone.
 *
 * A modern phone takes 4000px, 6MB photographs. On a mobile connection in the
 * region that is a slow, expensive upload, and the server only keeps 1600px, so
 * the resize happens here first. The server resizes again regardless: nothing
 * about an upload is trusted.
 */
export async function pickPhotos(remaining: number): Promise<PreparedPhoto[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return [];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 1,
  });

  if (result.canceled) {
    return [];
  }

  return Promise.all(result.assets.map((asset, index) => prepare(asset, index)));
}

/**
 * Take one now, for a seller standing next to the car.
 */
export async function takePhoto(): Promise<PreparedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({ quality: 1 });

  if (result.canceled) {
    return null;
  }

  return prepare(result.assets[0], 0);
}

async function prepare(asset: ImagePicker.ImagePickerAsset, index: number): Promise<PreparedPhoto> {
  const longEdge = Math.max(asset.width ?? 0, asset.height ?? 0);

  // Only resize what is actually too big; re-encoding a small photograph just
  // loses quality for nothing.
  const resize =
    longEdge > LONG_EDGE
      ? (asset.width ?? 0) >= (asset.height ?? 0)
        ? { width: LONG_EDGE }
        : { height: LONG_EDGE }
      : undefined;

  const context = ImageManipulator.manipulate(asset.uri);

  if (resize) {
    context.resize(resize);
  }

  const image = await context.renderAsync();
  const output = await image.saveAsync({ compress: QUALITY, format: SaveFormat.JPEG });

  return {
    uri: output.uri,
    name: `photo-${Date.now()}-${index}.jpg`,
    type: 'image/jpeg',
  };
}
