import { NextResponse } from "next/server";
import { ZodError } from "zod";

// Consistent error envelope: code, message, request_id, field_errors.
export class ApiError extends Error {
  status: number;
  code: string;
  fieldErrors?: Record<string, string[]>;
  headers?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: Record<string, string[]>,
    headers?: Record<string, string>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.headers = headers;
  }
}

const NO_STORE = { "Cache-Control": "no-store" };

export const unauthorized = () =>
  new ApiError(401, "unauthenticated", "Authentication required.");
export const forbidden = () =>
  new ApiError(403, "forbidden", "You do not have access to this resource.");
export const notFound = () =>
  new ApiError(404, "not_found", "Resource not found or inaccessible.");

export function errorResponse(error: unknown, requestId = crypto.randomUUID()) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          request_id: requestId,
          ...(error.fieldErrors ? { field_errors: error.fieldErrors } : {}),
        },
      },
      { status: error.status, headers: { ...NO_STORE, "x-request-id": requestId, ...(error.headers ?? {}) } },
    );
  }
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return NextResponse.json(
      {
        error: {
          code: "invalid_input",
          message: "Request validation failed.",
          request_id: requestId,
          field_errors: fieldErrors,
        },
      },
      { status: 400, headers: { ...NO_STORE, "x-request-id": requestId } },
    );
  }
  console.error("[api] unhandled error", requestId, error);
  return NextResponse.json(
    {
      error: {
        code: "server_error",
        message: "An unexpected error occurred.",
        request_id: requestId,
      },
    },
    { status: 500, headers: { ...NO_STORE, "x-request-id": requestId } },
  );
}

export function dataResponse(data: unknown, status = 200, meta?: Record<string, unknown>) {
  return NextResponse.json(meta ? { data, meta } : { data }, {
    status,
    headers: { ...NO_STORE, "x-request-id": crypto.randomUUID() },
  });
}

export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    return errorResponse(error);
  }
}
