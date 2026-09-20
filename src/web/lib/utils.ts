import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn の慣例どおり、条件付きクラスと Tailwind の重複クラスをまとめて解決する。 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))
