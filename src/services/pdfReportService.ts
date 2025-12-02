import jsPDF from 'jspdf';
import type { Report } from '../types';
import type { ReportStats } from '../lib/reportStats';

// Modern Professional Color Palette
const COLORS = {
  // Primary Brand Colors
  primary: [15, 23, 42], // Slate-900 - Deep professional blue-black
  primaryLight: [30, 41, 59], // Slate-800
  accent: [220, 38, 38], // Red-600 - Accent for important elements
  accentLight: [239, 68, 68], // Red-500
  
  // Status Colors - Modern, Accessible
  success: [16, 185, 129], // Emerald-500 - Resolved
  warning: [245, 158, 11], // Amber-500 - Pending
  info: [59, 130, 246], // Blue-500 - In Progress
  danger: [239, 68, 68], // Red-500 - Declined/Urgent
  
  // Neutral Colors
  textPrimary: [15, 23, 42], // Slate-900
  textSecondary: [71, 85, 105], // Slate-600
  textTertiary: [148, 163, 184], // Slate-400
  border: [226, 232, 240], // Slate-200
  background: [248, 250, 252], // Slate-50
  backgroundCard: [255, 255, 255], // White
  
  // Chart Colors - Professional Palette
  chartBlue: [59, 130, 246],
  chartGreen: [16, 185, 129],
  chartAmber: [245, 158, 11],
  chartPurple: [139, 92, 246],
  chartTeal: [20, 184, 166],
  chartOrange: [249, 115, 22],
  chartPink: [236, 72, 153],
  chartIndigo: [99, 102, 241],
};

// Typography Scale
const TYPOGRAPHY = {
  h1: 24, // Main titles
  h2: 18, // Section titles
  h3: 14, // Subsection titles
  body: 10, // Body text
  small: 8, // Small text, captions
  tiny: 6, // Footer, metadata
};

// Spacing Scale
const SPACING = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
};

export const pdfReportService = {
  async generateMonthlyPDF(
    reports: Report[],
    year: number,
    month: number,
    stats: ReportStats,
    filename: string
  ): Promise<void> {
    const validatedStats = this.validateStats(stats);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 15; // Increased for better breathing room
    const cw = pw - 2 * margin;

    // Cover Page
    this.addModernCoverPage(pdf, 'Monthly Report', `${this.getMonthName(month)} ${year}`, pw, ph);
    
    // Table of Contents
    pdf.addPage();
    this.addModernTableOfContents(pdf, 'monthly', pw, ph, margin);
    
    // Executive Summary
    pdf.addPage();
    this.addPageHeader(pdf, pw, month, year, 3);
    let yPos = 30;
    this.addExecutiveSummary(pdf, validatedStats, month, year, yPos, margin, cw);
    
    // Key Metrics Dashboard
    pdf.addPage();
    this.addPageHeader(pdf, pw, month, year, 4);
    yPos = 30;
    this.addMetricsDashboard(pdf, validatedStats, yPos, margin, cw, reports);
    
    // Data Visualizations
    pdf.addPage();
    this.addPageHeader(pdf, pw, month, year, 5);
    yPos = 30;
    this.addDataVisualizations(pdf, validatedStats, yPos, margin, cw);
    
    // Trends & Analysis
    if (reports.length > 0) {
      pdf.addPage();
      this.addPageHeader(pdf, pw, month, year, 6);
      yPos = 30;
      this.addTrendsAnalysis(pdf, reports, yPos, margin, cw);
    }
    
    // Priority Issues
    pdf.addPage();
    this.addPageHeader(pdf, pw, month, year, 7);
    yPos = 30;
    this.addPriorityIssues(pdf, reports, yPos, margin, cw, ph);
    
    // Geographic & Category Insights
    if (reports.length > 0) {
      pdf.addPage();
      this.addPageHeader(pdf, pw, month, year, 8);
      yPos = 30;
      this.addInsights(pdf, reports, validatedStats, yPos, margin, cw);
    }
    
    // Recommendations
    pdf.addPage();
    this.addPageHeader(pdf, pw, month, year, 9);
    yPos = 30;
    this.addRecommendations(pdf, validatedStats, reports, yPos, margin, cw);
    
    // Detailed Report Listing
    if (reports.length > 0) {
      pdf.addPage();
      this.addPageHeader(pdf, pw, month, year, 10);
      yPos = 30;
      this.addSectionTitle(pdf, 'Detailed Report Listing', yPos, margin);
      yPos += 10;
      this.addModernDetailTable(pdf, reports, yPos, margin, cw, ph, month, year);
    }

    this.addModernFooter(pdf, month, year);
    pdf.save(filename);
  },

  async generateMonthlyPDFPreview(
    reports: Report[],
    year: number,
    month: number,
    stats: ReportStats
  ): Promise<string> {
    const validatedStats = this.validateStats(stats);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const cw = pw - 2 * margin;

    this.addModernCoverPage(pdf, 'Monthly Report', `${this.getMonthName(month)} ${year}`, pw, ph);
    pdf.addPage();
    this.addModernTableOfContents(pdf, 'monthly', pw, ph, margin);
    pdf.addPage();
    this.addPageHeader(pdf, pw, month, year, 3);
    let yPos = 30;
    this.addExecutiveSummary(pdf, validatedStats, month, year, yPos, margin, cw);
    pdf.addPage();
    this.addPageHeader(pdf, pw, month, year, 4);
    yPos = 30;
    this.addMetricsDashboard(pdf, validatedStats, yPos, margin, cw, reports);
    pdf.addPage();
    this.addPageHeader(pdf, pw, month, year, 5);
    yPos = 30;
    this.addDataVisualizations(pdf, validatedStats, yPos, margin, cw);
    if (reports.length > 0) {
      pdf.addPage();
      this.addPageHeader(pdf, pw, month, year, 6);
      yPos = 30;
      this.addTrendsAnalysis(pdf, reports, yPos, margin, cw);
    }
    pdf.addPage();
    this.addPageHeader(pdf, pw, month, year, 7);
    yPos = 30;
    this.addPriorityIssues(pdf, reports, yPos, margin, cw, ph);
    if (reports.length > 0) {
      pdf.addPage();
      this.addPageHeader(pdf, pw, month, year, 8);
      yPos = 30;
      this.addInsights(pdf, reports, validatedStats, yPos, margin, cw);
    }
    pdf.addPage();
    this.addPageHeader(pdf, pw, month, year, 9);
    yPos = 30;
    this.addRecommendations(pdf, validatedStats, reports, yPos, margin, cw);
    if (reports.length > 0) {
      pdf.addPage();
      this.addPageHeader(pdf, pw, month, year, 10);
      yPos = 30;
      this.addSectionTitle(pdf, 'Detailed Report Listing', yPos, margin);
      yPos += 10;
      this.addModernDetailTable(pdf, reports, yPos, margin, cw, ph, month, year);
    }

    this.addModernFooter(pdf, month, year);
    const blob = pdf.output('blob');
    return URL.createObjectURL(blob);
  },

  async generateYearlyPDF(
    reports: Report[],
    year: number,
    stats: ReportStats,
    filename: string
  ): Promise<void> {
    const validatedStats = this.validateStats(stats);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const cw = pw - 2 * margin;

    this.addModernCoverPage(pdf, 'Annual Report', `${year}`, pw, ph);
    pdf.addPage();
    this.addModernTableOfContents(pdf, 'yearly', pw, ph, margin);
    pdf.addPage();
    this.addPageHeader(pdf, pw, 0, year, 3);
    let yPos = 30;
    this.addExecutiveSummary(pdf, validatedStats, 0, year, yPos, margin, cw);
    pdf.addPage();
    this.addPageHeader(pdf, pw, 0, year, 4);
    yPos = 30;
    this.addMetricsDashboard(pdf, validatedStats, yPos, margin, cw, reports);
    pdf.addPage();
    this.addPageHeader(pdf, pw, 0, year, 5);
    yPos = 30;
    this.addDataVisualizations(pdf, validatedStats, yPos, margin, cw);
    if (reports.length > 0) {
      pdf.addPage();
      this.addPageHeader(pdf, pw, 0, year, 6);
      yPos = 30;
      this.addTrendsAnalysis(pdf, reports, yPos, margin, cw);
    }
    if (reports.length > 0) {
      pdf.addPage();
      this.addPageHeader(pdf, pw, 0, year, 7);
      yPos = 30;
      this.addModernDetailTable(pdf, reports, yPos, margin, cw, ph, 0, year);
    }

    this.addModernFooter(pdf, 0, year);
    pdf.save(filename);
  },

  async generateYearlyPDFPreview(
    reports: Report[],
    year: number,
    stats: ReportStats
  ): Promise<string> {
    const validatedStats = this.validateStats(stats);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const cw = pw - 2 * margin;

    this.addModernCoverPage(pdf, 'Annual Report', `${year}`, pw, ph);
    pdf.addPage();
    this.addModernTableOfContents(pdf, 'yearly', pw, ph, margin);
    pdf.addPage();
    this.addPageHeader(pdf, pw, 0, year, 3);
    let yPos = 30;
    this.addExecutiveSummary(pdf, validatedStats, 0, year, yPos, margin, cw);
    pdf.addPage();
    this.addPageHeader(pdf, pw, 0, year, 4);
    yPos = 30;
    this.addMetricsDashboard(pdf, validatedStats, yPos, margin, cw, reports);
    pdf.addPage();
    this.addPageHeader(pdf, pw, 0, year, 5);
    yPos = 30;
    this.addDataVisualizations(pdf, validatedStats, yPos, margin, cw);
    if (reports.length > 0) {
      pdf.addPage();
      this.addPageHeader(pdf, pw, 0, year, 6);
      yPos = 30;
      this.addTrendsAnalysis(pdf, reports, yPos, margin, cw);
    }
    if (reports.length > 0) {
      pdf.addPage();
      this.addPageHeader(pdf, pw, 0, year, 7);
      yPos = 30;
      this.addModernDetailTable(pdf, reports, yPos, margin, cw, ph, 0, year);
    }

    this.addModernFooter(pdf, 0, year);
    const blob = pdf.output('blob');
    return URL.createObjectURL(blob);
  },

  // Modern Cover Page
  addModernCoverPage(
    pdf: jsPDF,
    reportType: string,
    period: string,
    pageWidth: number,
    pageHeight: number
  ): void {
    // Clean white background
    pdf.setFillColor(...COLORS.backgroundCard);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Top accent bar
    pdf.setFillColor(...COLORS.primary);
    pdf.rect(0, 0, pageWidth, 12, 'F');
    
    // Organization name in header
    pdf.setFontSize(TYPOGRAPHY.body);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('BANTAY SP', 15, 8);
    
    // Main content area - centered
    const centerY = pageHeight / 2;
    let yPos = centerY - 35;
    
    // Report type - large, bold
    pdf.setFontSize(TYPOGRAPHY.h1);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(...COLORS.textPrimary);
    pdf.text(reportType, pageWidth / 2, yPos, { align: 'center' });
    yPos += 18;
    
    // Period - medium, accent color
    pdf.setFontSize(TYPOGRAPHY.h2);
    pdf.setFont('Helvetica', 'normal');
    pdf.setTextColor(...COLORS.accent);
    pdf.text(period, pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;
    
    // Divider line
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.5);
    pdf.line(50, yPos, pageWidth - 50, yPos);
    yPos += 15;
    
    // System name
    pdf.setFontSize(TYPOGRAPHY.body);
    pdf.setTextColor(...COLORS.textSecondary);
    pdf.text('Community Reporting System', pageWidth / 2, yPos, { align: 'center' });
    yPos += 25;
    
    // Generation date
    const genDate = new Date();
    const dateStr = genDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    pdf.setFontSize(TYPOGRAPHY.small);
    pdf.setTextColor(...COLORS.textTertiary);
    pdf.text(`Generated: ${dateStr}`, pageWidth / 2, yPos, { align: 'center' });
    
    // Bottom footer bar
    pdf.setFillColor(...COLORS.primary);
    pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    
    // Confidential notice
    pdf.setFontSize(TYPOGRAPHY.tiny);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Confidential - For Internal Use Only', pageWidth / 2, pageHeight - 6, { align: 'center' });
  },

  // Modern Page Header
  addPageHeader(pdf: jsPDF, pageWidth: number, month?: number, year?: number, pageNum?: number): void {
    // Top bar
    pdf.setFillColor(...COLORS.primary);
    pdf.rect(0, 0, pageWidth, 8, 'F');
    
    // Organization name
    pdf.setFontSize(TYPOGRAPHY.tiny);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('BANTAY SP', 15, 5.5);
    
    // Report title
    const reportTitle = (month !== undefined && month > 0 && year) 
      ? `${this.getMonthName(month)} ${year} Report`
      : year ? `${year} Annual Report` : 'Community Report';
    pdf.text(reportTitle, pageWidth / 2, 5.5, { align: 'center' });
    
    // Page number
    if (pageNum !== undefined) {
      pdf.text(`Page ${pageNum}`, pageWidth - 15, 5.5, { align: 'right' });
    }
    
    // Subtle line below
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.3);
    pdf.line(15, 12, pageWidth - 15, 12);
  },

  // Modern Table of Contents
  addModernTableOfContents(
    pdf: jsPDF,
    reportType: 'monthly' | 'yearly',
    pageWidth: number,
    pageHeight: number,
    margin: number
  ): void {
    let yPos = margin + 20;
    
    // Title
    pdf.setFontSize(TYPOGRAPHY.h1);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(...COLORS.textPrimary);
    pdf.text('Table of Contents', pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;
    
    // Divider
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;
    
    // Contents
    pdf.setFontSize(TYPOGRAPHY.body);
    pdf.setFont('Helvetica', 'normal');
    pdf.setTextColor(...COLORS.textPrimary);
    
    const contents = reportType === 'monthly' 
      ? [
          { title: 'Cover Page', page: 1 },
          { title: 'Table of Contents', page: 2 },
          { title: 'Executive Summary', page: 3 },
          { title: 'Key Metrics Dashboard', page: 4 },
          { title: 'Data Visualizations', page: 5 },
          { title: 'Trends & Analysis', page: 6 },
          { title: 'Priority Issues', page: 7 },
          { title: 'Geographic & Category Insights', page: 8 },
          { title: 'Recommendations', page: 9 },
          { title: 'Detailed Report Listing', page: 10 },
        ]
      : [
          { title: 'Cover Page', page: 1 },
          { title: 'Table of Contents', page: 2 },
          { title: 'Executive Summary', page: 3 },
          { title: 'Key Metrics Dashboard', page: 4 },
          { title: 'Data Visualizations', page: 5 },
          { title: 'Trends & Analysis', page: 6 },
          { title: 'Complete Report Listing', page: 7 },
        ];
    
    contents.forEach((item) => {
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(...COLORS.textPrimary);
      pdf.text(item.title, margin + 5, yPos);
      
      // Dotted line
      const dotStart = margin + 60;
      const dotEnd = pageWidth - margin - 15;
      const dotSpacing = 1;
      for (let x = dotStart; x < dotEnd; x += dotSpacing * 2) {
        pdf.circle(x, yPos - 1, 0.2, 'F');
      }
      
      pdf.setFont('Helvetica', 'bold');
      pdf.text(`${item.page}`, pageWidth - margin - 5, yPos, { align: 'right' });
      yPos += 8;
    });
  },

  // Section Title Helper
  addSectionTitle(pdf: jsPDF, title: string, yPos: number, margin: number): void {
    // Left accent bar
    pdf.setFillColor(...COLORS.accent);
    pdf.rect(margin, yPos - 2, 3, 6, 'F');
    
    // Title
    pdf.setFontSize(TYPOGRAPHY.h2);
    pdf.setFont('Helvetica', 'bold');
    pdf.setTextColor(...COLORS.textPrimary);
    pdf.text(title, margin + 6, yPos + 2);
  },

  // Executive Summary
  addExecutiveSummary(
    pdf: jsPDF,
    stats: ReportStats,
    month: number,
    year: number,
    yPos: number,
    margin: number,
    cWidth: number
  ): void {
    this.addSectionTitle(pdf, 'Executive Summary', yPos, margin);
    yPos += 15;
    
    // Overview paragraph
    pdf.setFontSize(TYPOGRAPHY.body);
    pdf.setFont('Helvetica', 'normal');
    pdf.setTextColor(...COLORS.textPrimary);
    
    const total = Math.max(stats.total, 1);
    const resolutionRate = Math.round((stats.resolved / total) * 100);
    const monthName = month > 0 ? this.getMonthName(month) : 'the year';
    
    const overviewText = `During ${monthName} ${year}, the BANTAY SP community reporting system processed ${stats.total} reports with a ${resolutionRate}% resolution rate. This comprehensive analysis provides insights into system performance, community engagement, and operational efficiency.`;
    
    const lines = pdf.splitTextToSize(overviewText, cWidth);
    lines.forEach((line: string) => {
      pdf.text(line, margin, yPos);
      yPos += 5;
    });
    
    yPos += 8;
    
    // Key Metrics Grid
    const metrics = [
      { label: 'Total Reports', value: stats.total, color: COLORS.info },
      { label: 'Resolved', value: stats.resolved, color: COLORS.success },
      { label: 'In Progress', value: stats.inProgress, color: COLORS.info },
      { label: 'Pending', value: stats.pending, color: COLORS.warning },
    ];
    
    const cardWidth = (cWidth - 12) / 4;
    const cardHeight = 20;
    let x = margin;
    
    metrics.forEach((metric) => {
      // Card background
      pdf.setFillColor(...COLORS.background);
      pdf.setDrawColor(...COLORS.border);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, 'FD');
      
      // Top accent
      pdf.setFillColor(...metric.color);
      pdf.rect(x, yPos, cardWidth, 3, 'F');
      
      // Value
      pdf.setFontSize(TYPOGRAPHY.h3);
      pdf.setFont('Helvetica', 'bold');
      pdf.setTextColor(...metric.color);
      pdf.text(String(metric.value), x + cardWidth / 2, yPos + 12, { align: 'center' });
      
      // Label
      pdf.setFontSize(TYPOGRAPHY.small);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text(metric.label, x + cardWidth / 2, yPos + 17, { align: 'center' });
      
      x += cardWidth + 4;
    });
  },

  // Metrics Dashboard
  addMetricsDashboard(
    pdf: jsPDF,
    stats: ReportStats,
    yPos: number,
    margin: number,
    cWidth: number,
    reports: Report[]
  ): void {
    this.addSectionTitle(pdf, 'Key Metrics Dashboard', yPos, margin);
    yPos += 15;
    
    const total = Math.max(stats.total, 1);
    const resolutionRate = Math.round((stats.resolved / total) * 100);
    const uniqueReporters = new Set(reports.map(r => r.user_id)).size;
    const categoriesAffected = Object.keys(stats.byCategory || {}).length;
    
    const metrics = [
      { label: 'Total Reports', value: stats.total.toString(), color: COLORS.chartBlue },
      { label: 'Resolution Rate', value: `${resolutionRate}%`, color: COLORS.chartGreen },
      { label: 'Pending Reports', value: stats.pending.toString(), color: COLORS.chartAmber },
      { label: 'In Progress', value: stats.inProgress.toString(), color: COLORS.chartPurple },
      { label: 'Active Reporters', value: uniqueReporters.toString(), color: COLORS.chartTeal },
      { label: 'Categories', value: categoriesAffected.toString(), color: COLORS.chartIndigo },
    ];
    
    // 3-column grid
    const cardWidth = (cWidth - 8) / 3;
    const cardHeight = 18;
    let x = margin;
    let y = yPos;
    
    metrics.forEach((metric, index) => {
      if (index > 0 && index % 3 === 0) {
        x = margin;
        y += cardHeight + 4;
      }
      
      // Card
      pdf.setFillColor(...COLORS.backgroundCard);
      pdf.setDrawColor(...COLORS.border);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');
      
      // Left accent
      pdf.setFillColor(...metric.color);
      pdf.rect(x, y, 2, cardHeight, 'F');
      
      // Value
      pdf.setFontSize(TYPOGRAPHY.h3);
      pdf.setFont('Helvetica', 'bold');
      pdf.setTextColor(...COLORS.textPrimary);
      pdf.text(metric.value, x + cardWidth / 2, y + 10, { align: 'center' });
      
      // Label
      pdf.setFontSize(TYPOGRAPHY.small);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text(metric.label, x + cardWidth / 2, y + 15, { align: 'center' });
      
      x += cardWidth + 4;
    });
  },

  // Data Visualizations
  addDataVisualizations(
    pdf: jsPDF,
    stats: ReportStats,
    yPos: number,
    margin: number,
    cWidth: number
  ): void {
    this.addSectionTitle(pdf, 'Data Visualizations', yPos, margin);
    yPos += 15;
    
    // Status Distribution
    this.addSectionTitle(pdf, 'Status Distribution', yPos, margin);
    yPos += 10;
    this.addStatusChart(pdf, stats, yPos, margin, cWidth);
    yPos += 40;
    
    // Category Breakdown
    this.addSectionTitle(pdf, 'Reports by Category', yPos, margin);
    yPos += 10;
    this.addCategoryChart(pdf, stats, yPos, margin, cWidth);
  },

  // Status Chart
  addStatusChart(
    pdf: jsPDF,
    stats: ReportStats,
    yPos: number,
    margin: number,
    cWidth: number
  ): void {
    const items = [
      { label: 'Resolved', value: stats.resolved, color: COLORS.success },
      { label: 'In Progress', value: stats.inProgress, color: COLORS.info },
      { label: 'Pending', value: stats.pending, color: COLORS.warning },
      { label: 'Declined', value: stats.declined, color: COLORS.danger },
    ].filter(item => item.value > 0);
    
    const total = Math.max(stats.total, 1);
    const chartHeight = 50;
    
    // Chart container
    pdf.setFillColor(...COLORS.background);
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, yPos, cWidth, chartHeight, 2, 2, 'FD');
    
    // Draw horizontal bars
    const barHeight = 8;
    const spacing = 10;
    let currentY = yPos + 8;
    
    items.forEach((item) => {
      const percentage = (item.value / total) * 100;
      const barWidth = ((cWidth - 80) * item.value) / total;
      
      // Label
      pdf.setFontSize(TYPOGRAPHY.body);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(...COLORS.textPrimary);
      pdf.text(item.label, margin + 5, currentY + 5);
      
      // Value and percentage
      pdf.setFont('Helvetica', 'bold');
      pdf.text(`${item.value}`, margin + 35, currentY + 5);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text(`(${percentage.toFixed(1)}%)`, margin + 45, currentY + 5);
      
      // Bar background
      pdf.setFillColor(230, 230, 235);
      pdf.rect(margin + 60, currentY, cWidth - 65, barHeight, 'F');
      
      // Colored bar
      pdf.setFillColor(...item.color);
      pdf.rect(margin + 60, currentY, barWidth, barHeight, 'F');
      
      currentY += spacing;
    });
  },

  // Category Chart
  addCategoryChart(
    pdf: jsPDF,
    stats: ReportStats,
    yPos: number,
    margin: number,
    cWidth: number
  ): void {
    const categories = Object.entries(stats.byCategory || {})
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 8);
    
    if (categories.length === 0) return;
    
    const total = Math.max(stats.total, 1);
    const chartHeight = Math.min(categories.length * 8 + 10, 60);
    
    // Chart container
    pdf.setFillColor(...COLORS.background);
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, yPos, cWidth, chartHeight, 2, 2, 'FD');
    
    const barHeight = 6;
    const spacing = 8;
    let currentY = yPos + 8;
    const colors = [
      COLORS.chartBlue,
      COLORS.chartGreen,
      COLORS.chartAmber,
      COLORS.chartPurple,
      COLORS.chartTeal,
      COLORS.chartOrange,
      COLORS.chartPink,
      COLORS.chartIndigo,
    ];
    
    categories.forEach((entry, i) => {
      const [category, count] = entry as [string, number];
      const percentage = ((count / total) * 100).toFixed(1);
      const barWidth = ((cWidth - 80) * count) / total;
      const color = colors[i % colors.length];
      
      // Category name
      pdf.setFontSize(TYPOGRAPHY.body);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(...COLORS.textPrimary);
      const categoryName = category.length > 20 ? category.substring(0, 17) + '...' : category;
      pdf.text(this.normalizeValue(categoryName), margin + 5, currentY + 4);
      
      // Count and percentage
      pdf.setFont('Helvetica', 'bold');
      pdf.text(`${count}`, margin + 35, currentY + 4);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text(`(${percentage}%)`, margin + 45, currentY + 4);
      
      // Bar
      pdf.setFillColor(230, 230, 235);
      pdf.rect(margin + 60, currentY, cWidth - 65, barHeight, 'F');
      pdf.setFillColor(...color);
      pdf.rect(margin + 60, currentY, barWidth, barHeight, 'F');
      
      currentY += spacing;
    });
  },

  // Trends Analysis
  addTrendsAnalysis(
    pdf: jsPDF,
    reports: Report[],
    yPos: number,
    margin: number,
    cWidth: number
  ): void {
    this.addSectionTitle(pdf, 'Trends & Analysis', yPos, margin);
    yPos += 15;
    
    // Group reports by time period
    const weekGroups: Record<string, number> = {};
    reports.forEach((r) => {
      const date = new Date(r.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      weekGroups[weekKey] = (weekGroups[weekKey] || 0) + 1;
    });
    
    const data = Object.entries(weekGroups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count }));
    
    if (data.length === 0) {
      pdf.setFontSize(TYPOGRAPHY.body);
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text('No trend data available', margin, yPos);
      return;
    }
    
    // Chart container
    const chartHeight = 50;
    pdf.setFillColor(...COLORS.background);
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, yPos, cWidth, chartHeight, 2, 2, 'FD');
    
    // Draw bar chart
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const barWidth = (cWidth - 40) / data.length;
    const chartAreaHeight = chartHeight - 20;
    const padding = 10;
    
    let x = margin + padding;
    const baseY = yPos + chartHeight - padding;
    
    data.forEach((item) => {
      const barHeight = (item.count / maxCount) * chartAreaHeight;
      
      // Bar
      pdf.setFillColor(...COLORS.chartBlue);
      pdf.rect(x, baseY - barHeight, barWidth - 2, barHeight, 'F');
      
      // Label
      pdf.setFontSize(TYPOGRAPHY.small);
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text(item.label, x + barWidth / 2, baseY + 3, { align: 'center' });
      
      // Value
      pdf.setFontSize(TYPOGRAPHY.tiny);
      pdf.setTextColor(...COLORS.textPrimary);
      pdf.text(String(item.count), x + barWidth / 2, baseY - barHeight - 2, { align: 'center' });
      
      x += barWidth;
    });
  },

  // Priority Issues
  addPriorityIssues(
    pdf: jsPDF,
    reports: Report[],
    yPos: number,
    margin: number,
    cWidth: number,
    pageHeight: number
  ): void {
    this.addSectionTitle(pdf, 'Priority Issues', yPos, margin);
    yPos += 15;
    
    const highPriorityReports = reports
      .filter(r => {
        const isHighPriority = r.priority === 'high';
        if (!isHighPriority) return false;
        const created = new Date(r.created_at);
        const daysPending = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
        return daysPending > 14 || r.status === 'pending' || r.status === 'in_progress';
      })
      .slice(0, 10);
    
    if (highPriorityReports.length === 0) {
      pdf.setFontSize(TYPOGRAPHY.body);
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text('No high-priority issues pending >14 days', margin, yPos);
      return;
    }
    
    pdf.setFontSize(TYPOGRAPHY.body);
    
    highPriorityReports.forEach((report) => {
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        const pw = pdf.internal.pageSize.getWidth();
        const currentPage = pdf.getCurrentPageInfo().pageNumber;
        const month = undefined;
        const year = undefined;
        this.addPageHeader(pdf, pw, month, year, currentPage);
        yPos = 30;
      }
      
      const created = new Date(report.created_at);
      const daysPending = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
      
      // Report card
      pdf.setFillColor(...COLORS.background);
      pdf.setDrawColor(...COLORS.border);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, yPos, cWidth, 12, 2, 2, 'FD');
      
      // Left accent
      pdf.setFillColor(...COLORS.danger);
      pdf.rect(margin, yPos, 2, 12, 'F');
      
      // Report ID and title
      pdf.setFont('Helvetica', 'bold');
      pdf.setTextColor(...COLORS.textPrimary);
      const reportId = report.case_number || `#${report.id.slice(0, 8)}`;
      pdf.text(`${reportId}: ${report.title}`, margin + 5, yPos + 5);
      
      // Status and days
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text(`Status: ${this.normalizeValue(report.status)} | Days Pending: ${daysPending}`, margin + 5, yPos + 10);
      
      yPos += 15;
    });
  },

  // Insights
  addInsights(
    pdf: jsPDF,
    reports: Report[],
    stats: ReportStats,
    yPos: number,
    margin: number,
    cWidth: number
  ): void {
    // Geographic Hotspots
    this.addSectionTitle(pdf, 'Geographic Hotspots', yPos, margin);
    yPos += 15;
    
    const locationCounts: Record<string, number> = {};
    reports.forEach((report) => {
      if (report.location_address) {
        const area = report.location_address.split(',')[0].trim();
        locationCounts[area] = (locationCounts[area] || 0) + 1;
      }
    });
    
    const hotspots = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    if (hotspots.length > 0) {
      pdf.setFontSize(TYPOGRAPHY.body);
      hotspots.forEach(([area, count], index) => {
        pdf.setFont('Helvetica', 'bold');
        pdf.setTextColor(...COLORS.textPrimary);
        pdf.text(`${index + 1}. ${area}`, margin, yPos);
        pdf.setFont('Helvetica', 'normal');
        pdf.setTextColor(...COLORS.textSecondary);
        pdf.text(`${count} reports`, margin + 50, yPos);
        yPos += 6;
      });
    }
    
    yPos += 10;
    
    // Category Insights
    this.addSectionTitle(pdf, 'Category Insights', yPos, margin);
    yPos += 15;
    
    const categories = Object.entries(stats.byCategory || {})
      .map(([category, count]) => ({ category: this.normalizeValue(category), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    if (categories.length > 0) {
      const total = Math.max(stats.total, 1);
      pdf.setFontSize(TYPOGRAPHY.body);
      categories.forEach((item, index) => {
        const percentage = ((item.count / total) * 100).toFixed(1);
        pdf.setFont('Helvetica', 'bold');
        pdf.setTextColor(...COLORS.textPrimary);
        pdf.text(`${index + 1}. ${item.category}`, margin, yPos);
        pdf.setFont('Helvetica', 'normal');
        pdf.setTextColor(...COLORS.textSecondary);
        pdf.text(`${item.count} reports (${percentage}%)`, margin + 50, yPos);
        yPos += 6;
      });
    }
  },

  // Recommendations
  addRecommendations(
    pdf: jsPDF,
    stats: ReportStats,
    reports: Report[],
    yPos: number,
    margin: number,
    cWidth: number
  ): void {
    this.addSectionTitle(pdf, 'Recommendations', yPos, margin);
    yPos += 15;
    
    const total = Math.max(stats.total, 1);
    const resolutionRate = Math.round((stats.resolved / total) * 100);
    const pendingRate = Math.round((stats.pending / total) * 100);
    const highPriorityCount = stats.highPriority || 0;
    
    const recommendations: string[] = [];
    
    if (pendingRate > 30) {
      recommendations.push(`Address ${stats.pending} pending reports (${pendingRate}% of total) to improve response time`);
    }
    
    if (highPriorityCount > 0) {
      recommendations.push(`Prioritize ${highPriorityCount} high-priority cases requiring immediate attention`);
    }
    
    if (resolutionRate < 70) {
      recommendations.push(`Focus on improving resolution rate (currently ${resolutionRate}%) through better resource allocation`);
    }
    
    const topCategory = Object.entries(stats.byCategory || {})
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topCategory) {
      recommendations.push(`Allocate additional resources to "${this.normalizeValue(topCategory[0])}" category (${topCategory[1]} reports)`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Continue maintaining current performance levels');
    }
    
    pdf.setFontSize(TYPOGRAPHY.body);
    pdf.setFont('Helvetica', 'normal');
    pdf.setTextColor(...COLORS.textPrimary);
    
    recommendations.forEach((rec) => {
      // Bullet point
      pdf.setFillColor(...COLORS.accent);
      pdf.circle(margin + 2, yPos - 1, 1, 'F');
      
      const lines = pdf.splitTextToSize(rec, cWidth - 8);
      pdf.text(lines[0], margin + 6, yPos);
      if (lines.length > 1) {
        pdf.text(lines[1], margin + 6, yPos + 5);
        yPos += 5;
      }
      yPos += 8;
    });
  },

  // Modern Detail Table
  addModernDetailTable(
    pdf: jsPDF,
    reports: Report[],
    yPos: number,
    margin: number,
    cWidth: number,
    pageHeight: number,
    month?: number,
    year?: number
  ): void {
    // Group and sort reports
    const groupedReports = this.groupAndSortReports(reports);
    
    const cols = [
      { header: 'ID', key: 'case_number', width: 12 }, // Compact - only needs to fit "#000001"
      { header: 'Description', key: 'title', width: 64 }, // Increased significantly - most important field, reduces wrapping
      { header: 'Status', key: 'status', width: 18 }, // Adequate for status text
      { header: 'Priority', key: 'priority', width: 20 }, // Adequate for priority text
      { header: 'Location', key: 'location_address', width: 41 }, // Increased significantly - reduces wrapping
      { header: 'Date', key: 'created_at', width: 25 }, // Adequate - fits "Nov 14, 2025" on one line
    ];
    // Total width: 180mm (fits A4 page with 15mm margins)
    
    const headerHeight = 10;
    const rowHeight = 10;
    const categoryHeaderHeight = 8;
    const categorySpacing = 5;
    let y = yPos;
    
    const drawHeader = () => {
      // Draw complete header background first
      pdf.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      pdf.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, y, cWidth, headerHeight, 'FD');
      
      // Set font properties for header
      pdf.setFontSize(TYPOGRAPHY.body);
      pdf.setFont('Helvetica', 'bold');
      
      let x = margin;
      const textY = y + 6; // Centered vertically in header
      
      cols.forEach((col, index) => {
        // CRITICAL: Set white text color INSIDE the loop, right before drawing each text
        // This ensures the color is definitely white for each column header
        pdf.setTextColor(255, 255, 255);
        
        // Calculate center position for this column
        const centerX = x + col.width / 2;
        
        // Draw text centered - use align: 'center' with the center position
        pdf.text(col.header, centerX, textY, { 
          align: 'center'
        });
        
        // Draw column divider lines (subtle gray)
        if (index > 0) {
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.2);
          pdf.line(x, y, x, y + headerHeight);
        }
        
        x += col.width;
      });
      
      y += headerHeight + 2; // Add spacing after header
    };
    
    const drawCategoryHeader = (category: string) => {
      // Add spacing before category header
      y += 2;
      
      // Category header background
      pdf.setFillColor(...COLORS.background);
      pdf.setDrawColor(...COLORS.border);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, y, cWidth, categoryHeaderHeight, 'FD');
      
      // Category label
      pdf.setFontSize(TYPOGRAPHY.body);
      pdf.setFont('Helvetica', 'bold');
      pdf.setTextColor(...COLORS.textPrimary);
      pdf.text(category, margin + 5, y + 5.5);
      
      // Count badge
      const count = groupedReports[category]?.length || 0;
      pdf.setFontSize(TYPOGRAPHY.small);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text(`(${count} reports)`, margin + 50, y + 5.5);
      
      y += categoryHeaderHeight;
    };
    
    drawHeader();
    
    pdf.setTextColor(...COLORS.textPrimary);
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(TYPOGRAPHY.small);
    
    let globalIdx = 0;
    
    // Iterate through grouped categories
    Object.keys(groupedReports).forEach((category) => {
      const categoryReports = groupedReports[category];
      if (categoryReports.length === 0) return;
      
      // Check if we need a new page before category header
      if (y > pageHeight - 50) {
        const currentPage = pdf.getCurrentPageInfo().pageNumber;
        pdf.addPage();
        const pw = pdf.internal.pageSize.getWidth();
        if (year !== undefined) {
          const monthValue = (month !== undefined && month > 0) ? month : 0;
          this.addPageHeader(pdf, pw, monthValue, year, currentPage + 1);
        }
        y = 30;
        drawHeader();
      }
      
      // Draw category header
      drawCategoryHeader(category);
      
      // Draw reports in this category
      categoryReports.forEach((r) => {
        if (y > pageHeight - 30) {
          const currentPage = pdf.getCurrentPageInfo().pageNumber;
          pdf.addPage();
          const pw = pdf.internal.pageSize.getWidth();
          if (year !== undefined) {
            const monthValue = (month !== undefined && month > 0) ? month : 0;
            this.addPageHeader(pdf, pw, monthValue, year, currentPage + 1);
          }
          y = 30;
          drawHeader();
          drawCategoryHeader(category);
        }
        
        // Check if report is overdue (>14 days)
        const created = new Date(r.created_at);
        const daysOld = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysOld > 14 && (r.status === 'pending' || r.status === 'in_progress');
        
        // Row background - red tint for overdue, zebra striping otherwise
        if (isOverdue) {
          pdf.setFillColor(254, 242, 242); // Light red background
          pdf.rect(margin, y, cWidth, rowHeight, 'F');
        } else if (globalIdx % 2 === 0) {
          pdf.setFillColor(...COLORS.background);
          pdf.rect(margin, y, cWidth, rowHeight, 'F');
        }
        
        let x = margin;
        const cellPadding = 6; // Increased horizontal padding for better spacing
        const textY = y + 6; // Centered vertically in row
        
        cols.forEach((col) => {
          let val: string = '';
          let textColor = COLORS.textPrimary;
          let isBold = false;
          
          if (col.key === 'case_number') {
            val = r.case_number || r.id.slice(0, 8);
            if (!val.startsWith('#')) val = `#${val}`;
            isBold = true;
          } else if (col.key === 'created_at') {
            const date = new Date(r.created_at);
            val = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          } else if (col.key === 'status') {
            val = this.normalizeValue(r.status);
            const statusLower = r.status.toLowerCase();
            if (statusLower === 'resolved') textColor = COLORS.success;
            else if (statusLower === 'pending') textColor = COLORS.warning;
            else if (statusLower === 'in_progress') textColor = COLORS.info;
            else if (statusLower === 'declined') textColor = COLORS.danger;
          } else if (col.key === 'priority') {
            val = this.normalizeValue(r.priority || 'medium');
            const priorityLower = (r.priority || 'medium').toLowerCase();
            if (priorityLower === 'high') {
              textColor = COLORS.danger;
              isBold = true;
            } else if (priorityLower === 'medium') {
              textColor = COLORS.warning;
            } else {
              textColor = COLORS.success;
            }
          } else if (col.key === 'location_address') {
            val = r.location_address || 'N/A';
            if (val === 'N/A') {
              textColor = COLORS.textTertiary;
            }
          } else if (col.key === 'title') {
            val = r.title || '';
            // Replace placeholder descriptions
            if (val.toLowerCase().match(/^(asd|test|placeholder|xxx|123|abc).*$/i)) {
              val = '[Description needs correction]';
              textColor = COLORS.textTertiary;
              isBold = true;
            }
          }
          
          // Truncate with better limits based on new column widths and padding
          // Account for increased padding (6mm each side = 12mm total) and column widths
          const maxLen = col.key === 'title' ? 60 : // 64mm width - 12mm padding = ~60 chars
                        col.key === 'location_address' ? 36 : // 41mm width - 12mm padding = ~36 chars
                        col.key === 'status' ? 14 : // 18mm width - 12mm padding = ~14 chars
                        col.key === 'priority' ? 12 : // 20mm width - 12mm padding = ~12 chars
                        col.key === 'case_number' ? 8 : // 12mm width - 12mm padding = ~8 chars
                        15; // Default
          if (val.length > maxLen) {
            val = val.substring(0, maxLen - 3) + '...';
          }
          
          // Overdue reports - make text red
          if (isOverdue && col.key !== 'priority' && col.key !== 'status') {
            textColor = COLORS.danger;
            isBold = true;
          }
          
          pdf.setFont('Helvetica', isBold ? 'bold' : 'normal');
          pdf.setTextColor(...textColor);
          pdf.text(val, x + cellPadding, textY, { maxWidth: col.width - cellPadding * 2 });
          
          // Priority indicator dot
          if (col.key === 'priority') {
            const priorityLower = (r.priority || 'medium').toLowerCase();
            let indicatorColor = COLORS.success;
            if (priorityLower === 'high') indicatorColor = COLORS.danger;
            else if (priorityLower === 'medium') indicatorColor = COLORS.warning;
            
            pdf.setFillColor(...indicatorColor);
            pdf.circle(x + cellPadding - 2.5, y + 5, 1.5, 'F');
          }
          
          // Column divider
          pdf.setDrawColor(...COLORS.border);
          pdf.setLineWidth(0.2);
          pdf.line(x + col.width, y, x + col.width, y + rowHeight);
          
          x += col.width;
        });
        
        // Row border
        pdf.setDrawColor(...COLORS.border);
        pdf.setLineWidth(0.2);
        pdf.line(margin, y + rowHeight, margin + cWidth, y + rowHeight);
        
        y += rowHeight;
        globalIdx++;
      });
      
      // Add spacing between categories
      y += categorySpacing;
    });
  },

  // Group and sort reports by category, priority, and status
  groupAndSortReports(reports: Report[]): Record<string, Report[]> {
    // Priority order: High = 3, Medium = 2, Low = 1
    const priorityOrder = (priority: string | undefined): number => {
      const p = (priority || 'medium').toLowerCase();
      if (p === 'high') return 3;
      if (p === 'medium') return 2;
      return 1;
    };
    
    // Status order: Pending = 1, Verifying = 2, In Progress = 3, Resolved = 4
    const statusOrder = (status: string): number => {
      const s = status.toLowerCase();
      if (s === 'pending') return 1;
      if (s === 'verifying' || s === 'awaiting_verification') return 2;
      if (s === 'in_progress') return 3;
      if (s === 'resolved') return 4;
      return 5; // Other statuses
    };
    
    // Group by category
    const grouped: Record<string, Report[]> = {};
    reports.forEach((report) => {
      const category = this.normalizeValue(report.category || 'Other');
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(report);
    });
    
    // Sort each group: first by priority (High → Medium → Low), then by status
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => {
        // First sort by priority (descending)
        const priorityDiff = priorityOrder(b.priority) - priorityOrder(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then sort by status (ascending: Pending → Verifying → In Progress → Resolved)
        return statusOrder(a.status) - statusOrder(b.status);
      });
    });
    
    // Sort categories in a preferred order
    const categoryOrder = ['Infrastructure', 'Environmental', 'Safety', 'Public Services', 'Other'];
    const sortedCategories: Record<string, Report[]> = {};
    
    // Add categories in preferred order
    categoryOrder.forEach((cat) => {
      if (grouped[cat]) {
        sortedCategories[cat] = grouped[cat];
      }
    });
    
    // Add remaining categories
    Object.keys(grouped).forEach((cat) => {
      if (!sortedCategories[cat]) {
        sortedCategories[cat] = grouped[cat];
      }
    });
    
    return sortedCategories;
  },

  // Modern Footer
  addModernFooter(pdf: jsPDF, month: number, year: number): void {
    const pCount = pdf.getNumberOfPages();
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const footerHeight = 10;
    
    for (let i = 1; i <= pCount; i++) {
      pdf.setPage(i);
      
      // Top border
      pdf.setDrawColor(...COLORS.border);
      pdf.setLineWidth(0.3);
      pdf.line(margin, ph - footerHeight, pw - margin, ph - footerHeight);
      
      pdf.setFontSize(TYPOGRAPHY.tiny);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(...COLORS.textTertiary);
      
      // Left: Organization
      pdf.text('BANTAY SP Community Reporting System', margin, ph - 6);
      const reportName = month ? `${this.getMonthName(month)} ${year}` : `${year} Annual Report`;
      pdf.setFontSize(5);
      pdf.text(reportName, margin, ph - 3);
      
      // Center: Page numbers
      pdf.setFontSize(TYPOGRAPHY.tiny);
      pdf.setFont('Helvetica', 'bold');
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text(`Page ${i} of ${pCount}`, pw / 2, ph - 4.5, { align: 'center' });
      
      // Right: Generation date
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(...COLORS.textTertiary);
      const genDate = new Date();
      const dateStr = genDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const timeStr = genDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      pdf.text(`Generated: ${dateStr} ${timeStr}`, pw - margin, ph - 6, { align: 'right' });
      pdf.text('Confidential - For Internal Use Only', pw - margin, ph - 3, { align: 'right' });
    }
  },

  // Utility Functions
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

  normalizeValue(val: string): string {
    if (!val) return '';
    val = val.replace(/_/g, ' ').trim();
    if (val.toLowerCase().includes('pending')) return 'Pending';
    if (val.toLowerCase().includes('progress')) return 'In Progress';
    if (val.toLowerCase().includes('resolved')) return 'Resolved';
    if (val.toLowerCase().includes('declined')) return 'Declined';
    if (val.toLowerCase() === 'high') return 'High';
    if (val.toLowerCase() === 'medium') return 'Medium';
    if (val.toLowerCase() === 'low') return 'Low';
    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  },

  getMonthName(m: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return months[m - 1] || 'Unknown';
  },
};
