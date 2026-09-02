/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Network, Shield, ShieldAlert } from 'lucide-react';
import { api } from '../api/client';
import type { AuditLogEntry, DuplicateIdentityRow } from '../api/types';
import ConfirmModal from './shared/ConfirmModal';
import { ToastContainer, useToast } from '../hooks/useToast';
import AuditLogCard from './geo/AuditLogCard';
import IdentitiesTable from './geo/IdentitiesTable';
import NodeOperationsPanel from './geo/NodeOperationsPanel';
import RiskIndicatorsGrid from './geo/RiskIndicatorsGrid';
import RiskNetworkGraph from './geo/RiskNetworkGraph';
import type { GraphNode, OperationLogItem, SimLink } from './geo/riskTypes';
import { toOperationStatus } from './geo/riskTypes';

export default function GeographicRiskView() {
  const [identities, setIdentities] = useState<DuplicateIdentityRow[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchWord, setSearchWord] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 320, height: 280 });
  const [blockConfirm, setBlockConfirm] = useState<{idNo: string; name: string} | null>(null);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  const { toasts, dismissToast, toastSuccess, toastError, toastWarning } = useToast();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const highRiskNotifiedRef = useRef(false);
  const zoomFnsRef = useRef<{ zoomIn: () => void; zoomOut: () => void; reset: () => void; restart: () => void } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        setFetchError(null);
        const [idents, auditLogs] = await Promise.all([
          api.getDuplicateIdentities(),
          api.getAuditLogs(),
        ]);
        if (!mounted) return;
        setIdentities(idents || []);
        setLogs(auditLogs || []);
      } catch (err: unknown) {
        if (!mounted) return;
        setFetchError(err instanceof Error ? err.message : String(err));
        setIdentities([]);
        setLogs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
     fetchData();
    return () => { mounted = false; };
  }, []);

  // تنبيه أمني فوري عند رؤية هوية خطر عالٍ جداً بعد تحميل البيانات
  useEffect(() => {
    if (loading || highRiskNotifiedRef.current) return;
    const highRisk = identities.filter((i) => i.risk === 'مرتفع جداً');
    if (highRisk.length > 0) {
      highRiskNotifiedRef.current = true;
      const names = highRisk.slice(0, 3).map((i) => i.name).join('، ');
      toastWarning(
        'تحذير أمني فوري',
        `${highRisk.length} هوية مرتبطة بخطر عالٍ جداً في الشبكة (${names}${highRisk.length > 3 ? ' …' : ''}). تم توجيهها إلى مراجعة فورية.`
      );
    }
  }, [loading, identities, toastWarning]);

  const summaryStats = useMemo(() => {
    const total = identities.length;
    const highRiskCount = identities.filter((i) => i.risk === 'مرتفع جداً').length;
    const mediumRiskCount = identities.filter((i) => i.risk === 'مرتفع').length;
    const lowRiskCount = identities.filter((i) => i.risk === 'متوسط').length;
    const riskPct = total > 0 ? ((highRiskCount / total) * 100) : 0;
    const underReview = identities.filter((i) => i.duplicatesCount >= 3).length;
    const underReviewPct = total > 0 ? ((underReview / total) * 100) : 0;
    const highBarPct = total > 0 ? (highRiskCount / total * 100) : 0;
    const medBarPct = total > 0 ? (mediumRiskCount / total * 100) : 0;
    const lowBarPct = total > 0 ? (lowRiskCount / total * 100) : 0;
    return { total, highRiskCount, mediumRiskCount, lowRiskCount, riskPct, underReview, underReviewPct, highBarPct, medBarPct, lowBarPct };
  }, [identities]);

  const distinctRegionsCount = useMemo(() => new Set(identities.map((i) => i.region).filter(Boolean)).size, [identities]);

  // Real operations feed derived from the audit-log API (no hardcoded entries)
  const activeLogs: OperationLogItem[] = useMemo(() => {
    if (!selectedNode) return [];
    const label = String(selectedNode.label ?? '');
    const region = String(selectedNode.region ?? '');
    const idNo = String(selectedNode.idNo ?? '');
    return logs
      .filter((log) => {
        const hay = `${log.title} ${log.user} ${log.type}`;
        return (label && hay.includes(label)) || (region && hay.includes(region)) || (idNo && hay.includes(idNo));
      })
      .slice(0, 20)
      .map((log) => ({
        id: String(log.id),
        action: log.title,
        time: log.time,
        status: toOperationStatus(log.status),
        details: `بواسطة: ${log.user}`,
      }));
  }, [selectedNode, logs]);

  // Auto-resize tracker for responsive canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({
        width: Math.max(320, width),
        height: Math.max(280, height || 380)
      });
    });
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Handle flag risk alerts
  const handleFlagRow = async (idNo: string, name: string) => {
    try {
      setActionLoading((p) => ({ ...p, [`flag-${idNo}`]: true }));
      await api.flagDuplicateIdentity(idNo, { name });
      toastSuccess(`تم إرسال بلاغ أمني لإشتباه الهوية: ${name} (ID: ${idNo}) إلى عقد المراجعة الفورية ورُفع بمستوى التحذير.`);
      // Reflect action in the local identities table.
      setIdentities((prev) => prev.map((i) => i.idNo === idNo ? { ...i, flagged: true, reviewStatus: 'flagged' } : i));
      // Refresh audit log feed from server.
      try {
        const auditLogs = await api.getAuditLogs();
        if (Array.isArray(auditLogs)) setLogs(auditLogs);
      } catch { /* non-fatal */ }
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading((p) => ({ ...p, [`flag-${idNo}`]: false }));
    }
  };

  const handleBlockRow = (idNo: string, name: string) => {
    setBlockConfirm({ idNo, name });
  };

  const executeBlock = async () => {
    if (!blockConfirm) return;
    const { idNo, name } = blockConfirm;
    try {
      setActionLoading((p) => ({ ...p, [`block-${idNo}`]: true }));
      await api.blockDuplicateIdentity(idNo, { name });
      toastSuccess(`تم تجميد وحظر الهوية رقم ${idNo} (${name}) وإيقاف جميع الشرائح المرتبطة بها مؤقتاً.`);
      // Reflect action in the local identities table.
      setIdentities((prev) => prev.map((i) => i.idNo === idNo ? { ...i, blocked: true, flagged: true, reviewStatus: 'blocked' } : i));
      try {
        const auditLogs = await api.getAuditLogs();
        if (Array.isArray(auditLogs)) setLogs(auditLogs);
      } catch { /* non-fatal */ }
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading((p) => ({ ...p, [`block-${idNo}`]: false }));
      setBlockConfirm(null);
    }
  };

  const filteredIdentities = identities.filter(
    (item) => (item.name ?? '').includes(searchWord) || (item.idNo ?? '').includes(searchWord) || (item.region ?? '').includes(searchWord)
  );

  const handleInspect = (item: DuplicateIdentityRow) => {
    setSelectedNode({
      id: item.idNo,
      label: item.name,
      type: 'identity',
      color: item.risk === 'مرتفع جداً' ? '#dc2626' : '#eab308',
      size: 15,
      region: item.region,
      idNo: item.idNo,
      sims: item.simsCount,
      risk: item.risk,
      flagged: item.flagged,
      blocked: item.blocked,
      reviewStatus: item.reviewStatus
    });
    document.getElementById('d3-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // D3 Interactive Simulation Engine logic
  useEffect(() => {
    if (!svgRef.current) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear contents before update

    // Map region names from API data to dynamic node IDs
    const regionNames = [...new Set(identities.map((m) => m.region).filter(Boolean))];
    const regionsMap: Record<string, string> = {};
    regionNames.forEach((r: string, idx: number) => { regionsMap[r] = `region-${idx}`; });

    // 1. Build Nodes
    const baseNodes: GraphNode[] = [
      ...Object.entries(regionsMap).map(([regionName, regionId]): GraphNode => {
        const regionIdentities = identities.filter((m) => m.region === regionName);
        const hrc = regionIdentities.filter((m) => m.risk === 'مرتفع جداً').length;
        const riskLevel: string = hrc > 2 ? 'مرتفع جداً' : hrc > 0 ? 'متوسط' : 'منخفض';
        const color = riskLevel === 'مرتفع جداً' ? '#ef4444' : riskLevel === 'متوسط' ? '#f59e0b' : '#3b82f6';
        return { id: regionId, label: regionName, type: 'city', color, size: 24, risk: riskLevel };
      }),
      { id: 'telecom-backbone', label: 'بوابة المراقبة والربط', type: 'checkpoint', color: '#64748b', size: 18, risk: 'آمن' }
    ];

    const identityNodes: GraphNode[] = identities.map((m): GraphNode => {
      return {
        id: m.idNo,
        label: m.name,
        type: 'identity',
        color: m.risk === 'مرتفع جداً' ? '#dc2626' : '#eab308',
        size: 15,
        region: m.region,
        idNo: m.idNo,
        sims: m.simsCount,
        risk: m.risk
      };
    });

    const graphNodes = [...baseNodes, ...identityNodes];

    // 2. Build Links representation
    const graphLinks: SimLink[] = [
      ...baseNodes.filter(n => n.id !== 'telecom-backbone').map(n => ({ source: 'telecom-backbone', target: n.id, value: 2 })),

      ...identities.map(m => ({
        source: m.idNo,
        target: regionsMap[m.region] || 'telecom-backbone',
        value: 1
      })),
    ];

    // Clone inputs safely to prevent react rendering loops
    const simNodes = graphNodes.map(n => ({ ...n }));
    const simLinks = graphLinks.map(l => ({
      source: l.source,
      target: l.target,
      value: l.value
    }));

    // Setup zoom container group with grids
    const mainGroup = svg.append('g').attr('class', 'chart-group');

    // Grid system lines
    const gridPattern = svg.append('defs')
      .append('pattern')
      .attr('id', 'd3-grid-lines')
      .attr('width', 30)
      .attr('height', 30)
      .attr('patternUnits', 'userSpaceOnUse');

    gridPattern.append('path')
      .attr('d', 'M 30 0 L 0 0 0 30')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(71, 85, 105, 0.25)')
      .attr('stroke-width', 0.5);

    mainGroup.append('rect')
      .attr('width', width * 3)
      .attr('height', height * 3)
      .attr('x', -width)
      .attr('y', -height)
      .attr('fill', 'url(#d3-grid-lines)')
      .attr('opacity', 0.6);

    // Dynamic interconnectivity channel lines
    const link = mainGroup.append('g')
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', d => d.value === 3 ? '#ef4444' : '#475569')
      .attr('stroke-opacity', d => d.value === 3 ? 0.95 : 0.6)
      .attr('stroke-width', d => d.value === 3 ? 2.5 : 1.5)
      .attr('stroke-dasharray', d => d.value === 3 ? '4,4' : d.value === 2 ? '2,1' : null);

    // Draw Node components
    const node = mainGroup.append('g')
      .selectAll<SVGGElement, GraphNode>('.node')
      .data(simNodes)
      .join<SVGGElement>('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )
      .on('click', (_event, d) => {
        setSelectedNode(d);
      });

    // Add pulsed halo around major critical spots
    node.filter(d => d.risk === 'مرتفع جداً')
      .append('circle')
      .attr('r', d => d.size + 6)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.45)
      .attr('class', 'animate-pulse');

    // Add node fill color block
    node.append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => d.color)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2.5)
      .style('filter', d => `drop-shadow(0 0 4px ${d.color}cc)`);

    // Add visual inner overlay abbreviation letters
    node.append('text')
      .attr('dy', '.3em')
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', d => d.type === 'city' ? '10px' : '9px')
      .attr('font-family', 'IBM Plex Sans Arabic, sans-serif')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(d => {
        if (d.type === 'city') return d.label.substring(0, 4);
        if (d.type === 'checkpoint') return 'بوابة';
        return d.label.split(' ').map((w: string) => w[0]).join('');
      });

    // Add detailed text descriptions below the node circles
    node.append('text')
      .attr('y', d => d.size + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'IBM Plex Sans Arabic, sans-serif')
      .attr('font-weight', '500')
      .style('pointer-events', 'none')
      .text(d => d.label);

    // Force simulation configurations
    const simulation = d3.forceSimulation<GraphNode>(simNodes)
      .force('link', d3.forceLink<GraphNode, SimLink>(simLinks).id(d => d.id).distance(110))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => d.size + 24));

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0);

      node
        .attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Drag simulation triggers
    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.2).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Zooming functionality configuration
    const d3Zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
      });

    svg.call(d3Zoom);

    // Expose zoom control functions via ref instead of polluting window.
    zoomFnsRef.current = {
      zoomIn: () => { svg.transition().duration(250).call((sel) => d3Zoom.scaleBy(sel, 1.35)); },
      zoomOut: () => { svg.transition().duration(250).call((sel) => d3Zoom.scaleBy(sel, 0.75)); },
      reset: () => { svg.transition().duration(250).call((sel) => d3Zoom.transform(sel, d3.zoomIdentity)); },
      restart: () => { simulation.alpha(1).restart(); },
    };

    return () => {
      simulation.stop();
      zoomFnsRef.current = null;
    };
  }, [dimensions, identities]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">جاري تحميل بيانات الهويات المكررة...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <ShieldAlert size={40} className="text-red-500 mb-4" />
        <p className="text-sm text-red-400 mb-2">{fetchError}</p>
        <button onClick={() => window.location.reload()} className="btn btn-sm mt-2">إعادة المحاولة</button>
      </div>
    );
  }

  if (identities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Shield size={40} className="text-slate-500 mb-4" />
        <p className="text-base font-bold text-slate-300 mb-1">لا توجد بيانات مخاطر حالياً</p>
        <p className="text-sm text-slate-500">لم يتم العثور على هويات مكررة في قاعدة البيانات</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <RiskIndicatorsGrid stats={summaryStats} distinctRegionsCount={distinctRegionsCount} />

      <IdentitiesTable
        identities={filteredIdentities}
        searchWord={searchWord}
        onSearchChange={setSearchWord}
        actionLoading={actionLoading}
        onFlag={handleFlagRow}
        onBlock={handleBlockRow}
        onInspect={handleInspect}
      />

      {/* D3 Graphical Interactive Network Graph Section */}
      <div id="d3-section" className="space-y-4 pt-4 border-t border-gray-200">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Network className="text-secondary shrink-0" size={20} />
            مخطط ترابط الهويات التفاعلي والتوزيع الجغرافي (D3 Force-Directed Graph)
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed max-w-4xl mt-1">
            رسم بياني مرئي يوضح اتصال الهويات الوطنية وعلاقتها بالمدن الإقليمية. يمثل الخط الأحمر تداخلاً مشتبهاً به أو تفرعاً مكرراً لنفس الهويات بين أكثر من محافظة. انقر على أي عقدة لاستكشاف سجل عملياتها بالخط الزمني.
          </p>
        </div>

        {/* Master Container Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RiskNetworkGraph svgRef={svgRef} containerRef={containerRef} dimensions={dimensions} zoomFns={zoomFnsRef.current} />

          <NodeOperationsPanel
            selectedNode={selectedNode}
            activeLogs={activeLogs}
            identities={identities}
            actionLoading={actionLoading}
            onClose={() => setSelectedNode(null)}
            onFlag={handleFlagRow}
            onBlock={handleBlockRow}
          />
        </div>
      </div>

      <AuditLogCard logs={logs} />

      <ConfirmModal
        open={blockConfirm !== null}
        onConfirm={executeBlock}
        onCancel={() => setBlockConfirm(null)}
        title="تأكيد حظر الهوية"
        message={blockConfirm ? `هل أنت متأكد من رغبتك بحظر الهوية رقم ${blockConfirm.idNo} مؤقتاً بالشبكة الوطنية؟` : ''}
        confirmLabel="نعم، حظر الهوية"
        cancelLabel="تراجع"
        variant="danger"
      />
    </div>
  );
}