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
  // Brand colors
  brandRed: [139, 0, 0], // #8B0000
  primaryText: [26, 26, 26], // #1a1a1a
  secondaryText: [102, 102, 102], // #666666
  lightText: [153, 153, 153], // #999999
  bodyText: [51, 51, 51], // #333333
  
  // Stat colors
  statBlue: [59, 130, 246], // #3b82f6
  statAmber: [245, 158, 11], // #f59e0b
  statPurple: [139, 91, 246], // #8b5cf6
  statGreen: [16, 185, 129], // #10b981
  
  // Chart colors
  chartAmber: [251, 191, 36], // #fbbf24
  chartPurple: [167, 139, 250], // #a78bfa
  chartGreen: [134, 239, 172], // #86efac
  chartRed: [248, 113, 113], // #f87171
  
  // Background colors
  bgLight: [248, 249, 250], // #f8f9fa
  bgOffWhite: [250, 250, 250], // #fafafa
  bgSection: [249, 250, 251], // #f9fafb
  borderLight: [224, 224, 224], // #e0e0e0
  white: [255, 255, 255],
  tableHeader: [26, 26, 26], // #1a1a1a
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
    // Convert pixels to mm: 20px ≈ 5.3mm, 25px ≈ 6.6mm
    const margin = 7; // ~20px equivalent
    const topMargin = 7; // ~25px equivalent
    const cw = pw - 2 * margin;

    // PAGE 1: Cover + Metrics + Pie Chart
    this.addGradientHeader(pdf, `Monthly Report - ${this.getMonthName(month)} ${year}`, pw, month, year);
    let currentY = 45; // After header
    this.addKeyMetricsCards(pdf, stats, currentY, margin, cw);
    currentY += 35; // After cards
    this.addPieChart(pdf, stats, currentY, margin, cw);

    // PAGE 2: Executive Summary + Key Findings
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Executive Summary', currentY, margin);
    currentY += 8;
    const summaryText = this.generateSummaryText(stats, month, year, 'monthly');
    this.addParagraph(pdf, summaryText, currentY, margin, cw);
    currentY += 25;

    this.addSectionTitle(pdf, 'Key Findings & Metrics', currentY, margin);
    currentY += 8;
    this.addKeyFindings(pdf, stats, currentY, margin, cw);

    // PAGE 3: Status & Category Breakdown
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Status Overview', currentY, margin);
    currentY += 8;
    this.addStatusChart(pdf, stats, currentY, margin, cw);
    currentY += 35;

    this.addSectionTitle(pdf, 'Reports by Category', currentY, margin);
    currentY += 8;
    this.addCategoryChart(pdf, stats, currentY, margin, cw);

    // PAGE 4+: Detailed Table
    if (reports.length > 0) {
      pdf.addPage();
      currentY = topMargin;
      this.addSectionTitle(pdf, 'Detailed Report Listing', currentY, margin);
      currentY += 8;
      this.addDetailTable(pdf, reports, currentY, margin, cw, ph);
    }

    this.addFooter(pdf, month, year);
    pdf.save(filename);
  },

  async generateMonthlyPDFPreview(
    reports: Report[],
    year: number,
    month: number,
    stats: ReportStats
  ): Promise<string> {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 7;
    const topMargin = 7;
    const cw = pw - 2 * margin;

    // PAGE 1: Cover + Metrics + Pie Chart
    this.addGradientHeader(pdf, `Monthly Report - ${this.getMonthName(month)} ${year}`, pw, month, year);
    let currentY = 45;
    this.addKeyMetricsCards(pdf, stats, currentY, margin, cw);
    currentY += 35;
    this.addPieChart(pdf, stats, currentY, margin, cw);

    // PAGE 2: Executive Summary + Key Findings
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Executive Summary', currentY, margin);
    currentY += 8;
    const summaryText = this.generateSummaryText(stats, month, year, 'monthly');
    this.addParagraph(pdf, summaryText, currentY, margin, cw);
    currentY += 25;

    this.addSectionTitle(pdf, 'Key Findings & Metrics', currentY, margin);
    currentY += 8;
    this.addKeyFindings(pdf, stats, currentY, margin, cw);

    // PAGE 3: Status & Category Breakdown
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Status Overview', currentY, margin);
    currentY += 8;
    this.addStatusChart(pdf, stats, currentY, margin, cw);
    currentY += 35;

    this.addSectionTitle(pdf, 'Reports by Category', currentY, margin);
    currentY += 8;
    this.addCategoryChart(pdf, stats, currentY, margin, cw);

    // PAGE 4+: Detailed Table
    if (reports.length > 0) {
      pdf.addPage();
      currentY = topMargin;
      this.addSectionTitle(pdf, 'Detailed Report Listing', currentY, margin);
      currentY += 8;
      this.addDetailTable(pdf, reports, currentY, margin, cw, ph);
    }

    this.addFooter(pdf, month, year);
    const blob = pdf.output('blob');
    return URL.createObjectURL(blob);
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
    const margin = 7;
    const topMargin = 7;
    const cw = pw - 2 * margin;

    // PAGE 1: Cover + Metrics + Pie Chart
    this.addGradientHeader(pdf, `Annual Report - ${year}`, pw, 0, year);
    let currentY = 45;
    this.addKeyMetricsCards(pdf, stats, currentY, margin, cw);
    currentY += 35;
    this.addPieChart(pdf, stats, currentY, margin, cw);

    // PAGE 2: Executive Summary
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Executive Summary', currentY, margin);
    currentY += 8;
    const summaryText = this.generateSummaryText(stats, 0, year, 'yearly');
    this.addParagraph(pdf, summaryText, currentY, margin, cw);
    currentY += 25;
    
    this.addSectionTitle(pdf, 'Key Findings & Analysis', currentY, margin);
    currentY += 8;
    this.addKeyFindings(pdf, stats, currentY, margin, cw);

    // PAGE 3: Resolution & Priority Distribution
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Resolution Summary', currentY, margin);
    currentY += 8;
    this.addStatusChart(pdf, stats, currentY, margin, cw);
    currentY += 35;

    this.addSectionTitle(pdf, 'Priority Distribution', currentY, margin);
    currentY += 8;
    this.addPriorityChart(pdf, stats, currentY, margin, cw);

    // PAGE 4: Category Analysis
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Top Categories by Report Count', currentY, margin);
    currentY += 8;
    this.addCategoryChart(pdf, stats, currentY, margin, cw);

    // PAGE 5+: Detailed Table
    if (reports.length > 0) {
      pdf.addPage();
      currentY = topMargin;
      this.addSectionTitle(pdf, 'Complete Report Listing', currentY, margin);
      currentY += 8;
      this.addDetailedReportTable(pdf, reports, currentY, margin, cw, ph);
    }

    this.addFooter(pdf, 0, year);
    pdf.save(filename);
  },

  async generateYearlyPDFPreview(
    reports: Report[],
    year: number,
    stats: ReportStats
  ): Promise<string> {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 7;
    const topMargin = 7;
    const cw = pw - 2 * margin;

    // PAGE 1: Cover + Metrics + Pie Chart
    this.addGradientHeader(pdf, `Annual Report - ${year}`, pw, 0, year);
    let currentY = 45;
    this.addKeyMetricsCards(pdf, stats, currentY, margin, cw);
    currentY += 35;
    this.addPieChart(pdf, stats, currentY, margin, cw);

    // PAGE 2: Executive Summary
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Executive Summary', currentY, margin);
    currentY += 8;
    const summaryText = this.generateSummaryText(stats, 0, year, 'yearly');
    this.addParagraph(pdf, summaryText, currentY, margin, cw);
    currentY += 25;
    
    this.addSectionTitle(pdf, 'Key Findings & Analysis', currentY, margin);
    currentY += 8;
    this.addKeyFindings(pdf, stats, currentY, margin, cw);

    // PAGE 3: Resolution & Priority Distribution
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Resolution Summary', currentY, margin);
    currentY += 8;
    this.addStatusChart(pdf, stats, currentY, margin, cw);
    currentY += 35;

    this.addSectionTitle(pdf, 'Priority Distribution', currentY, margin);
    currentY += 8;
    this.addPriorityChart(pdf, stats, currentY, margin, cw);

    // PAGE 4: Category Analysis
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Top Categories by Report Count', currentY, margin);
    currentY += 8;
    this.addCategoryChart(pdf, stats, currentY, margin, cw);

    // PAGE 5+: Detailed Table
    if (reports.length > 0) {
      pdf.addPage();
      currentY = topMargin;
      this.addSectionTitle(pdf, 'Complete Report Listing', currentY, margin);
      currentY += 8;
      this.addDetailedReportTable(pdf, reports, currentY, margin, cw, ph);
    }

    this.addFooter(pdf, 0, year);
    const blob = pdf.output('blob');
    return URL.createObjectURL(blob);
  },

  addGradientHeader(pdf: jsPDF, title: string, pageWidth: number, month?: number, year?: number): void {
    const margin = 7;
    const topMargin = 7;
    let yPos = topMargin + 16; // ~60px from top

    // Main title - 48px equivalent (≈12.7mm)
    pdf.setFontSize(12.7);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(COLORS.primaryText[0], COLORS.primaryText[1], COLORS.primaryText[2]);
    pdf.text(title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 2.6; // 10px margin

    // Subtitle - 18px equivalent (≈4.8mm)
    pdf.setFontSize(4.8);
    pdf.setFont('Helvetica', 'normal');
    pdf.setTextColor(COLORS.secondaryText[0], COLORS.secondaryText[1], COLORS.secondaryText[2]);
    pdf.text('Community Reports Dashboard', pageWidth / 2, yPos, { align: 'center' });
    yPos += 7.9; // 30px margin

    // Red accent line - 4px height (≈1mm)
    pdf.setFillColor(COLORS.brandRed[0], COLORS.brandRed[1], COLORS.brandRed[2]);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 1, 'F');
    yPos += 5.3; // 20px margin below line

    // Footer information - 12px equivalent (≈3.2mm)
    pdf.setFontSize(3.2);
    pdf.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
    const genDate = new Date();
    const dateStr = genDate.toLocaleDateString('en-US', { 
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    const timeStr = genDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const periodStr = month && year 
      ? `${this.getMonthName(month)} ${year}`
      : year ? `${year} Annual Report` : '';
    pdf.text(`Generated: ${dateStr} at ${timeStr} | Time Period: ${periodStr}`, pageWidth / 2, yPos, { align: 'center' });
  },

  addKeyMetricsCards(pdf: jsPDF, stats: ReportStats, yPos: number, margin: number, cWidth: number): void {
    // Add top border line
    pdf.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
    pdf.setLineWidth(0.3);
    pdf.line(margin, yPos - 0.5, margin + cWidth, yPos - 0.5);
    yPos += 7.9; // 30px top margin

    const metrics = [
      { label: 'Total Reports', value: stats.total, color: COLORS.statBlue },
      { label: 'Pending', value: stats.pending, color: COLORS.statAmber },
      { label: 'In Progress', value: stats.inProgress, color: COLORS.statPurple },
      { label: 'Resolved', value: stats.resolved, color: COLORS.statGreen },
    ];

    // 4-column grid with spacing
    const cardSpacing = 2.6; // 10px equivalent
    const cw = (cWidth - (cardSpacing * 3)) / 4;
    const ch = 18; // Card height
    const padding = 5.3; // 20px internal padding
    let x = margin;
    let y = yPos;

    metrics.forEach((m) => {
      // Card shadow (subtle)
      pdf.setFillColor(240, 240, 240);
      pdf.rect(x + 0.3, y + 0.3, cw, ch, 'F');

      // Card background
      pdf.setFillColor(COLORS.bgLight[0], COLORS.bgLight[1], COLORS.bgLight[2]);
      pdf.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(x, y, cw, ch, 2.1, 2.1, 'FD'); // 8px border-radius

      // Number - 36px equivalent (≈9.5mm)
      pdf.setFontSize(9.5);
      pdf.setFont('Helvetica', 'bold');
      pdf.setTextColor(m.color[0], m.color[1], m.color[2]);
      pdf.text(String(m.value), x + cw - padding, y + 7, { align: 'right' });

      // Label - 13px equivalent (≈3.4mm)
      pdf.setFontSize(3.4);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(COLORS.secondaryText[0], COLORS.secondaryText[1], COLORS.secondaryText[2]);
      pdf.text(m.label, x + padding, y + 12);

      x += cw + cardSpacing;
    });

    // Bottom margin
    yPos += ch + 6.6; // 25px bottom margin
  },

  addPieChart(pdf: jsPDF, stats: ReportStats, yPos: number, margin: number, cWidth: number): void {
    yPos += 3.8; // 15px top margin

    // Section title with border-bottom
    pdf.setFontSize(5.3); // 20px equivalent
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(COLORS.primaryText[0], COLORS.primaryText[1], COLORS.primaryText[2]);
    pdf.text('Status Distribution', margin, yPos);
    
    // Border below title
    pdf.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
    pdf.setLineWidth(0.3);
    pdf.line(margin, yPos + 1, margin + cWidth, yPos + 1);
    yPos += 3.8; // 15px margin below title

    // Chart container background
    const containerHeight = 74; // ~280px min-height
    pdf.setFillColor(COLORS.bgOffWhite[0], COLORS.bgOffWhite[1], COLORS.bgOffWhite[2]);
    pdf.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, yPos, cWidth, containerHeight, 2.1, 2.1, 'FD'); // 8px border-radius

    const padding = 5.3; // 20px padding
    const radius = 25; // 200px diameter = 100px radius ≈ 26.5mm, using 25mm
    const chartX = margin + padding + radius;
    const chartY = yPos + padding + radius;
    const legendX = chartX + radius + 7.6; // 30px gap (≈7.6mm)

    const slices = [
      { label: 'Pending', value: stats.pending, color: COLORS.chartAmber },
      { label: 'In Progress', value: stats.inProgress, color: COLORS.chartPurple },
      { label: 'Resolved', value: stats.resolved, color: COLORS.chartGreen },
      { label: 'Declined', value: stats.declined, color: COLORS.chartRed },
    ];

    const total = Math.max(stats.total, 1);
    let startAngle = 0;

    // Draw pie slices
    slices.forEach((s) => {
      const percentage = (s.value / total) * 100;
      const angle = (percentage / 100) * 360;
      this.drawPieSlice(pdf, chartX, chartY, radius, startAngle, startAngle + angle, s.color);
      startAngle += angle;
    });

    // Legend on the right
    let legendY = yPos + padding;
    pdf.setFontSize(3.2); // 12px equivalent
    pdf.setFont('Helvetica', 'normal');
    pdf.setTextColor(COLORS.bodyText[0], COLORS.bodyText[1], COLORS.bodyText[2]);

    slices.forEach((s) => {
      const pct = ((s.value / total) * 100).toFixed(1);
      
      // Bullet (circle)
      pdf.setFillColor(s.color[0], s.color[1], s.color[2]);
      pdf.circle(legendX, legendY - 0.8, 1, 'F');

      // Label text
      pdf.text(`${s.label} (${pct}%)`, legendX + 2.5, legendY);
      legendY += 5.7; // 24px line-height (≈5.7mm)
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
    yPos += 7.1; // 30px top margin

    // Left border accent (4px = 1mm)
    pdf.setFillColor(COLORS.brandRed[0], COLORS.brandRed[1], COLORS.brandRed[2]);
    pdf.rect(margin, yPos - 2, 1, 4, 'F');

    // Title - 18px equivalent (≈4.8mm)
    pdf.setFontSize(4.8);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(COLORS.primaryText[0], COLORS.primaryText[1], COLORS.primaryText[2]);
    pdf.text(title, margin + 3.2, yPos); // 12px padding-left (≈3.2mm)
  },

  addKeyFindings(pdf: jsPDF, stats: ReportStats, yPos: number, margin: number, cWidth: number): void {
    yPos += 3.8; // 15px margin below section title

    const total = Math.max(stats.total, 1);
    const resolutionRate = Math.round((stats.resolved / total) * 100);
    const pendingRate = Math.round((stats.pending / total) * 100);
    const inProgressRate = Math.round((stats.inProgress / total) * 100);
    const highPriorityRate = Math.round((stats.highPriority / total) * 100);

    const findings = [
      { label: 'Overall Resolution Rate', value: `${resolutionRate}%`, detail: `(${stats.resolved} of ${total} reports)` },
      { label: 'Pending Reports', value: `${pendingRate}%`, detail: `(${stats.pending} reports awaiting action)` },
      { label: 'In Progress', value: `${inProgressRate}%`, detail: `(${stats.inProgress} reports being handled)` },
      { label: 'High Priority Cases', value: `${highPriorityRate}%`, detail: `(${stats.highPriority} reports)` },
    ];

    let y = yPos;
    const indent = 5.7; // 24px padding-left
    const lineHeight = 4.6; // 1.8 line-height
    const itemSpacing = 2.6; // 10px between items

    pdf.setFontSize(3.4); // 13px equivalent
    pdf.setFont('Helvetica', 'normal');
    pdf.setTextColor(COLORS.bodyText[0], COLORS.bodyText[1], COLORS.bodyText[2]);

    findings.forEach((finding) => {
      // Bullet point (disc)
      pdf.setFillColor(COLORS.bodyText[0], COLORS.bodyText[1], COLORS.bodyText[2]);
      pdf.circle(margin + indent / 2, y - 0.5, 0.8, 'F');

      // Format: "Label: Value (Detail)"
      const text = `${finding.label}: ${finding.value} ${finding.detail}`;
      const lines = pdf.splitTextToSize(text, cWidth - indent - 2);
      
      // Bold the label and value
      pdf.setFont('Helvetica', 'bold');
      pdf.text(`${finding.label}: ${finding.value}`, margin + indent, y);
      
      // Normal weight for detail
      pdf.setFont('Helvetica', 'normal');
      if (lines.length > 1) {
        pdf.text(finding.detail, margin + indent, y + lineHeight);
        y += lineHeight * 2 + itemSpacing;
      } else {
        y += lineHeight + itemSpacing;
      }
    });
  },

  addDetailedReportTable(pdf: jsPDF, reports: Report[], yPos: number, margin: number, cWidth: number, pageHeight: number): void {
    this.addDetailTable(pdf, reports, yPos, margin, cWidth, pageHeight);
  },

  addParagraph(pdf: jsPDF, text: string, yPos: number, margin: number, cWidth: number): void {
    yPos += 3.8; // 15px margin below section title

    // Background container
    const lines = pdf.splitTextToSize(text, cWidth - 6.4); // Account for padding
    const lineHeight = 4.6; // 1.8 line-height for 13px font (≈4.6mm)
    const padding = 3.8; // 15px padding
    const boxHeight = lines.length * lineHeight + padding * 2;

    pdf.setFillColor(COLORS.bgSection[0], COLORS.bgSection[1], COLORS.bgSection[2]);
    pdf.setDrawColor(COLORS.brandRed[0], COLORS.brandRed[1], COLORS.brandRed[2]);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, yPos, cWidth, boxHeight, 'FD');
    
    // Left border accent
    pdf.setFillColor(COLORS.brandRed[0], COLORS.brandRed[1], COLORS.brandRed[2]);
    pdf.rect(margin, yPos, 1, boxHeight, 'F');

    // Text - 13px equivalent (≈3.4mm)
    pdf.setFontSize(3.4);
    pdf.setFont('Helvetica', 'normal');
    pdf.setTextColor(COLORS.bodyText[0], COLORS.bodyText[1], COLORS.bodyText[2]);
    
    let currentY = yPos + padding;
    lines.forEach((line: string) => {
      pdf.text(line, margin + padding, currentY);
      currentY += lineHeight;
    });
  },

  addStatusChart(pdf: jsPDF, stats: ReportStats, yPos: number, margin: number, cWidth: number): number {
    const items = [
      { label: 'Resolved', value: stats.resolved, color: COLORS.statGreen },
      { label: 'In Progress', value: stats.inProgress, color: COLORS.statPurple },
      { label: 'Pending', value: stats.pending, color: COLORS.statAmber },
      { label: 'Declined', value: stats.declined, color: COLORS.chartRed },
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
      { label: 'High Priority', key: 'high', color: COLORS.chartRed },
      { label: 'Medium Priority', key: 'medium', color: COLORS.statAmber },
      { label: 'Low Priority', key: 'low', color: COLORS.statGreen },
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
    yPos += 6.6; // 25px top margin

    const cols = [
      { header: '#', key: 'case_number', width: 12 },
      { header: 'Title', key: 'title', width: 60 },
      { header: 'Status', key: 'status', width: 25 },
      { header: 'Category', key: 'category', width: 30 },
    ];

    const headerHeight = 8.5; // ~32px
    const rowHeight = 8.5; // ~32px
    let y = yPos;

    const drawHeader = () => {
      pdf.setFillColor(COLORS.tableHeader[0], COLORS.tableHeader[1], COLORS.tableHeader[2]);
      pdf.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
      pdf.setFontSize(3.2); // 12px equivalent
      pdf.setFont('Helvetica', 'bold');
      pdf.setDrawColor(COLORS.brandRed[0], COLORS.brandRed[1], COLORS.brandRed[2]);
      pdf.setLineWidth(0.5); // 2px border-bottom

      let x = margin;
      cols.forEach((col) => {
        pdf.rect(x, y, col.width, headerHeight, 'FD');
        pdf.text(col.header, x + col.width / 2, y + 5.3, { align: 'center', maxWidth: col.width - 2 });
        x += col.width;
      });

      // Bottom border
      pdf.setDrawColor(COLORS.brandRed[0], COLORS.brandRed[1], COLORS.brandRed[2]);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y + headerHeight, margin + cWidth, y + headerHeight);

      y += headerHeight;
    };

    drawHeader();

    pdf.setTextColor(COLORS.bodyText[0], COLORS.bodyText[1], COLORS.bodyText[2]);
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(3.2); // 12px equivalent

    reports.forEach((r, idx) => {
      if (y > pageHeight - 20) {
        pdf.addPage();
        y = 20;
        drawHeader();
        
        // Add continuation notice
        pdf.setFontSize(2.6);
        pdf.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
        pdf.setFont('Helvetica', 'italic');
        pdf.text('(Continued from previous page...)', margin, y - 2);
        y += 3;
      }

      // Zebra striping - even rows
      if (idx % 2 === 0) {
        pdf.setFillColor(COLORS.bgSection[0], COLORS.bgSection[1], COLORS.bgSection[2]);
        pdf.rect(margin, y, cWidth, rowHeight, 'F');
      }

      let x = margin;
      const cellPadding = 2.6; // 10px
      cols.forEach((col) => {
        let val = (r as any)[col.key] || '';
        if (typeof val === 'object') val = JSON.stringify(val);
        
        // Normalize the value for consistent display
        if (col.key === 'status' || col.key === 'category') {
          val = this.normalizeValue(String(val));
        }
        
        // Truncate long text
        const maxLen = col.key === 'title' ? 50 : 20;
        val = String(val).substring(0, maxLen);
        if (col.key === 'title' && String((r as any)[col.key] || '').length > maxLen) {
          val += '...';
        }

        pdf.text(val, x + cellPadding, y + 5.3, { maxWidth: col.width - cellPadding * 2 });

        // Column divider
        pdf.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
        pdf.setLineWidth(0.3);
        pdf.line(x + col.width, y, x + col.width, y + rowHeight);

        x += col.width;
      });

      // Row border
      pdf.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
      pdf.setLineWidth(0.3);
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
    const margin = 7;
    const footerHeight = 10; // ~30px
    const topPadding = 3.2; // 12px

    for (let i = 1; i <= pCount; i++) {
      pdf.setPage(i);

      // Top border
      pdf.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
      pdf.setLineWidth(0.3);
      pdf.line(margin, ph - footerHeight, pw - margin, ph - footerHeight);

      pdf.setFontSize(2.6); // 10px equivalent
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);

      // Left: Report name
      const reportName = month ? `${this.getMonthName(month)} ${year}` : `${year} Annual Report`;
      pdf.text('Cars-G Community Reports', margin, ph - topPadding);
      
      // Center: Page numbers
      pdf.setFont('Helvetica', 'bold');
      pdf.text(`Page ${i} of ${pCount}`, pw / 2, ph - topPadding, { align: 'center' });
      
      // Right: Current date
      pdf.setFont('Helvetica', 'normal');
      const genDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      pdf.text(genDate, pw - margin, ph - topPadding, { align: 'right' });
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
