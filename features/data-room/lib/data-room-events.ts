export const DATA_ROOM_UPLOAD_EVENT = "nexusiq:data-room-upload";

export function dispatchDataRoomUpload() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DATA_ROOM_UPLOAD_EVENT));
  }
}
