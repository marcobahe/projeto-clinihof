import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserWorkspace } from '@/lib/workspace';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/settings - Get workspace settings
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

    // Get or create settings
    let settings = await prisma.workspaceSettings.findUnique({
      where: { workspaceId: workspace.id },
    });

    if (!settings) {
      settings = await prisma.workspaceSettings.create({
        data: {
          workspaceId: workspace.id,
        },
      });
    }

    // Check if user has Google account connected
    const googleAccount = await prisma.account.findFirst({
      where: {
        userId: (session.user as any).id,
        provider: 'google',
      },
    });

    return NextResponse.json({
      ...settings,
      hasGoogleAccount: !!googleAccount,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update workspace settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      monthlyFixedCosts,
      monthlyWorkingHours,
      googleCalendarEnabled,
      googleCalendarId,
      paymentTerms,
      quoteTerms,
    } = body;

    // Calculate hourly clinic cost
    let hourlyClinicCost: number | null = null;
    const costs = monthlyFixedCosts ?? 0;
    const hours = monthlyWorkingHours ?? 176;
    
    if (hours > 0) {
      hourlyClinicCost = costs / hours;
    }

    const settings = await prisma.workspaceSettings.upsert({
      where: { workspaceId: workspace.id },
      update: {
        ...(monthlyFixedCosts !== undefined && { monthlyFixedCosts: parseFloat(monthlyFixedCosts) }),
        ...(monthlyWorkingHours !== undefined && { monthlyWorkingHours: parseFloat(monthlyWorkingHours) }),
        ...(hourlyClinicCost !== null && { hourlyClinicCost }),
        ...(googleCalendarEnabled !== undefined && { googleCalendarEnabled }),
        ...(googleCalendarId !== undefined && { googleCalendarId }),
        ...(paymentTerms !== undefined && { paymentTerms: paymentTerms || null }),
        ...(quoteTerms !== undefined && { quoteTerms: quoteTerms || null }),
      },
      create: {
        workspaceId: workspace.id,
        monthlyFixedCosts: parseFloat(monthlyFixedCosts) || 0,
        monthlyWorkingHours: parseFloat(monthlyWorkingHours) || 176,
        hourlyClinicCost,
        googleCalendarEnabled: googleCalendarEnabled || false,
        googleCalendarId: googleCalendarId || null,
        paymentTerms: paymentTerms || null,
        quoteTerms: quoteTerms || null,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// POST /api/settings/calculate-costs - Calculate total monthly costs from Cost model
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await getUserWorkspace((session.user as any).id);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Calculate total monthly fixed costs from Cost model
    const costs = await prisma.cost.findMany({
      where: {
        workspaceId: workspace.id,
        isActive: true,
        costType: 'FIXED',
        isRecurring: true,
      },
    });

    const totalMonthlyFixedCosts = costs.reduce((sum, cost) => {
      return sum + (cost.fixedValue || 0);
    }, 0);

    // Update settings with calculated costs
    const settings = await prisma.workspaceSettings.upsert({
      where: { workspaceId: workspace.id },
      update: {
        monthlyFixedCosts: totalMonthlyFixedCosts,
        hourlyClinicCost: totalMonthlyFixedCosts / 176, // Default 176 hours
      },
      create: {
        workspaceId: workspace.id,
        monthlyFixedCosts: totalMonthlyFixedCosts,
        hourlyClinicCost: totalMonthlyFixedCosts / 176,
      },
    });

    return NextResponse.json({
      success: true,
      totalMonthlyFixedCosts,
      settings,
    });
  } catch (error) {
    console.error('Error calculating costs:', error);
    return NextResponse.json(
      { error: 'Failed to calculate costs' },
      { status: 500 }
    );
  }
}
