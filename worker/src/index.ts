import { tratar } from './app'
import type { Env } from './tipos'

export default {
  fetch: (request: Request, env: Env) => tratar(request, env),
} satisfies ExportedHandler<Env>
