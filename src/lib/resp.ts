import { AppError } from "./errors";

export function respData(data: any) {
  return respJson(0, "ok", data || []);
}

export function respOk() {
  return respJson(0, "ok");
}

export function respErr(message: string) {
  return respJson(-1, message);
}

export function respAppError(e: AppError) {
  return respJson(e.code, e.message, undefined, e.statusCode);
}

export function respJson(code: number, message: string, data?: any, status: number = 200) {
  let json = {
    code: code,
    message: message,
    data: data,
  };
  if (data) {
    json["data"] = data;
  }

  return Response.json(json, { status });
}
