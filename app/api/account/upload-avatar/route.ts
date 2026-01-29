import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadFile, getFileUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3 (public file for avatar)
    const cloud_storage_path = await uploadFile(buffer, file.name, true);

    // Get public URL
    const imageUrl = await getFileUrl(cloud_storage_path, true);

    // Update user image
    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { image: imageUrl },
    });

    return NextResponse.json({ message: 'Avatar atualizado com sucesso', imageUrl });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return NextResponse.json({ error: 'Erro ao fazer upload do avatar' }, { status: 500 });
  }
}
