import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = require('../src/app');
const dbConfig = require('../src/config/db');
const envConfig = require('../src/config/env');

const { prisma } = dbConfig;

describe('Suite de Pruebas: Autenticación y Autorización (Fase 4)', () => {

  beforeEach(() => {
    vi.restoreAllMocks();
    
    // 💡 Simular conexión de BD exitosa por defecto
    vi.spyOn(dbConfig, 'checkDatabaseConnection').mockResolvedValue(true);
    
    // 💡 Simular transacción de Prisma
    vi.spyOn(prisma, '$transaction').mockImplementation((cb) => cb(prisma));
    
    // 💡 Mockear por defecto todos los métodos del ORM con respuestas vacías o neutras
    // para evitar que se intente conectar a la BD real en tests no específicos.
    vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'create').mockResolvedValue({});
    vi.spyOn(prisma.user, 'update').mockResolvedValue({});
    vi.spyOn(prisma.role, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.userRole, 'createMany').mockResolvedValue({});
    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({});
    vi.spyOn(prisma.refreshToken, 'create').mockResolvedValue({});
    vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.refreshToken, 'deleteMany').mockResolvedValue({});
    vi.spyOn(prisma.refreshToken, 'delete').mockResolvedValue({});
  });

  describe('POST /api/auth/login - Inicio de Sesión', () => {
    
    const loginData = { email: 'test@elfogon.com', password: 'Password123!' };
    const mockHashedPassword = bcrypt.hashSync(loginData.password, 10);
    const mockUser = {
      id: 1,
      email: loginData.email,
      password: mockHashedPassword,
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      loginAttempts: 0,
      lockUntil: null
    };

    it('debería autenticar correctamente, retornar un Access Token y setear la cookie de Refresh Token', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      vi.spyOn(prisma.user, 'update').mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe(loginData.email);
      expect(res.headers['set-cookie'][0]).toContain('refreshToken');
    });

    it('debería retornar 401 si la contraseña es incorrecta e incrementar intentos', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser);
      const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: loginData.email, password: 'WrongPassword!' })
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Credenciales incorrectas');
      expect(updateSpy).toHaveBeenCalled();
    });

    it('debería retornar 423 si la cuenta está bloqueada temporalmente', async () => {
      const lockedUser = {
        ...mockUser,
        lockUntil: new Date(Date.now() + 10 * 60 * 1000) // Bloqueada por 10 min
      };
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(lockedUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(423);
      expect(res.body.message).toContain('Cuenta bloqueada temporalmente');
    });
  });

  describe('POST /api/auth/register - Registro de Personal', () => {

    const adminToken = jwt.sign({ userId: 1 }, envConfig.JWT_ACCESS_SECRET);
    const waiterToken = jwt.sign({ userId: 2 }, envConfig.JWT_ACCESS_SECRET);

    const newUserData = {
      email: 'mesero@elfogon.com',
      password: 'SecurePass123!',
      firstName: 'Pepe',
      lastName: 'Pérez',
      roles: ['MESERO']
    };

    const mockAdmin = {
      id: 1,
      email: 'admin@elfogon.com',
      isActive: true,
      roles: [{ role: { name: 'ADMINISTRADOR', deletedAt: null } }]
    };

    const mockWaiter = {
      id: 2,
      email: 'mesero1@elfogon.com',
      isActive: true,
      roles: [{ role: { name: 'MESERO', deletedAt: null } }]
    };

    it('debería rechazar el registro si no se proporciona token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(newUserData)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(401);
    });

    it('debería rechazar el registro si el rol del token no es ADMINISTRADOR', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockWaiter);

      const res = await request(app)
        .post('/api/auth/register')
        .send(newUserData)
        .set('Authorization', `Bearer ${waiterToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Acceso denegado');
    });

    it('debería permitir el registro si el rol es ADMINISTRADOR y la contraseña es robusta', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.role, 'findMany').mockResolvedValue([{ id: 2, name: 'MESERO', deletedAt: null }]);
      vi.spyOn(prisma.user, 'create').mockResolvedValue({ id: 10, email: newUserData.email });

      const res = await request(app)
        .post('/api/auth/register')
        .send(newUserData)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.user.email).toBe(newUserData.email);
    });

    it('debería rechazar el registro si la contraseña no cumple la política robusta', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockAdmin);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...newUserData, password: 'simplepassword' })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('La contraseña no cumple con la política de seguridad');
    });
  });

  describe('POST /api/auth/refresh - Ventana de Gracia Concurrente', () => {
    const activeRefreshToken = jwt.sign({ userId: 1 }, envConfig.JWT_REFRESH_SECRET);
    
    it('debería tolerar un refresco duplicado dentro de la ventana de gracia de 15 segundos', async () => {
      vi.spyOn(prisma.user, 'findFirst').mockResolvedValue({
        id: 1,
        email: 'admin@elfogon.com',
        isActive: true
      });

      // 1. Primer refresco exitoso
      vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue({
        id: 10,
        token: activeRefreshToken,
        userId: 1,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      vi.spyOn(prisma.refreshToken, 'delete').mockResolvedValue({});
      vi.spyOn(prisma.refreshToken, 'create').mockResolvedValue({ id: 11, token: 'NEW_REFRESH_TOKEN' });

      const res1 = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${activeRefreshToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res1.status).toBe(200);
      const token1 = res1.body.accessToken;

      // 2. Segundo refresco concurrente simulado (utiliza el mismo token anterior)
      // Como ya se borró de la BD, findUnique devolverá null
      vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue(null);
      const deleteManySpy = vi.spyOn(prisma.refreshToken, 'deleteMany').mockResolvedValue({});

      const res2 = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${activeRefreshToken}`)
        .set('x-skip-rate-limit', 'true');

      // Debería ser exitoso (200) y retornar el mismo accessToken gracias al caché de gracia en memoria,
      // sin gatillar el borrado de sesiones de contención (deleteMany)
      expect(res2.status).toBe(200);
      expect(res2.body.accessToken).toBe(token1);
      expect(deleteManySpy).not.toHaveBeenCalled();
    });

    it('debería denegar acceso y revocar sesiones (403) si el token reutilizado supera el tiempo de gracia', async () => {
      const expiredRefreshToken = jwt.sign({ userId: 99 }, envConfig.JWT_REFRESH_SECRET);
      
      vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue(null); // No está en la BD
      const deleteManySpy = vi.spyOn(prisma.refreshToken, 'deleteMany').mockResolvedValue({});

      // Llamada directa sin haberla registrado antes en rotatedTokensCache,
      // por lo que se asume que supera cualquier ventana de gracia o es un ataque real
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${expiredRefreshToken}`)
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Sesión inválida por posible compromiso de seguridad');
      expect(deleteManySpy).toHaveBeenCalledWith({
        where: { userId: 99 }
      });
    });
  });
});
