export type TryOnStatus =
  | "idle"
  | "validating"
  | "uploading"
  | "running"
  | "success"
  | "error";

export type TryOnPollResponse = {
  status: "running" | "success" | "error";
  resultUrl?: string;
  errorCode?: string;
  message?: string;
};

export type ImageDimensions = {
  width: number;
  height: number;
};

export type YouCamImage = {
  bytes: Uint8Array;
  contentType: "image/jpg" | "image/png";
  fileName: string;
};
