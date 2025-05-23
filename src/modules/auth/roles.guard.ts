import { CanActivate, ExecutionContext, Injectable, ForbiddenException, SetMetadata } from '@nestjs/common';
import 'reflect-metadata';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflectRoles(context);
    if (!roles.length) return true;
    const request = context.switchToHttp().getRequest();
    const userRole = request.user?.role;
    if (roles.includes(userRole)) return true;
    throw new ForbiddenException('Forbidden role');
  }
  
  private reflectRoles(context: ExecutionContext): string[] {
    const handler = context.getHandler();
    return Reflect.getMetadata(ROLES_KEY, handler) || [];
  }
}
