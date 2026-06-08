/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { DUPLICATE_IDENTITIES_MOCKS, AUDIT_LOGS } from '../data';
import { AuditLog } from '../types';
import ConfirmModal from './shared/ConfirmModal';
import { 
  Network, 
  ShieldAlert, 
  MapPin, 
  Activity, 
  HelpCircle, 
  User, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  Download, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  Shield,
  FileText,
  X
} from 'lucide-react';

interface OperationLogItem {
  id: string;
  action: string;
  time: string;
  status: 'success' | 'failed' | 'warning';
  details: string;
}

const NODE_OPERATIONS_MAP: Record<string, OperationLogItem[]> = {
  '1023485932': [
    { id: 'op-1', action: 'محاولة تفعيل شريحة SIM مكررة', time: 'منذ ١٠ دقائق', status: 'warning', details: 'تكرار رقم الهوية عبر جهازين مختلفين في الفترات المتقاربة' },
    { id: 'op-2', action: 'تفعيل شريحة يمن موبايل', time: 'منذ ساعتين', status: 'success', details: 'الرقم: 777123456 - باقة مزايا الشهرية' },
    { id: 'op-3', action: 'تحقق من العنوان الوطني والمطابقة', time: 'أمس، ٠٣:٤٥ م', status: 'success', details: 'مطابق لسجلات الشؤون المدنية - صنعاء' },
    { id: 'op-4', action: 'فحص البصمة الحيوية للعميل', time: 'منذ ٣ أيام', status: 'success', details: 'البصمة معتمدة ومطابقة كلياً' }
  ],
  '2094837501': [
    { id: 'op-5', action: 'تفعيل شريحة سبأفون', time: 'منذ ساعة', status: 'success', details: 'الرقم: 711987654 - باقة البيانات 10GB' },
    { id: 'op-6', action: 'إصدار شريحة بدل فاقد', time: 'منذ يومين', status: 'failed', details: 'تم رفض العملية لعدم تطابق البصمة الحيوية للعميل' },
    { id: 'op-7', action: 'تحديث بيانات المشترك الأساسية', time: 'منذ ٤ أيام', status: 'success', details: 'تحديث العنوان الوطني إلى: عدن - كريتر' }
  ],
  '1088429103': [
    { id: 'op-8', action: 'تسجيل شرائح جماعي مشبوه', time: 'أمس، ٠٣:١٥ م', status: 'warning', details: 'طلب تسجيل 8 شرائح في نفس الدقيقة بموقعين متباعدين بتعز والحديدة' },
    { id: 'op-9', action: 'تفعيل رقم YOU جديد للعمليات الميدانية', time: 'أمس، ١٠:٠٠ ص', status: 'success', details: 'الرقم: 733554433 - باقة هلا الفضية' },
    { id: 'op-10', action: 'نقل ملكية الشريحة القانونية', time: 'منذ ٥ أيام', status: 'success', details: 'نقل ملكية الشريحة من فاطمة القدسي إلى مؤسسة الأمل للتجارة' }
  ],
  '3014772154': [
    { id: 'op-11', action: 'تفعيل شومة رقمية', time: 'منذ ٣ ساعات', status: 'success', details: 'الرقم المخصص المرتبط بالهوية: 731111222' },
    { id: 'op-12', action: 'مراجعة أمنية احترازية للتحسين', time: 'منذ أسبوع', status: 'warning', details: 'تمت تصفية ومطابقة العقد مع سجلات الشؤون المدنية بحضرموت' }
  ],
  'region-sanaa': [
    { id: 'op-s1', action: 'تحديث خوادم محطة تفعيل صنعاء', time: 'الآن', status: 'success', details: 'ربط قاعدة بيانات صنعاء بالأمانة المركزية بنجاح بنسبة ١٠٠٪' },
    { id: 'op-s2', action: 'تثبيت حظر هويات متلاعبة نشطة', time: 'منذ ساعات', status: 'warning', details: 'تجميد نشاط 14 شريحة مسجلة تحت هويات مشتتة جغرافياً' }
  ],
  'region-aden': [
    { id: 'op-a1', action: 'تقرير نشاطات بائع التجزئة بساحل عدن', time: 'منذ ساعة', status: 'success', details: 'تسجيل 45 شريحة جديدة مع الالتزام بضوابط التحقق المالي المشفر' }
  ],
  'region-taiz': [
    { id: 'op-t1', action: 'إنذار بؤرة تكرار نشط متسارع', time: 'منذ ٢٤ ساعة', status: 'warning', details: 'ارتفاع مؤشر المخاطر بنسبة 15% بمحيط تعز المدينة عبر نقاط مجهولة' }
  ],
  'region-mukalla': [
    { id: 'op-m1', action: 'تدقيق شهادات حماية خوادم الهوية والمطابقة', time: 'أمس', status: 'success', details: 'إعادة تمكين خوادم التشفير ومزامنتها بنسبة تامة' }
  ],
  'telecom-backbone': [
    { id: 'op-b1', action: 'مراقبة خط المزامنة الفيدرالي المستمر', time: 'الآن', status: 'success', details: 'جميع مسارات التحقق بين المدن آمنة والشهادات الرقمية سارية' }
  ]
};

export default function GeographicRiskView() {
  const [mocks, setMocks] = useState(DUPLICATE_IDENTITIES_MOCKS);
  const [logs, setLogs] = useState<AuditLog[]>(AUDIT_LOGS);
  const [searchWord, setSearchWord] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [dimensions, setDimensions] = useState({ width: 320, height: 280 });
  const [blockConfirm, setBlockConfirm] = useState<{idNo: string; name: string} | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
  const handleFlagRow = (idNo: string, name: string) => {
    alert(`تم إرسال بلاغ أمني لإشتباه الهوية: ${name} (ID: ${idNo}) إلى عقد المراجعة الفورية ورُفع بمستوى التحذير.`);
    
    const newLog: AuditLog = {
      id: String(Date.now()),
      type: 'security_alert',
      title: `تصنيف هوية مشبوهة للتحقيق: ${name}`,
      user: 'مدير عمليات الأمان',
      time: 'الآن',
      status: 'blocked'
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleBlockRow = (idNo: string, name: string) => {
    setBlockConfirm({ idNo, name });
  };

  const executeBlock = () => {
    if (!blockConfirm) return;
    const { idNo, name } = blockConfirm;
    const newLog: AuditLog = {
      id: String(Date.now()),
      type: 'security_alert',
      title: `حظر احترازي للهوية رقم ${idNo}`,
      user: 'مدير العمليات الأمني',
      time: 'الآن',
      status: 'blocked'
    };
    setLogs((prev) => [newLog, ...prev]);
    setBlockConfirm(null);
  };

  const filteredMocks = mocks.filter(
    (item) => item.name.includes(searchWord) || item.idNo.includes(searchWord) || item.region.includes(searchWord)
  );

  // D3 Interactive Simulation Engine logic
  useEffect(() => {
    if (!svgRef.current) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear contents before update

    // Map names to region IDs
    const regionsMap: Record<string, string> = {
      'أمانة العاصمة': 'region-sanaa',
      'محافظة عدن': 'region-aden',
      'تعز - المدينة': 'region-taiz',
      'حضرموت - المكلا': 'region-mukalla'
    };

    // 1. Build Nodes
    const baseNodes = [
      { id: 'region-sanaa', label: 'صنعاء (أمانة العاصمة)', type: 'city', color: '#ef4444', size: 24, risk: 'مرتفع جداً' },
      { id: 'region-aden', label: 'عدن (كريتر)', type: 'city', color: '#3b82f6', size: 24, risk: 'متوسط' },
      { id: 'region-taiz', label: 'تعز (المدينة)', type: 'city', color: '#f59e0b', size: 24, risk: 'مرتفع جداً' },
      { id: 'region-mukalla', label: 'حضرموت (المكلا)', type: 'city', color: '#8b5cf6', size: 24, risk: 'متوسط' },
      { id: 'telecom-backbone', label: 'بوابة المراقبة والربط', type: 'checkpoint', color: '#64748b', size: 18, risk: 'آمن' }
    ];

    const identityNodes = mocks.map(m => {
      const parentId = regionsMap[m.region] || 'telecom-backbone';
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
    const graphLinks = [
      { source: 'telecom-backbone', target: 'region-sanaa', value: 2 },
      { source: 'telecom-backbone', target: 'region-aden', value: 2 },
      { source: 'telecom-backbone', target: 'region-taiz', value: 2 },
      { source: 'telecom-backbone', target: 'region-mukalla', value: 2 },
      
      ...mocks.map(m => ({
        source: m.idNo,
        target: regionsMap[m.region] || 'telecom-backbone',
        value: 1
      })),

      // Cross-region suspicious linkages representing identity duplicates matching patterns
      { source: '1023485932', target: '1088429103', value: 3 }, // Saleh to Fatima
      { source: '2094837501', target: '3014772154', value: 3 }  // Nabil to Omar
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
      .selectAll('.node')
      .data(simNodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )
      .on('click', (event, d) => {
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
    const simulation = d3.forceSimulation<any>(simNodes)
      .force('link', d3.forceLink<any, any>(simLinks).id(d => d.id).distance(110))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<any>().radius(d => d.size + 24));

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node
        .attr('transform', d => `translate(${(d as any).x},${(d as any).y})`);
    });

    // Drag simulation triggers
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.2).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
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

    // Expose control API methods to windows context
    (window as any).zoomInGraph = () => {
      svg.transition().duration(250).call(d3Zoom.scaleBy as any, 1.35);
    };
    (window as any).zoomOutGraph = () => {
      svg.transition().duration(250).call(d3Zoom.scaleBy as any, 0.75);
    };
    (window as any).zoomResetGraph = () => {
      svg.transition().duration(250).call(d3Zoom.transform as any, d3.zoomIdentity);
    };
    (window as any).zoomRestartPhysics = () => {
      simulation.alpha(1).restart();
    };

    return () => {
      simulation.stop();
    };
  }, [dimensions, mocks]);

  // Read associated operations for active interactive selection
  const activeLogs = selectedNode ? (NODE_OPERATIONS_MAP[selectedNode.id] || []) : [];

  return (
    <div className="space-y-6">
      {/* Risk indicators grid panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Level 0 indicator */}
        <div className="md:col-span-2 card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs text-gray-500 font-bold">مستوى المخاطر التكرارية العالمي</span>
              <span className="px-2.5 py-0.5 bg-red-100 text-secondary border border-red-200 rounded-full text-[11px] font-bold">تحذير مرتفع</span>
            </div>
            <div className="flex items-end gap-3">
              <h3 className="text-4xl font-bold text-gray-900 leading-none">84.2%</h3>
              <div className="flex items-center text-secondary text-xs font-bold pb-1 font-mono">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span>+12.4%</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-3 leading-relaxed max-w-[90%]">
              تم اكتشاف زيادة ملحوظة في عمليات تسجيل الهويات المكررة خلال الـ 24 ساعة الماضية، معظمها يتركز في إقليم الأمانة.
            </p>
            <div className="mt-5 h-2 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="w-[60%] bg-secondary h-full"></div>
              <div className="w-[25%] bg-orange-500 h-full"></div>
              <div className="w-[15%] bg-green-500 h-full"></div>
            </div>
          </div>
        </div>

        {/* Counter cards */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/85 p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-800">
              <span className="material-symbols-outlined text-lg">filter_none</span>
            </div>
            <span className="text-xs text-gray-500 font-bold">إجمالي الهويات المكررة</span>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-gray-900 font-mono">1,402</h4>
            <p className="text-[11px] text-gray-400 mt-1">حالة مكررة مشتبه بها نشطة</p>
          </div>
        </div>

        <div className="card p-5 flex flex-col justify-between">
           <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
              <span className="material-symbols-outlined text-lg">rule</span>
            </div>
            <span className="text-xs text-gray-500 font-bold">الحالات الخاضعة للمراجعة</span>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-gray-900 font-mono">842</h4>
            <p className="text-[11px] text-green-600 font-semibold mt-1">60% من إجمالي التكرارات في العقد</p>
          </div>
        </div>
      </div>

      {/* Main Table Data Filters */}
      <div className="card overflow-hidden">
         <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
           <div className="relative w-full sm:w-80">
             <input
               type="text"
               value={searchWord}
               onChange={(e) => setSearchWord(e.target.value)}
               placeholder="البحث برقم الهوية، الاسم أو المنطقة..."
               className="input-field bg-gray-50 pr-10 text-xs"
             />
            <span className="material-symbols-outlined absolute right-3 top-2 text-gray-450 text-sm">search</span>
          </div>
          <button 
            onClick={() => { alert('تم تصدير تقرير تحليل الهويات كملف PDF لمراجعته مع الشؤون القانونية.'); }}
             className="btn btn-sm w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <Download size={14} />
            تصدير تقرير المخاطر
          </button>
        </div>

        <div className="table-wrap">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                <th className="px-6 py-4 font-bold">رقم الهوية الوطنية</th>
                <th className="px-6 py-4 font-bold">اسم العميل المسجّل</th>
                <th className="px-6 py-4 font-bold">الشرائح النشطة معه</th>
                <th className="px-6 py-4 font-bold">عدد عقود التكرار</th>
                <th className="px-6 py-4 font-bold">مستوى الخطورة الإحصائي</th>
                <th className="px-6 py-4 font-bold">منطقة التوزيع</th>
                <th className="px-6 py-4 font-bold text-left">الإجراءات والتحقيق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-105">
              {filteredMocks.map((item) => (
                <tr key={item.idNo} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-gray-900">{item.idNo}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-700">
                        {item.avatarInitials}
                      </div>
                      <span className="font-semibold text-gray-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-600">{item.simsCount} شرائح</td>
                  <td className="px-6 py-4 font-mono font-bold text-secondary">{item.duplicatesCount} سجلات</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      item.risk === 'مرتفع جداً'
                        ? 'bg-red-50 text-secondary border border-red-150'
                        : 'bg-orange-100 text-orange-700 border border-orange-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.risk === 'مرتفع جداً' ? 'bg-secondary' : 'bg-orange-500'}`}></span>
                      {item.risk}
                    </span>
                  </td>
                  <td className="px-6 py-4">{item.region}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setSelectedNode({
                            id: item.idNo,
                            label: item.name,
                            type: 'identity',
                            region: item.region,
                            idNo: item.idNo,
                            sims: item.simsCount,
                            risk: item.risk
                          });
                          document.getElementById('d3-section')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="btn-icon bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-100" 
                         title="تحليل الترابط والعمليات جغرافياً"
                       >
                         <span className="material-symbols-outlined text-lg">account_tree</span>
                       </button>
                       <button 
                         onClick={() => alert(`تفاصيل الهوية: ${item.name}`)}
                         className="btn-icon hover:bg-gray-100 text-gray-500 hover:text-gray-900 border-gray-100" 
                         title="تفاصيل الهوية ومستنداتها"
                       >
                         <span className="material-symbols-outlined text-lg">visibility</span>
                       </button>
                       <button 
                         onClick={() => handleFlagRow(item.idNo, item.name)}
                         className="btn-icon hover:bg-red-50 text-secondary border-red-50" 
                         title="وضع علامة اشتباه أمني"
                       >
                         <span className="material-symbols-outlined text-lg">flag</span>
                       </button>
                       <button 
                         onClick={() => handleBlockRow(item.idNo, item.name)}
                         className="btn-icon hover:bg-red-900/10 text-secondary border-red-100 font-bold" 
                         title="حظر الهوية فوراً"
                       >
                         <span className="material-symbols-outlined text-lg text-[#e02928]">block</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
          
          {/* D3 Canvas container */}
          <div className="lg:col-span-2 card bg-[#0b0f19] border-slate-900 p-5 flex flex-col justify-between relative text-slate-100 overflow-hidden">
            
            {/* Legend controls */}
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800/80 pb-3 mb-4 z-10 relative">
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-600 border border-red-500"></span>
                  <span className="text-slate-300">محافظة/مدينة</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-slate-300">هوية مشتبه بها جداً</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <span className="text-slate-300">هوية متوسطة المخاطر</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-500"></span>
                  <span className="text-slate-300">منفذ التحقق المركزي</span>
                </div>
              </div>

              {/* View Status */}
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <span className="text-[11px] text-slate-400 font-bold">محلل المزامنة المباشر نشط</span>
              </div>
            </div>

            {/* D3 Canvas wrapper with resizing elements */}
            <div 
              ref={containerRef}
              className="relative w-full rounded-xl overflow-hidden bg-slate-950/80 border border-slate-900 flex items-center justify-center min-h-[360px] cursor-grab"
            >
              <svg 
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                className="w-full block"
              />

              {/* Float overlays: Navigation zoom controls */}
              <div className="absolute left-3 bottom-3 flex flex-col gap-1.5 z-20">
                <button
                  type="button"
                  onClick={() => (window as any).zoomInGraph?.()}
                  className="btn-icon rounded-lg bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-white hover:scale-105"
                  title="تكبير"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => (window as any).zoomOutGraph?.()}
                  className="btn-icon rounded-lg bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-white hover:scale-105"
                  title="تصغير"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => (window as any).zoomResetGraph?.()}
                  className="btn-icon rounded-lg bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-white hover:scale-105"
                  title="إعادة التمركز"
                >
                  <Maximize size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => (window as any).zoomRestartPhysics?.()}
                  className="btn-icon rounded-lg bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-white hover:scale-105"
                  title="تنشيط الجاذبية"
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              {/* Interactive Help Hint overlay label */}
              <div className="absolute right-3 top-3 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono select-none">
                <HelpCircle size={10} className="text-secondary" />
                <span>جرّب سحب العقد وتحريكها بيدك بالماوس</span>
              </div>
            </div>
          </div>

          {/* Connected Operations Detail logs timeline Column */}
           <div className="card p-5 flex flex-col justify-between min-h-[460px]">
            {selectedNode ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  {/* Active target descriptor Card */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-secondary">
                        {selectedNode.type === 'city' ? (
                          <MapPin size={18} />
                        ) : selectedNode.type === 'checkpoint' ? (
                          <Shield size={18} />
                        ) : (
                          <User size={18} />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-950">{selectedNode.label}</h4>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {selectedNode.type === 'city' ? 'عقدة تجميع البيانات الإقليمية' : selectedNode.type === 'checkpoint' ? 'معبر الحماية' : `هوية كود: ${selectedNode.idNo}`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedNode(null)}
                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition"
                      title="إغلاق التفتيش"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Quick stats for active node card */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-150/80 mb-4 flex justify-between text-xs text-right">
                    <div>
                      <p className="text-[11px] text-gray-500">درجة خطورتها</p>
                      <span className={`font-bold inline-flex items-center gap-1 mt-0.5 ${selectedNode.risk === 'مرتفع جداً' ? 'text-secondary' : 'text-amber-600'}`}>
                        {selectedNode.risk || 'عادي'}
                      </span>
                    </div>

                    {selectedNode.type === 'identity' && (
                      <div className="border-r border-gray-200 pr-3">
                        <p className="text-[11px] text-gray-500">الشرائح المسجلة</p>
                        <span className="font-bold text-gray-950 mt-0.5 block">{selectedNode.sims} شريحة</span>
                      </div>
                    )}

                    <div className="border-r border-gray-200 pr-3">
                      <p className="text-[11px] text-gray-500">المنطقة الجغرافية</p>
                      <span className="font-bold text-gray-950 mt-0.5 block">{selectedNode.region || 'المركز المركزي'}</span>
                    </div>
                  </div>

                  {/* Header Title Operations Log */}
                  <h5 className="font-bold text-gray-950 text-xs mb-3 flex items-center gap-1">
                    <Activity size={12} className="text-secondary" />
                    سجل العمليات والتحقق المباشر
                  </h5>

                  {/* Operations Log lists */}
                  <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                    {activeLogs.length > 0 ? (
                      activeLogs.map((item: OperationLogItem) => (
                        <div key={item.id} className="p-2.5 bg-gray-50 rounded-xl border border-gray-150 flex flex-col gap-1 text-right">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-gray-450 font-sans">{item.time}</span>
                            <span className={`px-1.5 py-0.25 text-[10px] font-bold rounded-full border ${
                              item.status === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                              item.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {item.status === 'success' ? 'عملية ناجحة' : item.status === 'failed' ? 'عملية مرفوضة' : 'إنذار اشتباه'}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-gray-900">{item.action}</p>
                          <p className="text-[11px] text-gray-500 leading-normal">{item.details}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-gray-400 font-medium">
                        لا تتوفر سجلات عمليات إضافية لهذه العقدة بالنظام.
                      </div>
                    )}
                  </div>
                </div>

                {/* Target node actions */}
                <div className="pt-4 border-t border-gray-100 flex flex-col gap-2 mt-4 text-xs font-bold">
                  {selectedNode.type === 'identity' ? (
                    <>
                      <button
                        onClick={() => handleFlagRow(selectedNode.idNo, selectedNode.label)}
                        className="w-full py-2.5 bg-red-100/50 hover:bg-red-100 text-secondary border border-red-200 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ShieldAlert size={14} />
                        وضع علامة اشتباه أمني فوراً
                      </button>
                      <button
                        onClick={() => handleBlockRow(selectedNode.idNo, selectedNode.label)}
                        className="w-full py-2.5 bg-[#e02928] text-white rounded-lg flex items-center justify-center gap-1.5 hover:bg-red-700 shadow-sm transition-all cursor-pointer"
                      >
                        <AlertTriangle size={14} />
                        تجميد وحظر الهوية فورا
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => alert(`تنزيل كامل سجل تكرار المحطة الإقليمية لمدينة: ${selectedNode.label}`)}
                      className="w-full py-2.5 bg-primary text-white rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90 shadow-sm transition-all cursor-pointer"
                    >
                      <FileText size={14} />
                      تصدير تقرير المنطقة الجغرافي
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Inside Column empty instruction status panel */
              <div className="flex flex-col items-center justify-center h-full text-center py-10 px-4">
                <div className="w-14 h-14 bg-red-50 text-secondary rounded-full flex items-center justify-center mb-4 border border-red-100 shadow-sm animate-bounce">
                  <Network size={24} />
                </div>
                <h4 className="text-sm font-bold text-gray-900">تشريح الهويات وتقاطع المناطق</h4>
                <p className="text-xs text-text-muted leading-relaxed max-w-[240px] mt-2">
                  يرجى النقر على أي عُقدة تفاعلية في خريطة التوصيل الجانبية (D3) لاستخلاص وتحليل سجل تلاعب الهويات عبر شبكة توزيع الشرائح تلقائياً.
                </p>
                <div className="mt-6 flex flex-col gap-2 w-full text-xs font-medium text-gray-600">
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-150 text-right">
                    <CheckCircle className="text-green-500 shrink-0" size={14} />
                    <span>تحليل التقاطعات وتحديد الهويات المستعارة</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-150 text-right">
                    <CheckCircle className="text-green-500 shrink-0" size={14} />
                    <span>تتبع التفعيلات اللحظية في صنعاء، عدن، تعز والمكلا</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Audit dynamic logging timeline */}
      <div className="card p-5 flex flex-col justify-between">
         <h5 className="font-bold text-gray-900 text-sm mb-4">سجل إجراءات التحقيق والمراقبة الأخيرة</h5>
        <div className="space-y-4 flex-1 max-h-64 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 relative">
              <div className="w-5 h-5 rounded-full bg-gray-50 border border-gray-150 shrink-0 flex items-center justify-center text-gray-500 z-10 text-[11px]">
                {log.status === 'blocked' ? (
                  <span className="material-symbols-outlined text-xs text-secondary font-bold">priority_high</span>
                ) : log.status === 'verified' ? (
                  <span className="material-symbols-outlined text-xs text-green-600 font-bold">check</span>
                ) : (
                  <span className="material-symbols-outlined text-xs text-blue-600 animate-spin font-bold">refresh</span>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">{log.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">بواسطة: {log.user} • {log.time}</p>
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={() => { alert('سجل التحقيق الكامل يحتوي على 1,280 ملف مؤرشف للسنوات السابقة.'); }}
          className="btn btn-ghost btn-sm w-full mt-4 text-xs"
        >
          مشاهدة الأرشيف الكامل للهويات
        </button>
      </div>

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
