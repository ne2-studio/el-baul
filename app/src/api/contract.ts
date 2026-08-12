import type { paths } from './generated/schema';

type Operation<Path extends keyof paths, Method extends keyof paths[Path]> = NonNullable<paths[Path][Method]>;

type JsonContent<Response> = Response extends { content: infer Content }
  ? Content extends { 'application/json': infer Json }
    ? Json
    : Content extends { 'text/json': infer TextJson }
      ? TextJson
      : Content extends { 'text/plain': infer TextPlain }
        ? TextPlain
        : never
  : never;

export type JsonResponse<Path extends keyof paths, Method extends keyof paths[Path]> =
  Operation<Path, Method> extends { responses: infer Responses }
    ? 200 extends keyof Responses
      ? JsonContent<Responses[200]>
      : never
    : never;

export type JsonRequest<Path extends keyof paths, Method extends keyof paths[Path]> =
  Operation<Path, Method> extends { requestBody?: { content: infer Content } }
    ? Content extends { 'application/json': infer Json }
      ? Json
      : Content extends { 'text/json': infer TextJson }
        ? TextJson
        : Content extends { 'application/*+json': infer AnyJson }
          ? AnyJson
          : never
    : never;

export type PathTemplate = keyof paths;

export function path<Path extends PathTemplate>(
  template: Path,
  params: Record<string, string> = {},
  query?: URLSearchParams
): string {
  let result = template as string;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`{${key}}`, encodeURIComponent(value));
  }
  return query ? `${result}?${query}` : result;
}
