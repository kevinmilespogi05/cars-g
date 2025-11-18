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
    // Validate stats before generating PDF
    const validatedStats = this.validateStats(stats);
    
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    // Convert pixels to mm: 20px ≈ 5.3mm, 25px ≈ 6.6mm
    const margin = 7; // ~20px equivalent
    const topMargin = 7; // ~25px equivalent
    const cw = pw - 2 * margin;

    // PAGE 1: Professional Cover Page
    this.addCoverPage(pdf, `Monthly Report`, `${this.getMonthName(month)} ${year}`, pw, ph, month, year);
    
    // PAGE 2: Table of Contents
    pdf.addPage();
    this.addTableOfContents(pdf, 'monthly', pw, ph, margin);
    
    // PAGE 3: Key Metrics + Executive Summary
    pdf.addPage();
    this.addGradientHeader(pdf, `Monthly Report - ${this.getMonthName(month)} ${year}`, pw, month, year);
    let currentY = 45; // After header
    this.addKeyMetricsCards(pdf, validatedStats, currentY, margin, cw);
    currentY += 35; // After cards
    this.addEnhancedExecutiveSummary(pdf, validatedStats, month, year, 'monthly', currentY, margin, cw);

    // PAGE 4: Key Findings & Metrics
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Key Findings & Metrics', currentY, margin);
    currentY += 8;
    this.addKeyFindings(pdf, validatedStats, currentY, margin, cw);

    // PAGE 5: Status & Category Breakdown
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Status Overview', currentY, margin);
    currentY += 8;
    this.addStatusChart(pdf, validatedStats, currentY, margin, cw);
    currentY += 35;

    this.addSectionTitle(pdf, 'Reports by Category', currentY, margin);
    currentY += 8;
    this.addCategoryChart(pdf, validatedStats, currentY, margin, cw);
    
    // PAGE 6: Trend Analysis (if we have enough data)
    if (reports.length > 0) {
      pdf.addPage();
      currentY = topMargin;
      this.addSectionTitle(pdf, 'Report Trends', currentY, margin);
      currentY += 8;
      this.addTrendChart(pdf, reports, currentY, margin, cw, 'monthly');
    }

    // PAGE 7+: Detailed Table
    if (reports.length > 0) {
      pdf.addPage();
      currentY = topMargin;
      this.addSectionTitle(pdf, 'Detailed Report Listing', currentY, margin);
      currentY += 8;
      this.addEnhancedDetailTable(pdf, reports, currentY, margin, cw, ph);
    }

    this.addEnhancedFooter(pdf, month, year);
    pdf.save(filename);
  },

  async generateMonthlyPDFPreview(
    reports: Report[],
    year: number,
    month: number,
    stats: ReportStats
  ): Promise<string> {
    // Validate stats before generating PDF
    const validatedStats = this.validateStats(stats);
    
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 7;
    const topMargin = 7;
    const cw = pw - 2 * margin;

    // PAGE 1: Professional Cover Page
    this.addCoverPage(pdf, `Monthly Report`, `${this.getMonthName(month)} ${year}`, pw, ph, month, year);
    
    // PAGE 2: Table of Contents
    pdf.addPage();
    this.addTableOfContents(pdf, 'monthly', pw, ph, margin);
    
    // PAGE 3: Key Metrics + Executive Summary
    pdf.addPage();
    this.addGradientHeader(pdf, `Monthly Report - ${this.getMonthName(month)} ${year}`, pw, month, year);
    let currentY = 45;
    this.addKeyMetricsCards(pdf, validatedStats, currentY, margin, cw);
    currentY += 35;
    this.addEnhancedExecutiveSummary(pdf, validatedStats, month, year, 'monthly', currentY, margin, cw);

    // PAGE 4: Key Findings & Metrics
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Key Findings & Metrics', currentY, margin);
    currentY += 8;
    this.addKeyFindings(pdf, validatedStats, currentY, margin, cw);

    // PAGE 5: Status & Category Breakdown
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Status Overview', currentY, margin);
    currentY += 8;
    this.addStatusChart(pdf, validatedStats, currentY, margin, cw);
    currentY += 35;

    this.addSectionTitle(pdf, 'Reports by Category', currentY, margin);
    currentY += 8;
    this.addCategoryChart(pdf, validatedStats, currentY, margin, cw);
    
    // PAGE 6: Trend Analysis
    if (reports.length > 0) {
      pdf.addPage();
      currentY = topMargin;
      this.addSectionTitle(pdf, 'Report Trends', currentY, margin);
      currentY += 8;
      this.addTrendChart(pdf, reports, currentY, margin, cw, 'monthly');
    }

    // PAGE 7+: Detailed Table
    if (reports.length > 0) {
      pdf.addPage();
      currentY = topMargin;
      this.addSectionTitle(pdf, 'Detailed Report Listing', currentY, margin);
      currentY += 8;
      this.addEnhancedDetailTable(pdf, reports, currentY, margin, cw, ph);
    }

    this.addEnhancedFooter(pdf, month, year);
    const blob = pdf.output('blob');
    return URL.createObjectURL(blob);
  },

  async generateYearlyPDF(
    reports: Report[],
    year: number,
    stats: ReportStats,
    filename: string
  ): Promise<void> {
    // Validate stats before generating PDF
    const validatedStats = this.validateStats(stats);
    
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 7;
    const topMargin = 7;
    const cw = pw - 2 * margin;

    // PAGE 1: Professional Cover Page
    this.addCoverPage(pdf, `Annual Report`, `${year}`, pw, ph, 0, year);
    
    // PAGE 2: Table of Contents
    pdf.addPage();
    this.addTableOfContents(pdf, 'yearly', pw, ph, margin);
    
    // PAGE 3: Key Metrics + Executive Summary
    pdf.addPage();
    this.addGradientHeader(pdf, `Annual Report - ${year}`, pw, 0, year);
    let currentY = 45;
    this.addKeyMetricsCards(pdf, validatedStats, currentY, margin, cw);
    currentY += 35;
    this.addEnhancedExecutiveSummary(pdf, validatedStats, 0, year, 'yearly', currentY, margin, cw);

    // PAGE 4: Key Findings & Analysis
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Key Findings & Analysis', currentY, margin);
    currentY += 8;
    this.addKeyFindings(pdf, validatedStats, currentY, margin, cw);

    // PAGE 5: Resolution & Priority Distribution
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Resolution Summary', currentY, margin);
    currentY += 8;
    this.addStatusChart(pdf, validatedStats, currentY, margin, cw);
    currentY += 35;

    this.addSectionTitle(pdf, 'Priority Distribution', currentY, margin);
    currentY += 8;
    this.addPriorityChart(pdf, validatedStats, currentY, margin, cw);

    // PAGE 6: Category Analysis
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Top Categories by Report Count', currentY, margin);
    currentY += 8;
    this.addCategoryChart(pdf, validatedStats, currentY, margin, cw);
    
    // PAGE 7: Trend Analysis (monthly breakdown for yearly report)
    if (reports.length > 0) {
      pdf.addPage();
      currentY = topMargin;
      this.addSectionTitle(pdf, 'Monthly Trends', currentY, margin);
      currentY += 8;
      this.addTrendChart(pdf, reports, currentY, margin, cw, 'yearly');
    }

    // PAGE 8+: Detailed Table
    if (reports.length > 0) {
      pdf.addPage();
      currentY = topMargin;
      this.addSectionTitle(pdf, 'Complete Report Listing', currentY, margin);
      currentY += 8;
      this.addEnhancedDetailTable(pdf, reports, currentY, margin, cw, ph);
    }

    this.addEnhancedFooter(pdf, 0, year);
    pdf.save(filename);
  },

  async generateYearlyPDFPreview(
    reports: Report[],
    year: number,
    stats: ReportStats
  ): Promise<string> {
    // Validate stats before generating PDF
    const validatedStats = this.validateStats(stats);
    
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 7;
    const topMargin = 7;
    const cw = pw - 2 * margin;

    // PAGE 1: Professional Cover Page
    this.addCoverPage(pdf, `Annual Report`, `${year}`, pw, ph, 0, year);
    
    // PAGE 2: Table of Contents
    pdf.addPage();
    this.addTableOfContents(pdf, 'yearly', pw, ph, margin);
    
    // PAGE 3: Key Metrics + Executive Summary
    pdf.addPage();
    this.addGradientHeader(pdf, `Annual Report - ${year}`, pw, 0, year);
    let currentY = 45;
    this.addKeyMetricsCards(pdf, validatedStats, currentY, margin, cw);
    currentY += 35;
    this.addEnhancedExecutiveSummary(pdf, validatedStats, 0, year, 'yearly', currentY, margin, cw);

    // PAGE 4: Key Findings & Analysis
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Key Findings & Analysis', currentY, margin);
    currentY += 8;
    this.addKeyFindings(pdf, validatedStats, currentY, margin, cw);

    // PAGE 5: Resolution & Priority Distribution
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Resolution Summary', currentY, margin);
    currentY += 8;
    this.addStatusChart(pdf, validatedStats, currentY, margin, cw);
    currentY += 35;

    this.addSectionTitle(pdf, 'Priority Distribution', currentY, margin);
    currentY += 8;
    this.addPriorityChart(pdf, validatedStats, currentY, margin, cw);

    // PAGE 6: Category Analysis
    pdf.addPage();
    currentY = topMargin;
    this.addSectionTitle(pdf, 'Top Categories by Report Count', currentY, margin);
    currentY += 8;
    this.addCategoryChart(pdf, validatedStats, currentY, margin, cw);
    
    // PAGE 7: Trend Analysis
    if (reports.length > 0) {
      pdf.addPage();
      currentY = topMargin;
      this.addSectionTitle(pdf, 'Monthly Trends', currentY, margin);
      currentY += 8;
      this.addTrendChart(pdf, reports, currentY, margin, cw, 'yearly');
    }

    // PAGE 8+: Detailed Table
    if (reports.length > 0) {
      pdf.addPage();
      currentY = topMargin;
      this.addSectionTitle(pdf, 'Complete Report Listing', currentY, margin);
      currentY += 8;
      this.addEnhancedDetailTable(pdf, reports, currentY, margin, cw, ph);
    }

    this.addEnhancedFooter(pdf, 0, year);
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
    const highPriorityRate = Math.round(((stats.highPriority || 0) / total) * 100);

    const findings = [
      { label: 'Overall Resolution Rate', value: `${resolutionRate}%`, detail: `(${stats.resolved} of ${total} reports)` },
      { label: 'Pending Reports', value: `${pendingRate}%`, detail: `(${stats.pending} reports awaiting action)` },
      { label: 'In Progress', value: `${inProgressRate}%`, detail: `(${stats.inProgress} reports being handled)` },
      { label: 'High Priority Cases', value: `${highPriorityRate}%`, detail: `(${stats.highPriority || 0} reports)` },
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
    // Add null/undefined checks for byPriority
    if (!stats.byPriority) {
      stats.byPriority = {};
    }

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
      const val = (stats.byPriority && stats.byPriority[item.key]) ? stats.byPriority[item.key] : 0;
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
    const highPriority = stats.highPriority || 0;

    if (type === 'monthly') {
      const mName = this.getMonthName(month);
      return `During ${mName} ${year}, the community reports system processed ${stats.total} cases with a ${rRate}% resolution rate. Key metrics show ${stats.resolved} cases successfully resolved, ${stats.inProgress} currently in progress, ${stats.pending} pending action, and ${highPriority} identified as high priority. This comprehensive analysis reflects the system's operational efficiency and community engagement levels for the specified period.`;
    }

    return `Throughout ${year}, the community reported system maintained consistent service delivery with ${stats.total} total cases handled. Annual performance indicators demonstrate a ${rRate}% overall resolution rate, with ${stats.resolved} successfully resolved cases, ${stats.inProgress} in active progress, ${stats.pending} pending resolution, and ${highPriority} flagged as high priority. These metrics underscore effective case management and sustained community engagement throughout the fiscal year.`;
  },

  // Validate and normalize stats data
  validateStats(stats: ReportStats): ReportStats {
    return {
      total: stats.total || 0,
      pending: stats.pending || 0,
      inProgress: stats.inProgress || 0,
      resolved: stats.resolved || 0,
      declined: stats.declined || 0,
      highPriority: stats.highPriority || 0,
      byCategory: stats.byCategory || {},
      byPriority: stats.byPriority || {},
      byStatus: stats.byStatus || {},
      avgResolutionTime: stats.avgResolutionTime,
      resolvedThisMonth: stats.resolvedThisMonth,
    };
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

  // Professional cover page with branding
  addCoverPage(
    pdf: jsPDF,
    reportType: string,
    period: string,
    pageWidth: number,
    pageHeight: number,
    month?: number,
    year?: number
  ): void {
    // Background gradient effect (simulated with rectangles)
    pdf.setFillColor(250, 250, 250);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Top accent bar
    pdf.setFillColor(COLORS.brandRed[0], COLORS.brandRed[1], COLORS.brandRed[2]);
    pdf.rect(0, 0, pageWidth, 20, 'F');
    
    // Main title area - centered vertically
    const centerY = pageHeight / 2;
    let yPos = centerY - 30;
    
    // Report type - large
    pdf.setFontSize(16);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(COLORS.primaryText[0], COLORS.primaryText[1], COLORS.primaryText[2]);
    pdf.text(reportType, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    // Period - medium
    pdf.setFontSize(12);
    pdf.setFont('Helvetica', 'normal');
    pdf.setTextColor(COLORS.brandRed[0], COLORS.brandRed[1], COLORS.brandRed[2]);
    pdf.text(period, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Organization name
    pdf.setFontSize(8);
    pdf.setTextColor(COLORS.secondaryText[0], COLORS.secondaryText[1], COLORS.secondaryText[2]);
    pdf.text('Cars-G Community Reporting System', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    // Generation date
    const genDate = new Date();
    const dateStr = genDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    pdf.setFontSize(6);
    pdf.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
    pdf.text(`Generated: ${dateStr}`, pageWidth / 2, yPos, { align: 'center' });
    
    // Bottom border
    pdf.setFillColor(COLORS.brandRed[0], COLORS.brandRed[1], COLORS.brandRed[2]);
    pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    
    // Confidential notice at bottom
    pdf.setFontSize(5);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Confidential - For Internal Use Only', pageWidth / 2, pageHeight - 8, { align: 'center' });
  },

  // Table of contents
  addTableOfContents(
    pdf: jsPDF,
    reportType: 'monthly' | 'yearly',
    pageWidth: number,
    pageHeight: number,
    margin: number
  ): void {
    let yPos = margin + 20;
    
    // Title
    pdf.setFontSize(14);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(COLORS.primaryText[0], COLORS.primaryText[1], COLORS.primaryText[2]);
    pdf.text('Table of Contents', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Section divider
    pdf.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
    
    // Contents
    pdf.setFontSize(10);
    pdf.setFont('Helvetica', 'normal');
    pdf.setTextColor(COLORS.bodyText[0], COLORS.bodyText[1], COLORS.bodyText[2]);
    
    const contents = reportType === 'monthly' 
      ? [
          { title: 'Cover Page', page: 1 },
          { title: 'Table of Contents', page: 2 },
          { title: 'Key Metrics & Executive Summary', page: 3 },
          { title: 'Key Findings & Metrics', page: 4 },
          { title: 'Status & Category Analysis', page: 5 },
          { title: 'Report Trends', page: 6 },
          { title: 'Detailed Report Listing', page: 7 },
        ]
      : [
          { title: 'Cover Page', page: 1 },
          { title: 'Table of Contents', page: 2 },
          { title: 'Key Metrics & Executive Summary', page: 3 },
          { title: 'Key Findings & Analysis', page: 4 },
          { title: 'Resolution & Priority Distribution', page: 5 },
          { title: 'Category Analysis', page: 6 },
          { title: 'Monthly Trends', page: 7 },
          { title: 'Complete Report Listing', page: 8 },
        ];
    
    contents.forEach((item) => {
      pdf.text(item.title, margin + 5, yPos);
      pdf.setFont('Helvetica', 'bold');
      pdf.text(`... ${item.page}`, pageWidth - margin - 5, yPos, { align: 'right' });
      pdf.setFont('Helvetica', 'normal');
      yPos += 7;
    });
  },

  // Enhanced executive summary with KPIs
  addEnhancedExecutiveSummary(
    pdf: jsPDF,
    stats: ReportStats,
    month: number,
    year: number,
    type: 'monthly' | 'yearly',
    yPos: number,
    margin: number,
    cWidth: number
  ): void {
    yPos += 10;
    
    // Section title
    this.addSectionTitle(pdf, 'Executive Summary', yPos - 10, margin);
    yPos += 5;
    
    // KPI Cards Row
    const total = Math.max(stats.total, 1);
    const resolutionRate = Math.round((stats.resolved / total) * 100);
    const avgResolutionTime = stats.avgResolutionTime || 0;
    
    const kpis = [
      { label: 'Total Reports', value: stats.total, color: COLORS.statBlue },
      { label: 'Resolution Rate', value: `${resolutionRate}%`, color: COLORS.statGreen },
      { label: 'High Priority', value: stats.highPriority || 0, color: COLORS.chartRed },
    ];
    
    const cardWidth = (cWidth - 10) / 3;
    const cardHeight = 15;
    let x = margin;
    
    kpis.forEach((kpi) => {
      // Card background
      pdf.setFillColor(COLORS.bgLight[0], COLORS.bgLight[1], COLORS.bgLight[2]);
      pdf.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, 'FD');
      
      // Left accent
      pdf.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      pdf.rect(x, yPos, 2, cardHeight, 'F');
      
      // Value
      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'bold');
      pdf.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      pdf.text(String(kpi.value), x + cardWidth / 2, yPos + 8, { align: 'center' });
      
      // Label
      pdf.setFontSize(6);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(COLORS.secondaryText[0], COLORS.secondaryText[1], COLORS.secondaryText[2]);
      pdf.text(kpi.label, x + cardWidth / 2, yPos + 12, { align: 'center' });
      
      x += cardWidth + 5;
    });
    
    yPos += cardHeight + 10;
    
    // Summary text
    const summaryText = this.generateSummaryText(stats, month, year, type);
    this.addParagraph(pdf, summaryText, yPos, margin, cWidth);
  },

  // Trend chart showing reports over time
  addTrendChart(
    pdf: jsPDF,
    reports: Report[],
    yPos: number,
    margin: number,
    cWidth: number,
    type: 'monthly' | 'yearly'
  ): void {
    yPos += 5;
    
    // Container
    const chartHeight = 50;
    pdf.setFillColor(COLORS.bgOffWhite[0], COLORS.bgOffWhite[1], COLORS.bgOffWhite[2]);
    pdf.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, yPos, cWidth, chartHeight, 2, 2, 'FD');
    
    // Group reports by time period
    const data: { label: string; count: number }[] = [];
    
    if (type === 'monthly') {
      // Group by week for monthly report
      const weekGroups: Record<string, number> = {};
      reports.forEach((r) => {
        const date = new Date(r.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
        weekGroups[weekKey] = (weekGroups[weekKey] || 0) + 1;
      });
      
      Object.entries(weekGroups)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([label, count]) => {
          data.push({ label, count });
        });
    } else {
      // Group by month for yearly report
      const monthGroups: Record<string, number> = {};
      reports.forEach((r) => {
        const date = new Date(r.created_at);
        const monthKey = this.getMonthName(date.getMonth() + 1).substring(0, 3);
        monthGroups[monthKey] = (monthGroups[monthKey] || 0) + 1;
      });
      
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthOrder.forEach((month) => {
        if (monthGroups[month]) {
          data.push({ label: month, count: monthGroups[month] });
        }
      });
    }
    
    if (data.length === 0) {
      pdf.setFontSize(8);
      pdf.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
      pdf.text('No trend data available', margin + cWidth / 2, yPos + chartHeight / 2, { align: 'center' });
      return;
    }
    
    // Draw simple bar chart
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const barWidth = (cWidth - 40) / data.length;
    const chartAreaHeight = chartHeight - 20;
    const padding = 10;
    
    let x = margin + padding;
    const baseY = yPos + chartHeight - padding;
    
    data.forEach((item, idx) => {
      const barHeight = (item.count / maxCount) * chartAreaHeight;
      
      // Bar
      pdf.setFillColor(COLORS.statBlue[0], COLORS.statBlue[1], COLORS.statBlue[2]);
      pdf.rect(x, baseY - barHeight, barWidth - 2, barHeight, 'F');
      
      // Label
      pdf.setFontSize(6);
      pdf.setTextColor(COLORS.bodyText[0], COLORS.bodyText[1], COLORS.bodyText[2]);
      pdf.text(item.label, x + barWidth / 2, baseY + 3, { align: 'center' });
      
      // Value
      pdf.setFontSize(5);
      pdf.text(String(item.count), x + barWidth / 2, baseY - barHeight - 2, { align: 'center' });
      
      x += barWidth;
    });
  },

  // Enhanced detail table with more columns
  addEnhancedDetailTable(
    pdf: jsPDF,
    reports: Report[],
    yPos: number,
    margin: number,
    cWidth: number,
    pageHeight: number
  ): void {
    yPos += 6.6;
    
    const cols = [
      { header: '#', key: 'case_number', width: 12 },
      { header: 'Title', key: 'title', width: 50 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Priority', key: 'priority', width: 18 },
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Date', key: 'created_at', width: 20 },
    ];
    
    const headerHeight = 8.5;
    const rowHeight = 8.5;
    let y = yPos;
    
    const drawHeader = () => {
      pdf.setFillColor(COLORS.tableHeader[0], COLORS.tableHeader[1], COLORS.tableHeader[2]);
      pdf.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
      pdf.setFontSize(3);
      pdf.setFont('Helvetica', 'bold');
      pdf.setDrawColor(COLORS.brandRed[0], COLORS.brandRed[1], COLORS.brandRed[2]);
      pdf.setLineWidth(0.5);
      
      let x = margin;
      cols.forEach((col) => {
        pdf.rect(x, y, col.width, headerHeight, 'FD');
        pdf.text(col.header, x + col.width / 2, y + 5.3, { align: 'center', maxWidth: col.width - 2 });
        x += col.width;
      });
      
      pdf.setDrawColor(COLORS.brandRed[0], COLORS.brandRed[1], COLORS.brandRed[2]);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y + headerHeight, margin + cWidth, y + headerHeight);
      
      y += headerHeight;
    };
    
    drawHeader();
    
    pdf.setTextColor(COLORS.bodyText[0], COLORS.bodyText[1], COLORS.bodyText[2]);
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(3);
    
    reports.forEach((r, idx) => {
      if (y > pageHeight - 20) {
        pdf.addPage();
        y = 20;
        drawHeader();
        
        pdf.setFontSize(2.6);
        pdf.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
        pdf.setFont('Helvetica', 'italic');
        pdf.text('(Continued from previous page...)', margin, y - 2);
        y += 3;
      }
      
      if (idx % 2 === 0) {
        pdf.setFillColor(COLORS.bgSection[0], COLORS.bgSection[1], COLORS.bgSection[2]);
        pdf.rect(margin, y, cWidth, rowHeight, 'F');
      }
      
      let x = margin;
      const cellPadding = 2;
      
      cols.forEach((col) => {
        let val: string = '';
        
        if (col.key === 'created_at') {
          const date = new Date(r.created_at);
          val = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } else {
          val = String((r as any)[col.key] || '');
          if (col.key === 'status' || col.key === 'category' || col.key === 'priority') {
            val = this.normalizeValue(val);
          }
        }
        
        const maxLen = col.key === 'title' ? 40 : 15;
        if (val.length > maxLen) {
          val = val.substring(0, maxLen - 3) + '...';
        }
        
        pdf.text(val, x + cellPadding, y + 5.3, { maxWidth: col.width - cellPadding * 2 });
        
        pdf.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
        pdf.setLineWidth(0.3);
        pdf.line(x + col.width, y, x + col.width, y + rowHeight);
        
        x += col.width;
      });
      
      pdf.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y + rowHeight, margin + cWidth, y + rowHeight);
      
      y += rowHeight;
    });
  },

  // Enhanced footer with better branding
  addEnhancedFooter(pdf: jsPDF, month: number, year: number): void {
    const pCount = pdf.getNumberOfPages();
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 7;
    const footerHeight = 10;
    const topPadding = 3.2;
    
    for (let i = 1; i <= pCount; i++) {
      pdf.setPage(i);
      
      // Top border with brand color
      pdf.setDrawColor(COLORS.brandRed[0], COLORS.brandRed[1], COLORS.brandRed[2]);
      pdf.setLineWidth(0.5);
      pdf.line(margin, ph - footerHeight, pw - margin, ph - footerHeight);
      
      pdf.setFontSize(2.6);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(COLORS.lightText[0], COLORS.lightText[1], COLORS.lightText[2]);
      
      // Left: Organization name
      pdf.text('Cars-G Community Reports', margin, ph - topPadding);
      
      // Center: Page numbers
      pdf.setFont('Helvetica', 'bold');
      pdf.text(`Page ${i} of ${pCount}`, pw / 2, ph - topPadding, { align: 'center' });
      
      // Right: Generation date and classification
      pdf.setFont('Helvetica', 'normal');
      const genDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      pdf.text(`${genDate} | Confidential`, pw - margin, ph - topPadding, { align: 'right' });
    }
  },
};
