import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // OPERACIONES DE USUARIO (CRUD)
  // -------------------------------------------------------------

  async create(createUserDto: CreateUserDto) {
    const { email, password, firstName, lastName, roleId, status } = createUserDto;

    // 1. Validar que el correo no esté registrado
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    // 2. Validar que el rol exista
    const roleExists = await this.prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!roleExists) {
      throw new BadRequestException('El rol especificado no existe.');
    }

    // 3. Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Crear usuario en base de datos
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        roleId,
        status: status || UserStatus.ACTIVE,
      },
      include: {
        role: true,
      },
    });

    // 5. Excluir contraseña en el retorno
    const { password: _, ...result } = user;
    return result;
  }

  async findAll(status?: UserStatus, roleId?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (roleId) where.roleId = roleId;

    const users = await this.prisma.user.findMany({
      where,
      include: {
        role: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Excluir contraseñas de la lista
    return users.map(({ password, ...user }) => user);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: true, // Incluimos permisos de su rol
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    const { password, ...result } = user;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // 1. Verificar existencia del usuario
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    const updateData: any = { ...updateUserDto };

    // 2. Si cambia el correo, validar unicidad
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('El nuevo correo electrónico ya está registrado.');
      }
    }

    // 3. Si cambia el rol, validar existencia
    if (updateUserDto.roleId) {
      const roleExists = await this.prisma.role.findUnique({
        where: { id: updateUserDto.roleId },
      });
      if (!roleExists) {
        throw new BadRequestException('El rol especificado no existe.');
      }
    }

    // 4. Si cambia la contraseña, encriptar
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // 5. Guardar cambios
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
      },
    });

    const { password: _, ...result } = updatedUser;
    return result;
  }

  async updateStatus(id: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status },
      include: {
        role: true,
      },
    });

    const { password: _, ...result } = updatedUser;
    return result;
  }

  async softDelete(id: string) {
    // Ejecutar baja lógica cambiando estado a INACTIVE
    return this.updateStatus(id, UserStatus.INACTIVE);
  }

  // -------------------------------------------------------------
  // OPERACIONES DE ROLES Y PERMISOS
  // -------------------------------------------------------------

  async findAllRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: true,
      },
    });
  }

  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    // 1. Validar que el rol exista
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Rol con ID ${roleId} no encontrado.`);
    }

    // 2. Validar que todos los IDs de permisos existan en la BD
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
      },
    });
    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('Uno o más IDs de permisos especificados no existen.');
    }

    // 3. Asignar los permisos (reemplaza los existentes)
    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: {
          set: permissionIds.map((id) => ({ id })),
        },
      },
      include: {
        permissions: true,
      },
    });
  }
}
