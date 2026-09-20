import type { API_ERROR_CODES } from '@/shared/api'

/**
 * /api 配下で投げる想定内のエラー。api.onError（src/api/index.ts）がここでの
 * code をそのまま ApiErrorSchema の code に渡す。想定外の例外はここを通さず、
 * onError 側で code: 'internal' の 500 に丸める。
 */
export class ApiError extends Error {
  readonly code: Exclude<(typeof API_ERROR_CODES)[number], 'internal'>
  readonly status: 400 | 404

  constructor(code: 'bad_request' | 'not_found', message: string) {
    super(message)
    this.code = code
    this.status = code === 'not_found' ? 404 : 400
  }
}

export const badRequestError = (message: string): ApiError => new ApiError('bad_request', message)

export const notFoundError = (message: string): ApiError => new ApiError('not_found', message)
