import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

function getUserIdFromRequest(request: { headers?: { authorization?: string } }): string | null {
  if (!request.headers?.authorization) return null;
  const token = request.headers.authorization.slice(7);
  const payload = new JwtService().decode(token) as Record<string, { user?: { id?: string } }> | null;
  return payload?.['user']?.['id'] ?? null;
}

export const UserId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const id = getUserIdFromRequest(ctx.switchToHttp().getRequest());
  if (id == null) throw new UnauthorizedException();
  return id;
});

export const UserIdOptional = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  return getUserIdFromRequest(ctx.switchToHttp().getRequest());
});
export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  if (request.headers.authorization) {
    const bearerToken: string = request?.headers?.authorization;
    const token: string = bearerToken.slice(7);
    const payload = new JwtService().decode(token);
    if (payload?.['user']?.['id']) {
      const user = {
        id: payload['user']['id'],
        type: payload['userType'],
      };

      return user;
    }
  }
  return null;
});
