import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/agenda/futuros - List all future appointments with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Parse filter parameters
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : new Date();
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : null;
    const collaboratorId = searchParams.get('collaboratorId');
    const patientId = searchParams.get('patientId');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'scheduledDate';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build where clause
    const where: any = {
      sale: {
        workspaceId: workspace.id,
      },
      scheduledDate: {
        gte: startDate,
        ...(endDate && { lte: endDate }),
      },
    };

    // Filter by collaborator
    if (collaboratorId) {
      where.collaboratorId = collaboratorId;
    }

    // Filter by patient
    if (patientId) {
      where.sale = {
        ...where.sale,
        patientId,
      };
    }

    // Filter by status
    if (status && status !== 'all') {
      where.status = status;
    }

    // Search by patient name or procedure name
    if (search) {
      where.OR = [
        {
          sale: {
            patient: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
        {
          procedure: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    // Build orderBy
    let orderBy: any = {};
    if (sortBy === 'patientName') {
      orderBy = { sale: { patient: { name: sortOrder } } };
    } else if (sortBy === 'procedureName') {
      orderBy = { procedure: { name: sortOrder } };
    } else if (sortBy === 'collaboratorName') {
      orderBy = { collaborator: { name: sortOrder } };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    // Fetch appointments
    const appointments = await prisma.procedureSession.findMany({
      where,
      include: {
        sale: {
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            seller: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        procedure: {
          select: {
            id: true,
            name: true,
            duration: true,
            color: true,
          },
        },
      },
      orderBy,
    });

    // Calculate statistics
    const totalAppointments = appointments.length;
    const pendingCount = appointments.filter(a => a.status === 'PENDING').length;
    const scheduledCount = appointments.filter(a => a.status === 'SCHEDULED').length;
    const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;
    const cancelledCount = appointments.filter(a => a.status === 'CANCELLED').length;

    // Get unique patients
    const uniquePatients = new Set(appointments.map(a => a.sale.patientId)).size;

    // Get unique procedures
    const procedureCounts: Record<string, number> = {};
    appointments.forEach(a => {
      const name = a.procedure.name;
      procedureCounts[name] = (procedureCounts[name] || 0) + 1;
    });

    return NextResponse.json({
      appointments,
      stats: {
        total: totalAppointments,
        pending: pendingCount,
        scheduled: scheduledCount,
        completed: completedCount,
        cancelled: cancelledCount,
        uniquePatients,
        procedureCounts,
      },
    });
  } catch (error) {
    console.error('Error fetching future appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch future appointments' },
      { status: 500 }
    );
  }
}
