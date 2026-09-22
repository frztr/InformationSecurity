/**
 * Контекст HTTP-обработчика: запрос и параметры маршрута Next.js.
 */
export type HttpContext = {
  request: Request;
  params: Promise<Record<string, string>>;
};

/**
 * Асинхронный обработчик HTTP.
 */
export type HttpHandler<TContext extends HttpContext = HttpContext> = (context: TContext) => Promise<Response>;

type AnyHandler = (context: any) => Promise<Response>;
type Middleware = (next: AnyHandler) => AnyHandler;

type NextRouteHandler = (
  request: Request,
  context?: { params?: Promise<Record<string, string>> },
) => Promise<Response>;

/**
 * Сворачивает промежуточные обработчики справа налево вокруг конечного.
 * @param middlewares Промежуточные обработчики.
 * @returns Функция, принимающая конечный обработчик.
 */
function compose(...middlewares: Middleware[]) {
  return (handler: AnyHandler): AnyHandler => middlewares.reduceRight((next, middleware) => middleware(next), handler);
}

/**
 * Собирает маршрут Next.js: последний аргумент — обработчик, остальные — middleware.
 * @param layers Middleware и конечный обработчик.
 * @returns Обработчик `(request, routeContext) => Response`.
 */
export function endpoint(...layers: [...Middleware[], AnyHandler]): NextRouteHandler {
  const handler = layers[layers.length - 1] as AnyHandler;
  const middlewares = layers.slice(0, -1) as Middleware[];
  const run = compose(...middlewares)(handler);

  return (request, routeContext = {}) =>
    run({
      request,
      params: routeContext.params ?? Promise.resolve({}),
    });
}
