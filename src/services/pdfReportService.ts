import jsPDF from 'jspdf';
import type { Report } from '../types';

interface ReportStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  declined: number;
  highPriority: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  avgResolutionTime?: number;
  resolvedThisMonth?: number;
}

const COLORS = {
  primary: [51, 65, 85],
  maroon: [128, 0, 0],
  accent: [59, 130, 246],
  success: [34, 197, 94],
  warning: [245, 158, 11],
  danger: [239, 68, 68],
  light: [243, 244, 246],
  lightGray: [229, 231, 235],
  darkGray: [107, 114, 128],
};

export const pdfReportService = {
  async generateMonthlyPDF(
    reports: Report[],
    year: number,
    month: number,
    stats: ReportStats,
    filename: string
  ): Promise<void> {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 14;
    const cw = pw - 2 * margin;

    // PAGE 1: Cover + Metrics + Pie Chart
    this.addGradientHeader(pdf, `Monthly Report - ${this.getMonthName(month)} ${year}`, pw);
    this.addKeyMetricsCards(pdf, stats, 50, margin, cw);
    this.addPieChart(pdf, stats, 95, margin, cw);

    // PAGE 2: Executive Summary + Key Findings
    pdf.addPage();
    this.addSectionTitle(pdf, 'Executive Summary', 15, margin);
    const summaryText = this.generateSummaryText(stats, month, year, 'monthly');
    this.addParagraph(pdf, summaryText, 25, margin, cw);

    this.addSectionTitle(pdf, 'Key Findings & Metrics', 70, margin);
    this.addKeyFindings(pdf, stats, 80, margin, cw);

    // PAGE 3: Status & Category Breakdown
    pdf.addPage();
    this.addSectionTitle(pdf, 'Status Overview', 15, margin);
    this.addStatusChart(pdf, stats, 25, margin, cw);

    this.addSectionTitle(pdf, 'Reports by Category', 70, margin);
    this.addCategoryChart(pdf, stats, 80, margin, cw);

    // PAGE 4+: Detailed Table
    if (reports.length > 0) {
      pdf.addPage();
      this.addSectionTitle(pdf, 'Detailed Report Listing', 15, margin);
      this.addDetailTable(pdf, reports, 25, margin, cw, ph);
    }

    this.addFooter(pdf, month, year);
    pdf.save(filename);
  },

  async generateYearlyPDF(
    reports: Report[],
    year: number,
    stats: ReportStats,
    filename: string
  ): Promise<void> {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 14;
    const cw = pw - 2 * margin;

    // PAGE 1: Cover + Metrics + Pie Chart
    this.addGradientHeader(pdf, `Annual Report - ${year}`, pw);
    this.addKeyMetricsCards(pdf, stats, 50, margin, cw);
    this.addPieChart(pdf, stats, 95, margin, cw);

    // PAGE 2: Executive Summary
    pdf.addPage();
    this.addSectionTitle(pdf, 'Executive Summary', 15, margin);
    const summaryText = this.generateSummaryText(stats, 0, year, 'yearly');
    this.addParagraph(pdf, summaryText, 25, margin, cw);
    
    this.addSectionTitle(pdf, 'Key Findings & Analysis', 70, margin);
    this.addKeyFindings(pdf, stats, 80, margin, cw);

    // PAGE 3: Resolution & Priority Distribution
    pdf.addPage();
    this.addSectionTitle(pdf, 'Resolution Summary', 15, margin);
    this.addStatusChart(pdf, stats, 25, margin, cw);

    this.addSectionTitle(pdf, 'Priority Distribution', 70, margin);
    this.addPriorityChart(pdf, stats, 80, margin, cw);

    // PAGE 4: Category Analysis
    pdf.addPage();
    this.addSectionTitle(pdf, 'Top Categories by Report Count', 15, margin);
    this.addCategoryChart(pdf, stats, 25, margin, cw);

    // PAGE 5+: Detailed Table
    if (reports.length > 0) {
      pdf.addPage();
      this.addSectionTitle(pdf, 'Complete Report Listing', 15, margin);
      this.addDetailedReportTable(pdf, reports, 25, margin, cw, ph);
    }

    this.addFooter(pdf, 0, year);
    pdf.save(filename);
  },

  addGradientHeader(pdf: jsPDF, title: string, pageWidth: number): void {
    // Dark gradient background
    pdf.setFillColor(30, 30, 40);
    pdf.rect(0, 0, pageWidth, 50, 'F');

    // Maroon accent bar
    pdf.setFillColor(128, 0, 0);
    pdf.rect(0, 40, pageWidth, 10, 'F');

    // Main title
    pdf.setFontSize(28);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(title, pageWidth / 2, 20, { align: 'center' });

    // Subtitle
    pdf.setFontSize(10);
    pdf.setTextColor(200, 200, 200);
    pdf.setFont('Helvetica', 'normal');
    pdf.text('Community Reports Dashboard', pageWidth / 2, 32, { align: 'center' });

    // Date
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, 45, { align: 'center' });
  },

  addKeyMetricsCards(pdf: jsPDF, stats: ReportStats, yPos: number, margin: number, cWidth: number): void {
    const metrics = [
      { label: 'Total Reports', value: stats.total, color: COLORS.accent },
      { label: 'Resolved', value: stats.resolved, color: COLORS.success },
      { label: 'In Progress', value: stats.inProgress, color: COLORS.accent },
      { label: 'Pending', value: stats.pending, color: COLORS.warning },
      { label: 'High Priority', value: stats.highPriority, color: COLORS.danger },
    ];

    const cw = (cWidth - 16) / 2.4;
    const ch = 18;
    let x = margin;
    let y = yPos;

    metrics.forEach((m, i) => {
      if (i > 0 && i % 2 === 0) {
        y += ch + 5;
        x = margin;
      }

      // Card shadow effect
      pdf.setFillColor(220, 220, 220);
      pdf.rect(x + 0.5, y + 0.5, cw, ch, 'F');

      // Card background
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.rect(x, y, cw, ch, 'FD');

      // Color bar on left
      pdf.setFillColor(m.color[0], m.color[1], m.color[2]);
      pdf.rect(x, y, 2, ch, 'F');

      // Value
      pdf.setFontSize(16);
      pdf.setFont('Helvetica', 'bold');
      pdf.setTextColor(m.color[0], m.color[1], m.color[2]);
      pdf.text(String(m.value), x + cw - 8, y + 8, { align: 'right' });

      // Label
      pdf.setFontSize(8);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(m.label, x + 5, y + 15);

      x += cw + 5;
    });
  },

  addPieChart(pdf: jsPDF, stats: ReportStats, yPos: number, margin: number, _cWidth: number): void {
    const radius = 15;
    const cx = margin + 25;
    const cy = yPos + 18;

    const slices = [
      { label: 'Pending', value: stats.pending, color: COLORS.warning },
      { label: 'In Progress', value: stats.inProgress, color: COLORS.accent },
      { label: 'Resolved', value: stats.resolved, color: COLORS.success },
      { label: 'Declined', value: stats.declined, color: COLORS.danger },
    ];

    const total = Math.max(stats.total, 1);
    let startAngle = 0;

    slices.forEach((s) => {
      const percentage = (s.value / total) * 100;
      const angle = (percentage / 100) * 360;
      this.drawPieSlice(pdf, cx, cy, radius, startAngle, startAngle + angle, s.color);
      startAngle += angle;
    });

    // Legend
    let lx = margin + 50;
    let ly = yPos + 2;

    pdf.setFontSize(9);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(51, 65, 85);
    pdf.text('Status Distribution', lx, ly);

    ly += 6;
    slices.forEach((s) => {
      const pct = ((s.value / total) * 100).toFixed(1);

      // Color box
      pdf.setFillColor(s.color[0], s.color[1], s.color[2]);
      pdf.rect(lx, ly - 2.8, 3, 3, 'F');

      // Label
      pdf.setFontSize(8);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      pdf.text(`${s.label}: ${s.value} (${pct}%)`, lx + 5, ly);

      ly += 5;
    });
  },

  drawPieSlice(
    pdf: jsPDF,
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    color: number[]
  ): void {
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(0.3);

    const startRad = (startAngle * Math.PI) / 180;

    // Create path for the pie slice
    const segments = Math.max(5, Math.ceil((endAngle - startAngle) / 5));

    // Use moveTo and lineTo to draw the pie slice
    const doc = pdf as any;
    
    // Move to center
    doc.moveTo(cx, cy);
    
    // Draw to first arc point
    const firstX = cx + radius * Math.cos(startRad);
    const firstY = cy + radius * Math.sin(startRad);
    doc.lineTo(firstX, firstY);

    // Draw arc using line segments
    for (let i = 1; i <= segments; i++) {
      const angle = startAngle + (i / segments) * (endAngle - startAngle);
      const rad = (angle * Math.PI) / 180;
      const x = cx + radius * Math.cos(rad);
      const y = cy + radius * Math.sin(rad);
      doc.lineTo(x, y);
    }

    // Close the path back to center
    doc.lineTo(cx, cy);
    doc.fill();
  },

  addSectionTitle(pdf: jsPDF, title: string, yPos: number, margin: number): void {
    // Accent line
    pdf.setDrawColor(128, 0, 0);
    pdf.setLineWidth(1.5);
    pdf.line(margin, yPos - 2, margin + 25, yPos - 2);

    // Title
    pdf.setFontSize(14);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(51, 65, 85);
    pdf.text(title, margin + 30, yPos);
  },

  addKeyFindings(pdf: jsPDF, stats: ReportStats, yPos: number, margin: number, cWidth: number): void {
    const total = Math.max(stats.total, 1);
    const resolutionRate = Math.round((stats.resolved / total) * 100);
    const pendingRate = Math.round((stats.pending / total) * 100);
    const inProgressRate = Math.round((stats.inProgress / total) * 100);
    const highPriorityRate = Math.round((stats.highPriority / total) * 100);

    const findings = [
      `• Overall Resolution Rate: ${resolutionRate}% (${stats.resolved} of ${total} reports)`,
      `• Pending Reports: ${pendingRate}% (${stats.pending} reports awaiting action)`,
      `• In Progress: ${inProgressRate}% (${stats.inProgress} reports being handled)`,
      `• High Priority Cases: ${highPriorityRate}% (${stats.highPriority} reports)`,
    ];

    let y = yPos;
    pdf.setFontSize(9);
    pdf.setFont('Helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);

    findings.forEach((finding) => {
      const lines = pdf.splitTextToSize(finding, cWidth - 6);
      pdf.text(lines, margin + 5, y);
      y += lines.length * 4 + 2;
    });
  },

  addDetailedReportTable(pdf: jsPDF, reports: Report[], yPos: number, margin: number, cWidth: number, pageHeight: number): void {
    this.addDetailTable(pdf, reports, yPos, margin, cWidth, pageHeight);
  },

  addParagraph(pdf: jsPDF, text: string, yPos: number, margin: number, cWidth: number): void {
    pdf.setFontSize(9);
    pdf.setFont('Helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);

    // Background box
    const lines = pdf.splitTextToSize(text, cWidth - 6);
    const boxHeight = lines.length * 4 + 6;

    pdf.setFillColor(245, 245, 250);
    pdf.setDrawColor(200, 200, 220);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, yPos, cWidth, boxHeight, 'FD');

    // Text
    pdf.text(lines, margin + 3, yPos + 4);
  },

  addStatusChart(pdf: jsPDF, stats: ReportStats, yPos: number, margin: number, cWidth: number): number {
    const items = [
      { label: 'Resolved', value: stats.resolved, color: COLORS.success },
      { label: 'In Progress', value: stats.inProgress, color: COLORS.accent },
      { label: 'Pending', value: stats.pending, color: COLORS.warning },
      { label: 'Declined', value: stats.declined, color: COLORS.danger },
    ];

    const total = Math.max(stats.total, 1);
    const barHeight = 6;
    const spacing = 9;
    let y = yPos;

    pdf.setFontSize(8);

    items.forEach((item) => {
      const pct = ((item.value / total) * 100).toFixed(1);
      const barWidth = (cWidth - 75) * (item.value / total);

      // Label
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(75, 85, 99);
      pdf.text(item.label, margin + 5, y + 4);

      // Value
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${item.value} (${pct}%)`, margin + 40, y + 4);

      // Background bar
      pdf.setFillColor(230, 230, 235);
      pdf.rect(margin + 65, y - 1.5, cWidth - 70, barHeight, 'F');

      // Colored bar
      pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
      pdf.rect(margin + 65, y - 1.5, barWidth, barHeight, 'F');

      y += spacing;
    });

    return y;
  },

  addPriorityChart(pdf: jsPDF, stats: ReportStats, yPos: number, margin: number, cWidth: number): number {
    const items = [
      { label: 'High Priority', key: 'high', color: COLORS.danger },
      { label: 'Medium Priority', key: 'medium', color: COLORS.warning },
      { label: 'Low Priority', key: 'low', color: COLORS.success },
    ];

    const total = Math.max(stats.total, 1);
    const barHeight = 6;
    const spacing = 9;
    let y = yPos;

    pdf.setFontSize(8);

    items.forEach((item) => {
      const val = stats.byPriority[item.key] || 0;
      const pct = ((val / total) * 100).toFixed(1);
      const barWidth = (cWidth - 75) * (val / total);

      // Label
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(75, 85, 99);
      pdf.text(item.label, margin + 5, y + 4);

      // Value
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${val} (${pct}%)`, margin + 40, y + 4);

      // Background bar
      pdf.setFillColor(230, 230, 235);
      pdf.rect(margin + 65, y - 1.5, cWidth - 70, barHeight, 'F');

      // Colored bar
      pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
      pdf.rect(margin + 65, y - 1.5, barWidth, barHeight, 'F');

      y += spacing;
    });

    return y;
  },

  addCategoryChart(pdf: jsPDF, stats: ReportStats, yPos: number, margin: number, cWidth: number): number {
    const cats = Object.entries(stats.byCategory)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 8);

    if (cats.length === 0) return yPos;

    const total = Math.max(stats.total, 1);
    const barHeight = 5;
    const spacing = 6.5;
    let y = yPos;

    pdf.setFontSize(7.5);

    cats.forEach((entry, i) => {
      const [cat, val] = entry as [string, number];
      const pct = ((val / total) * 100).toFixed(1);
      const label = cat.length > 18 ? cat.substring(0, 15) + '...' : cat;
      const barWidth = (cWidth - 70) * (val / total);
      const colors = this.getCategoryColors();
      const color = colors[i % colors.length];

      // Label
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(75, 85, 99);
      pdf.text(label, margin + 5, y + 3);

      // Value
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${val} (${pct}%)`, margin + 42, y + 3);

      // Background bar
      pdf.setFillColor(230, 230, 235);
      pdf.rect(margin + 60, y - 1.5, cWidth - 65, barHeight, 'F');

      // Colored bar
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.rect(margin + 60, y - 1.5, barWidth, barHeight, 'F');

      y += spacing;
    });

    return y;
  },

  addDetailTable(pdf: jsPDF, reports: Report[], yPos: number, margin: number, cWidth: number, pageHeight: number): void {
    const cols = [
      { header: '#', key: 'case_number', width: 8 },
      { header: 'Title', key: 'title', width: 48 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Priority', key: 'priority', width: 14 },
      { header: 'Category', key: 'category', width: 24 },
    ];

    const headerHeight = 6;
    const rowHeight = 6;
    let y = yPos;

    const drawHeader = () => {
      pdf.setFillColor(128, 0, 0);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7.5);
      pdf.setFont('Helvetica', 'bold');
      pdf.setDrawColor(100, 0, 0);
      pdf.setLineWidth(0.2);

      let x = margin;
      cols.forEach((col) => {
        pdf.rect(x, y, col.width, headerHeight, 'FD');
        pdf.text(col.header, x + col.width / 2, y + 4.2, { align: 'center', maxWidth: col.width - 1 });
        x += col.width;
      });

      y += headerHeight;
    };

    drawHeader();

    pdf.setTextColor(60, 60, 60);
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(7);

    reports.forEach((r, idx) => {
      if (y > pageHeight - 15) {
        pdf.addPage();
        y = 15;
        drawHeader();
      }

      // Alternating row background
      if (idx % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, y, cWidth, rowHeight, 'F');
      }

      let x = margin;
      cols.forEach((col) => {
        let val = (r as any)[col.key] || '';
        if (typeof val === 'object') val = JSON.stringify(val);
        
        // Normalize the value for consistent display
        if (col.key === 'status' || col.key === 'priority' || col.key === 'category') {
          val = this.normalizeValue(String(val));
        }
        
        // Truncate long text but show full meaningful content
        const maxLen = col.key === 'title' ? 40 : 14;
        val = String(val).substring(0, maxLen);

        pdf.setTextColor(60, 60, 60);
        pdf.text(val, x + 1, y + 4, { maxWidth: col.width - 2 });

        // Column divider
        pdf.setDrawColor(220, 220, 225);
        pdf.setLineWidth(0.15);
        pdf.line(x + col.width, y, x + col.width, y + rowHeight);

        x += col.width;
      });

      // Row border
      pdf.setDrawColor(220, 220, 225);
      pdf.setLineWidth(0.15);
      pdf.line(margin, y + rowHeight, margin + cWidth, y + rowHeight);

      y += rowHeight;
    });
  },

  normalizeValue(val: string): string {
    if (!val) return '';
    
    // Convert underscores to spaces and capitalize properly
    val = val.replace(/_/g, ' ').trim();
    
    // Ensure consistent status values
    if (val.toLowerCase().includes('pending')) return 'Pending';
    if (val.toLowerCase().includes('progress')) return 'In Progress';
    if (val.toLowerCase().includes('resolved')) return 'Resolved';
    if (val.toLowerCase().includes('declined')) return 'Declined';
    if (val.toLowerCase().includes('verifying')) return 'Verifying';
    if (val.toLowerCase().includes('cancelled')) return 'Cancelled';
    
    // Ensure consistent priority values
    if (val.toLowerCase() === 'high') return 'High';
    if (val.toLowerCase() === 'medium') return 'Medium';
    if (val.toLowerCase() === 'low') return 'Low';
    
    // Capitalize first letter of category
    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  },

  addFooter(pdf: jsPDF, month: number, year: number): void {
    const pCount = pdf.getNumberOfPages();
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();

    for (let i = 1; i <= pCount; i++) {
      pdf.setPage(i);

      // Footer background
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, ph - 12, pw, 12, 'F');

      // Top border
      pdf.setDrawColor(128, 0, 0);
      pdf.setLineWidth(0.8);
      pdf.line(10, ph - 12, pw - 10, ph - 12);

      pdf.setFontSize(7);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);

      const reportName = month ? `${this.getMonthName(month)} ${year}` : String(year);
      pdf.text(reportName, 14, ph - 7.5);
      pdf.text(`Page ${i} of ${pCount}`, pw - 20, ph - 7.5);
      pdf.text(`${new Date().toLocaleDateString()}`, pw / 2, ph - 7.5, { align: 'center' });
    }
  },

  generateSummaryText(stats: ReportStats, month: number, year: number, type: 'monthly' | 'yearly'): string {
    const rRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

    if (type === 'monthly') {
      const mName = this.getMonthName(month);
      return `During ${mName} ${year}, the community reports system processed ${stats.total} cases with a ${rRate}% resolution rate. Key metrics show ${stats.resolved} cases successfully resolved, ${stats.inProgress} currently in progress, ${stats.pending} pending action, and ${stats.highPriority} identified as high priority. This comprehensive analysis reflects the system's operational efficiency and community engagement levels for the specified period.`;
    }

    return `Throughout ${year}, the community reported system maintained consistent service delivery with ${stats.total} total cases handled. Annual performance indicators demonstrate a ${rRate}% overall resolution rate, with ${stats.resolved} successfully resolved cases, ${stats.inProgress} in active progress, ${stats.pending} pending resolution, and ${stats.highPriority} flagged as high priority. These metrics underscore effective case management and sustained community engagement throughout the fiscal year.`;
  },

  getCategoryColors(): Array<[number, number, number]> {
    return [
      [59, 130, 246],
      [34, 197, 94],
      [168, 85, 247],
      [245, 158, 11],
      [239, 68, 68],
      [51, 65, 85],
      [107, 114, 128],
      [8, 145, 178],
    ];
  },

  getMonthName(m: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return months[m - 1] || 'Unknown';
  },
};
