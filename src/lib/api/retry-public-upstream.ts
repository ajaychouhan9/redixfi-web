import { ApiError } from "./client";

// A brief gateway outage should get one uncached retry before a public page
// fails. A real 404 is never retried or converted into a success response.
export async function retryTransientPublicGet<T>(
  first: () => Promise<T>,
  retry: () => Promise<T>,
): Promise<T> {
  try {
    return await first();
  } catch (error) {
    if (error instanceof ApiError && [502, 503, 504].includes(error.status)) {
      return retry();
    }
    throw error;
  }
}
