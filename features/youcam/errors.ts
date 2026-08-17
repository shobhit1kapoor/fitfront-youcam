import { ImageValidationError } from "./validation";

export class YouCamError extends Error {
  code: string;
  httpStatus: number;

  constructor(code: string, message: string, httpStatus = 502) {
    super(message);
    this.name = "YouCamError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const PROVIDER_MESSAGES: Record<string, string> = {
  CreditInsufficiency: "The free YouCam unit allowance is currently exhausted.",
  InvalidAccessToken: "The YouCam integration is not configured correctly.",
  InvalidApiKey: "The YouCam integration is not configured correctly.",
  InvalidParameters: "YouCam could not use the supplied images.",
  error_pose:
    "No suitable forward-facing pose was found. Use a clear photo with one person facing the camera.",
  error_invalid_ref:
    "This garment image is not suitable for virtual try-on. Try another supported product.",
  error_invalid_src:
    "Use a clear photo showing your face, shoulders, and upper body from the front.",
  error_apply_region_mismatch:
    "The person and garment regions do not match. Try a different front-facing photo.",
  error_nsfw_content_detected:
    "The image could not be processed by YouCam's safety filters.",
  TooManyRequests: "YouCam is busy right now. Wait a moment and check again.",
  TaskTimeout: "The virtual try-on took too long. Check the same task again.",
  InvalidTaskId: "This try-on task is no longer available.",
  FileExpired: "This try-on result has expired. Start a new try-on if you want to generate it again.",
  ResultExpired: "This try-on result has expired. Start a new try-on if you want to generate it again.",
  MismatchedApplicationRegion:
    "The person and garment regions do not match. Try a different front-facing photo.",
};

export function safeProviderMessage(code?: string) {
  if (!code) return "The virtual try-on service could not complete this request.";
  return PROVIDER_MESSAGES[code] || PROVIDER_MESSAGES.InvalidParameters;
}

export function toSafeError(error: unknown) {
  if (error instanceof YouCamError || error instanceof ImageValidationError) {
    return {
      errorCode: error.code,
      message: error.message,
      status: error instanceof YouCamError ? error.httpStatus : 400,
    };
  }
  return {
    errorCode: "provider_error",
    message: "The virtual try-on service could not complete this request.",
    status: 500,
  };
}
