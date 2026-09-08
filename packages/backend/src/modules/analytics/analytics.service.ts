import { PrismaClient } from '@prisma/client';
import { AuthContext, assertIsAdministrator } from '../../authorization/index.js';

export interface AnalyticsKPIs {
  totalIncidents: number;
  incidentsByStatus: Record<string, number>;
  incidentsBySeverity: Record<string, number>;
  openIncidentsCount: number;
}

export class AnalyticsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getKPIs(context: AuthContext): Promise<AnalyticsKPIs> {
    assertIsAdministrator(context);
    const organizationId = context.organizationId;

    const [totalIncidents, incidentsByStatus, incidentsBySeverity, openIncidentsCount] = await Promise.all([
      this.prisma.incident.count({ where: { organizationId } }),
      this.prisma.incident.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
      }),
      this.prisma.incident.groupBy({
        by: ['severity'],
        where: { organizationId },
        _count: { _all: true },
      }),
      this.prisma.incident.count({
        where: {
          organizationId,
          status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] },
        },
      }),
    ]);

    const incidentsByStatusMap = incidentsByStatus.reduce<Record<string, number>>((acc, curr) => {
      acc[curr.status] = curr._count._all;
      return acc;
    }, {});

    const incidentsBySeverityMap = incidentsBySeverity.reduce<Record<string, number>>((acc, curr) => {
      acc[curr.severity] = curr._count._all;
      return acc;
    }, {});

    return {
      totalIncidents,
      incidentsByStatus: incidentsByStatusMap,
      incidentsBySeverity: incidentsBySeverityMap,
      openIncidentsCount,
    };
  }
}