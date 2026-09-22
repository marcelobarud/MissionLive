import { ValidationPipe } from '@nestjs/common';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import sharp from 'sharp';
import { AuthGuard } from '../src/auth/auth.guard';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { AvatarsController } from '../src/avatars/avatars.controller';
import { AvatarsService, MAX_AVATAR_BYTES } from '../src/avatars/avatars.service';
import { GoalsController } from '../src/goals/goals.controller';
import { GoalsService, MAX_GOAL_PHOTO_BYTES } from '../src/goals/goals.service';
import { TeamsController } from '../src/teams/teams.controller';
import { MAX_TEAM_IMAGE_BYTES, TeamsService } from '../src/teams/teams.service';

const avatarService = { upload: jest.fn().mockResolvedValue({ uploaded: true }) };
const teamService = { uploadImage: jest.fn().mockResolvedValue({ uploaded: true }) };
const goalsService = { addPhoto: jest.fn().mockResolvedValue({ uploaded: true }) };

let authenticated = true;
let guardReached: (() => void) | undefined;
let app: INestApplication | undefined;
let baseUrl: string;
let imageBytes: Buffer;

const uploadCases = [
  { path: '/profile/avatar/upload', handler: avatarService.upload, fileIndex: 1, maxBytes: MAX_AVATAR_BYTES },
  { path: '/teams/team-a/image', handler: teamService.uploadImage, fileIndex: 2, maxBytes: MAX_TEAM_IMAGE_BYTES },
  { path: '/goals/goal-a/photos', handler: goalsService.addPhoto, fileIndex: 3, maxBytes: MAX_GOAL_PHOTO_BYTES },
] as const;

function createMultipart(path: string, bytes: Buffer, fileField = 'file') {
  const form = new FormData();
  form.append(fileField, new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }), 'upload.jpg');
  if (path.startsWith('/goals/')) {
    form.append('title', 'Registro do avanço');
    form.append('description', 'Uma lembrança do progresso da meta.');
    form.append('goalStepId', '11111111-1111-4111-8111-111111111111');
  }
  return form;
}

describe('limites multipart das imagens', () => {
  beforeAll(async () => {
    imageBytes = await sharp({ create: { width: 24, height: 24, channels: 3, background: 'teal' } }).jpeg().toBuffer();
    const moduleBuilder = Test.createTestingModule({
      controllers: [AvatarsController, TeamsController, GoalsController],
      providers: [
        { provide: AvatarsService, useValue: avatarService },
        { provide: TeamsService, useValue: teamService },
        { provide: GoalsService, useValue: goalsService },
      ],
    });
    moduleBuilder.overrideGuard(AuthGuard).useValue({
      canActivate: (context: ExecutionContext) => {
        guardReached?.();
        if (!authenticated) return false;
        context.switchToHttp().getRequest().user = { id: 'user-a' };
        return true;
      },
    });
    const moduleRef = await moduleBuilder.compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => { await app?.close(); });

  beforeEach(() => {
    authenticated = true;
    guardReached = undefined;
    avatarService.upload.mockClear();
    teamService.uploadImage.mockClear();
    goalsService.addPhoto.mockClear();
  });

  it.each(uploadCases)('aceita o multipart legítimo em $path e entrega o buffer ao processamento', async (upload) => {
    const response = await fetch(`${baseUrl}${upload.path}`, { method: 'POST', body: createMultipart(upload.path, imageBytes) });
    const responseText = await response.text();
    if (response.status !== 201) throw new Error(`Resposta inesperada em ${upload.path}: ${responseText}`);
    expect(upload.handler).toHaveBeenCalledTimes(1);
    const file = upload.handler.mock.calls[0][upload.fileIndex];
    expect(Buffer.isBuffer(file.buffer)).toBe(true);
    expect(file.buffer).toEqual(imageBytes);
    expect(file.size).toBe(imageBytes.byteLength);
  });

  it.each(uploadCases)('rejeita arquivo acima de 5 MB em $path sem chamar o serviço', async (upload) => {
    const oversized = Buffer.alloc(upload.maxBytes + 1);
    const response = await fetch(`${baseUrl}${upload.path}`, { method: 'POST', body: createMultipart(upload.path, oversized) });
    const body = await response.json() as { statusCode: number; message: string };
    expect(response.status).toBe(413);
    expect(body.statusCode).toBe(413);
    expect(upload.handler).not.toHaveBeenCalled();
  });

  it.each(uploadCases)('exige o campo de arquivo file em $path', async (upload) => {
    const response = await fetch(`${baseUrl}${upload.path}`, { method: 'POST', body: createMultipart(upload.path, imageBytes, 'wrong-file-field') });
    expect(response.status).toBe(400);
    expect(upload.handler).not.toHaveBeenCalled();
  });

  it('rejeita nomes de campo maiores que o limite do parser', async () => {
    const form = createMultipart('/profile/avatar/upload', imageBytes);
    form.append('x'.repeat(101), 'extra');
    const response = await fetch(`${baseUrl}/profile/avatar/upload`, { method: 'POST', body: form });
    expect(response.status).toBe(400);
    expect(avatarService.upload).not.toHaveBeenCalled();
  });

  it('rejeita campos, arquivos e partes extras antes de chamar o processamento', async () => {
    const tooManyFields = createMultipart('/goals/goal-a/photos', imageBytes);
    tooManyFields.append('extra', 'campo não aceito');
    const fieldResponse = await fetch(`${baseUrl}/goals/goal-a/photos`, { method: 'POST', body: tooManyFields });
    expect(fieldResponse.status).toBe(400);

    const tooManyFiles = createMultipart('/profile/avatar/upload', imageBytes);
    tooManyFiles.append('file', new Blob([new Uint8Array(imageBytes)], { type: 'image/jpeg' }), 'second.jpg');
    const fileResponse = await fetch(`${baseUrl}/profile/avatar/upload`, { method: 'POST', body: tooManyFiles });
    expect(fileResponse.status).toBe(400);
    expect(goalsService.addPhoto).not.toHaveBeenCalled();
    expect(avatarService.upload).not.toHaveBeenCalled();
  });

  it('responde com 400 seguro para um multipart malformado', async () => {
    const boundary = 'missionlive-malformed';
    const response = await fetch(`${baseUrl}/profile/avatar/upload`, {
      method: 'POST',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body: `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="broken.jpg"\r\nContent-Type: image/jpeg\r\n\r\npartial`,
    });
    const responseText = await response.text();
    expect(response.status).toBe(400);
    expect(responseText).not.toMatch(/stack|node_modules|apps[\\/]api/i);
    expect(avatarService.upload).not.toHaveBeenCalled();
  });

  it.each(uploadCases)('mantém autenticação obrigatória em $path', async (upload) => {
    authenticated = false;
    const response = await fetch(`${baseUrl}${upload.path}`, { method: 'POST', body: createMultipart(upload.path, imageBytes) });
    expect(response.status).toBe(403);
    expect(upload.handler).not.toHaveBeenCalled();
  });

  it('continua atendendo uploads válidos após um cliente abortar o corpo multipart', async () => {
    const boundary = 'missionlive-aborted';
    let notifyGuard!: () => void;
    const requestReachedGuard = new Promise<void>((resolve) => { notifyGuard = resolve; });
    guardReached = notifyGuard;
    const request = httpRequest(`${baseUrl}/profile/avatar/upload`, {
      method: 'POST',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, 'transfer-encoding': 'chunked' },
    });
    request.on('error', () => undefined);
    const requestClosed = new Promise<void>((resolve) => request.once('close', resolve));
    request.flushHeaders();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        requestReachedGuard,
        new Promise<void>((_, reject) => { timeout = setTimeout(() => reject(new Error('O upload abortado não chegou à rota.')), 3_000); }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
    request.write(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="partial.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`);
    request.write(Buffer.alloc(1024));
    request.destroy();
    await requestClosed;
    guardReached = undefined;
    expect(avatarService.upload).not.toHaveBeenCalled();

    const response = await fetch(`${baseUrl}/profile/avatar/upload`, { method: 'POST', body: createMultipart('/profile/avatar/upload', imageBytes) });
    expect(response.status).toBe(201);
    expect(avatarService.upload).toHaveBeenCalledTimes(1);
  });
});
